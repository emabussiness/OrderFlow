
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { differenceInDays, format } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";


// Types
type CuentaPagar = {
  id: string;
  proveedor_nombre: string;
  numero_factura: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  monto_total: number;
  saldo_pendiente: number;
};

type AgingReportData = {
  totalDeuda: number;
  corriente: number;
  vencido1_30: number;
  vencido31_60: number;
  vencido61_90: number;
  vencidoMas90: number;
  detalles: (CuentaPagar & { diasVencido: number, rango: string })[];
};

// Formatters
const currencyFormatter = new Intl.NumberFormat('es-PY', {
  style: 'currency',
  currency: 'PYG',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const getRangoBadgeVariant = (rango: string): "default" | "secondary" | "destructive" | "outline" => {
    if (rango === "Corriente") return "default";
    if (rango === "1-30 días") return "secondary";
    if (rango === "31-60 días") return "outline";
    return "destructive";
}

export default function AntiguedadSaldosPage() {
  const { toast } = useToast();
  const [cuentas, setCuentas] = useState<CuentaPagar[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [proveedorFilter, setProveedorFilter] = useState("");
  const [facturaFilter, setFacturaFilter] = useState("");
  const [vencimientoFilter, setVencimientoFilter] = useState<DateRange | undefined>();

  // Data Fetching
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'cuentas_a_pagar'), where("saldo_pendiente", ">", 0));
        const snapshot = await getDocs(q);
        setCuentas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CuentaPagar)));
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las cuentas por pagar.' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  // Data Processing
  const reportData: AgingReportData = useMemo(() => {
    const hoy = new Date();
    
    const filteredCuentas = cuentas.filter(cuenta => {
      const matchProveedor = proveedorFilter === '' || cuenta.proveedor_nombre.toLowerCase().includes(proveedorFilter.toLowerCase());
      const matchFactura = facturaFilter === '' || cuenta.numero_factura.toLowerCase().includes(facturaFilter.toLowerCase());
      
      let matchVencimiento = true;
      if (vencimientoFilter?.from) {
        const fechaVencimiento = new Date(cuenta.fecha_vencimiento + "T00:00:00");
        const from = vencimientoFilter.from;
        const to = vencimientoFilter.to ?? from;
        matchVencimiento = fechaVencimiento >= from && fechaVencimiento <= to;
      }
      
      return matchProveedor && matchFactura && matchVencimiento;
    });

    const data: AgingReportData = {
        totalDeuda: 0,
        corriente: 0,
        vencido1_30: 0,
        vencido31_60: 0,
        vencido61_90: 0,
        vencidoMas90: 0,
        detalles: [],
    };

    if (!filteredCuentas.length) return data;

    filteredCuentas.forEach(cuenta => {
        const fechaVencimiento = new Date(cuenta.fecha_vencimiento + "T00:00:00");
        const diasVencido = differenceInDays(hoy, fechaVencimiento);
        
        data.totalDeuda += cuenta.saldo_pendiente;

        let rango = "";
        if (diasVencido <= 0) {
            data.corriente += cuenta.saldo_pendiente;
            rango = "Corriente";
        } else if (diasVencido <= 30) {
            data.vencido1_30 += cuenta.saldo_pendiente;
            rango = "1-30 días";
        } else if (diasVencido <= 60) {
            data.vencido31_60 += cuenta.saldo_pendiente;
            rango = "31-60 días";
        } else if (diasVencido <= 90) {
            data.vencido61_90 += cuenta.saldo_pendiente;
            rango = "61-90 días";
        } else {
            data.vencidoMas90 += cuenta.saldo_pendiente;
            rango = "+90 días";
        }

        data.detalles.push({ ...cuenta, diasVencido, rango });
    });
    
    data.detalles.sort((a, b) => b.diasVencido - a.diasVencido);

    return data;
  }, [cuentas, proveedorFilter, facturaFilter, vencimientoFilter]);

  if (loading) return <p>Generando informe...</p>;

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Filtros del Informe</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-4">
                <div className="space-y-2 flex-1">
                    <Label htmlFor="proveedor">Proveedor</Label>
                    <Input id="proveedor" placeholder="Nombre del proveedor..." value={proveedorFilter} onChange={e => setProveedorFilter(e.target.value)} />
                </div>
                 <div className="space-y-2 flex-1">
                    <Label htmlFor="factura">Número de Factura</Label>
                    <Input id="factura" placeholder="Nro de factura..." value={facturaFilter} onChange={e => setFacturaFilter(e.target.value)} />
                </div>
                 <div className="space-y-2 flex-1">
                    <Label>Rango de Vencimiento</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !vencimientoFilter && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {vencimientoFilter?.from ? (vencimientoFilter.to ? (<>{format(vencimientoFilter.from, "LLL dd, y", { locale: es })} - {format(vencimientoFilter.to, "LLL dd, y", { locale: es })}</>) : (format(vencimientoFilter.from, "LLL dd, y", { locale: es }))) : (<span>Seleccione un rango</span>)}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar initialFocus mode="range" selected={vencimientoFilter} onSelect={setVencimientoFilter} numberOfMonths={2} locale={es}/>
                        </PopoverContent>
                    </Popover>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Resumen de Antigüedad de Saldos</CardTitle>
                <CardDescription>Clasificación de la deuda total con proveedores según el tiempo de vencimiento.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
                    <Card>
                        <CardHeader className="p-4"><CardTitle className="text-sm font-medium text-muted-foreground">Corriente</CardTitle></CardHeader>
                        <CardContent className="p-4 pt-0"><p className="font-bold text-base">{currencyFormatter.format(reportData.corriente)}</p></CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="p-4"><CardTitle className="text-sm font-medium text-muted-foreground">Vencido 1-30 Días</CardTitle></CardHeader>
                        <CardContent className="p-4 pt-0"><p className="font-bold text-base">{currencyFormatter.format(reportData.vencido1_30)}</p></CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="p-4"><CardTitle className="text-sm font-medium text-muted-foreground">Vencido 31-60 Días</CardTitle></CardHeader>
                        <CardContent className="p-4 pt-0"><p className="font-bold text-base">{currencyFormatter.format(reportData.vencido31_60)}</p></CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="p-4"><CardTitle className="text-sm font-medium text-muted-foreground">Vencido 61-90 Días</CardTitle></CardHeader>
                        <CardContent className="p-4 pt-0"><p className="font-bold text-base">{currencyFormatter.format(reportData.vencido61_90)}</p></CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="p-4"><CardTitle className="text-sm font-medium text-muted-foreground">Vencido +90 Días</CardTitle></CardHeader>
                        <CardContent className="p-4 pt-0"><p className="font-bold text-destructive text-base">{currencyFormatter.format(reportData.vencidoMas90)}</p></CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Detalle de Cuentas por Pagar</CardTitle>
                <CardDescription>Listado de todas las facturas con saldos pendientes, ordenadas por urgencia.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Proveedor</TableHead>
                            <TableHead>Factura Nro.</TableHead>
                            <TableHead>Fecha Vencimiento</TableHead>
                            <TableHead>Días Vencido</TableHead>
                            <TableHead>Rango</TableHead>
                            <TableHead className="text-right">Saldo Pendiente</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reportData.detalles.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>{item.proveedor_nombre}</TableCell>
                                <TableCell>{item.numero_factura}</TableCell>
                                <TableCell>{item.fecha_vencimiento}</TableCell>
                                <TableCell>{item.diasVencido > 0 ? item.diasVencido : 0}</TableCell>
                                <TableCell><Badge variant={getRangoBadgeVariant(item.rango)}>{item.rango}</Badge></TableCell>
                                <TableCell className="text-right font-medium">{currencyFormatter.format(item.saldo_pendiente)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
                 {reportData.detalles.length === 0 && (
                     <div className="h-48 flex items-center justify-center text-muted-foreground">
                        <p>No se encontraron cuentas que coincidan con los filtros aplicados.</p>
                    </div>
                 )}
            </CardContent>
        </Card>
    </div>
  );
}

