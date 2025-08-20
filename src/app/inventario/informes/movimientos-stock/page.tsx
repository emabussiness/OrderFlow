
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import type { DateRange } from "react-day-picker";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";

// --- Types ---
type Producto = { id: string; nombre: string; };
type Deposito = { id: string; nombre: string; };
type Compra = { id: string; fecha_compra: string; numero_factura: string; deposito_id: string; items: { producto_id: string, cantidad_recibida: number }[] };
type Ajuste = { id: string; fecha_ajuste: string; tipo_ajuste: 'Entrada' | 'Salida'; motivo: string; producto_id: string; deposito_id: string; cantidad: number; };
type NotaCredito = { id: string; fecha_emision: string; numero_nota_credito: string; compra_id: string, items: { producto_id: string, cantidad_ajustada: number }[] };

type Movimiento = {
  fecha: Date;
  tipo: "Compra" | "Ajuste Entrada" | "Ajuste Salida" | "Devolución a Proveedor";
  cantidad: number;
  documentoRef: string;
  saldo: number;
  key: string;
};

// --- Main Component ---
export default function MovimientosStockPage() {
  const { toast } = useToast();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  
  // Filters
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedDepositoId, setSelectedDepositoId] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -29),
    to: new Date(),
  });

  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  
  // Data Fetching for filters
  useEffect(() => {
    const fetchFiltersData = async () => {
      setLoading(true);
      try {
        const [productosSnap, depositosSnap] = await Promise.all([
          getDocs(query(collection(db, 'productos'), orderBy("nombre"))),
          getDocs(query(collection(db, 'depositos'), orderBy("nombre")))
        ]);
        setProductos(productosSnap.docs.map(doc => ({ id: doc.id, nombre: doc.data().nombre } as Producto)));
        setDepositos(depositosSnap.docs.map(doc => ({ id: doc.id, nombre: doc.data().nombre } as Deposito)));
      } catch (error) {
        console.error("Error fetching filters data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los filtros.' });
      } finally {
        setLoading(false);
      }
    };
    fetchFiltersData();
  }, [toast]);
  

  const handleGenerateReport = async () => {
      if (!selectedProductId || !selectedDepositoId || !dateRange?.from) {
          toast({ variant: 'destructive', title: 'Faltan Filtros', description: 'Por favor, seleccione un producto, un depósito y un rango de fechas.' });
          return;
      }
      setGeneratingReport(true);
      setMovimientos([]);

      try {
          const from = dateRange.from;
          const to = dateRange.to ?? from;
          let allMovements: Omit<Movimiento, 'saldo'>[] = [];

          // 1. Compras (Entradas)
          const comprasQuery = query(collection(db, 'compras'), where('fecha_compra', '>=', format(from, "yyyy-MM-dd")), where('fecha_compra', '<=', format(to, "yyyy-MM-dd")));
          const comprasSnap = await getDocs(comprasQuery);
          comprasSnap.forEach(doc => {
              const compra = doc.data() as Compra;
              if (compra.deposito_id === selectedDepositoId) {
                const item = compra.items.find(i => i.producto_id === selectedProductId);
                if (item && item.cantidad_recibida > 0) {
                    allMovements.push({
                        fecha: new Date(compra.fecha_compra + "T00:00:00"),
                        tipo: "Compra",
                        cantidad: item.cantidad_recibida,
                        documentoRef: `Factura ${compra.numero_factura}`,
                        key: `compra-${doc.id}`
                    });
                }
              }
          });

          // 2. Ajustes (Entradas y Salidas)
          const ajustesQuery = query(collection(db, 'ajustes_stock'), where('deposito_id', '==', selectedDepositoId), where('producto_id', '==', selectedProductId));
          const ajustesSnap = await getDocs(ajustesQuery);
          ajustesSnap.forEach(doc => {
              const ajuste = doc.data() as Ajuste;
              const fechaAjuste = new Date(ajuste.fecha_ajuste + "T00:00:00");
              if (fechaAjuste >= from && fechaAjuste <= to) {
                allMovements.push({
                    fecha: fechaAjuste,
                    tipo: ajuste.tipo_ajuste === 'Entrada' ? 'Ajuste Entrada' : 'Ajuste Salida',
                    cantidad: ajuste.tipo_ajuste === 'Entrada' ? ajuste.cantidad : -ajuste.cantidad,
                    documentoRef: `Ajuste: ${ajuste.motivo}`,
                    key: `ajuste-${doc.id}`
                });
              }
          });
          
           // 3. Notas de Crédito a Proveedores (Devoluciones, Salidas)
          const notasCreditoQuery = query(collection(db, 'notas_credito_debito_compras'), where('fecha_emision', '>=', format(from, "yyyy-MM-dd")), where('fecha_emision', '<=', format(to, "yyyy-MM-dd")));
          const notasCreditoSnap = await getDocs(notasCreditoQuery);
          
          const compraIds = notasCreditoSnap.docs.map(doc => doc.data().compra_id);
          
          if (compraIds.length > 0) {
              const comprasAfectadasQuery = query(collection(db, 'compras'), where('__name__', 'in', compraIds));
              const comprasAfectadasSnap = await getDocs(comprasAfectadasQuery);
              const comprasAfectadasMap = new Map(comprasAfectadasSnap.docs.map(doc => [doc.id, doc.data() as Compra]));

              for (const notaDoc of notasCreditoSnap.docs) {
                  const nota = notaDoc.data() as NotaCredito;
                  const compraAfectada = comprasAfectadasMap.get(nota.compra_id);
                  if (compraAfectada && compraAfectada.deposito_id === selectedDepositoId) {
                      const item = nota.items.find(i => i.producto_id === selectedProductId);
                      if (item && item.cantidad_ajustada > 0) {
                          allMovements.push({
                              fecha: new Date(nota.fecha_emision + "T00:00:00"),
                              tipo: 'Devolución a Proveedor',
                              cantidad: -item.cantidad_ajustada,
                              documentoRef: `NC ${nota.numero_nota_credito}`,
                              key: `nc-${notaDoc.id}`
                          });
                      }
                  }
              }
          }


          // Sort and calculate running balance
          allMovements.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
          
          let runningBalance = 0;
          const processedMovements = allMovements.map(mov => {
              runningBalance += mov.cantidad;
              return { ...mov, saldo: runningBalance };
          });

          setMovimientos(processedMovements);

      } catch (error) {
          console.error("Error generating report:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar el informe.' });
      } finally {
          setGeneratingReport(false);
      }
  };

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Filtros del Informe de Movimientos</CardTitle>
                <CardDescription>Seleccione los parámetros para generar la trazabilidad de un producto.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-4 items-end">
                <div className="space-y-2 flex-1">
                    <Label htmlFor="producto">Producto</Label>
                    <Combobox options={productos.map(p => ({ value: p.id, label: p.nombre }))} value={selectedProductId} onChange={setSelectedProductId} placeholder="Seleccione un producto" />
                </div>
                <div className="space-y-2 flex-1">
                    <Label htmlFor="deposito">Depósito</Label>
                    <Combobox options={depositos.map(d => ({ value: d.id, label: d.nombre }))} value={selectedDepositoId} onChange={setSelectedDepositoId} placeholder="Seleccione un depósito" />
                </div>
                <div className="space-y-2 flex-1">
                    <Label>Rango de Fechas</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })}</>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Seleccione un rango</span>)}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar initialFocus mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es}/>
                        </PopoverContent>
                    </Popover>
                </div>
                <Button onClick={handleGenerateReport} disabled={generatingReport}>
                    {generatingReport ? 'Generando...' : 'Generar Informe'}
                </Button>
            </CardContent>
        </Card>
        
        <Card>
             <CardHeader>
                <CardTitle>Historial de Movimientos</CardTitle>
                <CardDescription>Detalle cronológico de todas las transacciones para el producto y depósito seleccionados.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Tipo de Movimiento</TableHead>
                            <TableHead>Documento Ref.</TableHead>
                            <TableHead className="text-right">Entrada</TableHead>
                            <TableHead className="text-right">Salida</TableHead>
                            <TableHead className="text-right">Saldo</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {movimientos.map((mov) => (
                            <TableRow key={mov.key}>
                                <TableCell>{format(mov.fecha, "yyyy-MM-dd")}</TableCell>
                                <TableCell>
                                    <Badge variant={mov.cantidad > 0 ? "default" : "destructive"}>
                                        {mov.tipo}
                                    </Badge>
                                </TableCell>
                                <TableCell>{mov.documentoRef}</TableCell>
                                <TableCell className="text-right text-green-500 font-medium">{mov.cantidad > 0 ? mov.cantidad : '-'}</TableCell>
                                <TableCell className="text-right text-red-500 font-medium">{mov.cantidad < 0 ? Math.abs(mov.cantidad) : '-'}</TableCell>
                                <TableCell className="text-right font-bold">{mov.saldo}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
                 {!generatingReport && movimientos.length === 0 && (
                     <div className="h-48 flex items-center justify-center text-muted-foreground">
                        <p>No se encontraron movimientos para los filtros aplicados o aún no ha generado el informe.</p>
                    </div>
                 )}
                 {generatingReport && <p className="text-center py-10">Cargando datos del informe...</p>}
            </CardContent>
        </Card>
    </div>
  );
}
