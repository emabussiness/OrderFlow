
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type CompraItem = {
    producto_id: string;
    nombre: string;
    cantidad_recibida: number;
    precio_unitario: number;
};

type Compra = {
  id: string;
  fecha_compra: string; // "yyyy-MM-dd"
  items: CompraItem[];
};

type ReportData = {
  producto_id: string;
  nombre: string;
  cantidadTotal: number;
  montoTotal: number;
};

const currencyFormatter = new Intl.NumberFormat('es-PY', {
  style: 'currency',
  currency: 'PYG',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export default function RankingProductosPage() {
  const { toast } = useToast();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [sortBy, setSortBy] = useState<"cantidad" | "monto">("monto");

  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -29),
    to: new Date(),
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const qCompras = query(collection(db, 'compras'), orderBy("fecha_compra", "desc"));
        const snapshotCompras = await getDocs(qCompras);
        const dataList = snapshotCompras.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            fecha_compra: data.fecha_compra,
            items: data.items,
          } as Compra;
        });
        setCompras(dataList);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos de compras.' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const processedData = useMemo(() => {
    if (!compras.length || !date || !date.from) return [];

    const filteredCompras = compras.filter(compra => {
      const fechaCompra = new Date(compra.fecha_compra + "T00:00:00"); 
      const from = date.from!;
      const to = date.to ?? from;
      return fechaCompra >= from && fechaCompra <= to;
    });

    const dataByProduct = filteredCompras.reduce((acc, compra) => {
        compra.items.forEach(item => {
            if(!acc[item.producto_id]) {
                acc[item.producto_id] = {
                    producto_id: item.producto_id,
                    nombre: item.nombre,
                    cantidadTotal: 0,
                    montoTotal: 0,
                };
            }
            acc[item.producto_id].cantidadTotal += item.cantidad_recibida;
            acc[item.producto_id].montoTotal += item.cantidad_recibida * item.precio_unitario;
        });
        return acc;
    }, {} as Record<string, ReportData>);

    return Object.values(dataByProduct);

  }, [compras, date]);


  useEffect(() => {
    let sortedData = [...processedData];
    if (sortBy === 'monto') {
        sortedData.sort((a, b) => b.montoTotal - a.montoTotal);
    } else {
        sortedData.sort((a, b) => b.cantidadTotal - a.cantidadTotal);
    }
    setReportData(sortedData);
  }, [processedData, sortBy]);


  if (loading) return <p>Generando informes...</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtros del Informe</CardTitle>
          <CardDescription>Ajuste los parámetros para generar el ranking de productos.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-6">
            <div className="space-y-2">
                <Label>Rango de Fechas</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "w-full md:w-[300px] justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date?.from ? (
                        date.to ? (
                          <>
                            {format(date.from, "LLL dd, y", { locale: es })} -{" "}
                            {format(date.to, "LLL dd, y", { locale: es })}
                          </>
                        ) : (
                          format(date.from, "LLL dd, y", { locale: es })
                        )
                      ) : (
                        <span>Seleccione un rango</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      selected={date}
                      onSelect={setDate}
                      numberOfMonths={2}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
            </div>
            <div className="space-y-2">
                <Label>Ordenar Por</Label>
                 <RadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as any)} className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="monto" id="r-monto" />
                        <Label htmlFor="r-monto">Monto Total</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cantidad" id="r-cantidad" />
                        <Label htmlFor="r-cantidad">Cantidad Comprada</Label>
                    </div>
                </RadioGroup>
            </div>
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
            <CardTitle>Ranking de Productos Comprados</CardTitle>
            <CardDescription>
              Lista de productos ordenados por el total invertido o la cantidad comprada en el período seleccionado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reportData.length > 0 ? (
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Ranking</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead className="text-right">Cantidad Total</TableHead>
                            <TableHead className="text-right">Monto Total</TableHead>
                            <TableHead className="text-right">Costo Promedio</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reportData.map((item, index) => (
                            <TableRow key={item.producto_id}>
                                <TableCell className="font-bold text-lg">#{index + 1}</TableCell>
                                <TableCell>{item.nombre}</TableCell>
                                <TableCell className="text-right">{item.cantidadTotal}</TableCell>
                                <TableCell className="text-right">{currencyFormatter.format(item.montoTotal)}</TableCell>
                                <TableCell className="text-right">{currencyFormatter.format(item.montoTotal / item.cantidadTotal)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
            ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                    <p>No hay datos de compras de productos para el período seleccionado.</p>
                </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
