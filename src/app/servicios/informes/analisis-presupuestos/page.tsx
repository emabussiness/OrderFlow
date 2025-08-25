
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Pie, PieChart, Cell, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, FileWarning, Eye } from "lucide-react";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/command";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChartTooltipContent } from "@/components/ui/chart";


// --- Types ---
type PresupuestoServicio = {
  id: string;
  cliente_nombre: string;
  fecha_presupuesto: string;
  total: number;
  estado: "Pendiente de Aprobación" | "Aprobado" | "Rechazado";
  equipo_id: string;
};

type Equipo = {
    id: string;
    tipo_equipo_nombre: string;
    marca_nombre: string;
    modelo: string;
}

type ReportData = {
  totalPresupuestos: number;
  montoTotal: number;
  tasaAprobacion: number;
  valorPromedio: number;
  distribucionEstados: { name: string; value: number }[];
  topMasCostosos: { id: string; cliente: string; total: number }[];
  listadoCompleto: PresupuestoServicio[];
};

const COLORS = {
    'Aprobado': 'hsl(var(--primary))',
    'Rechazado': 'hsl(var(--destructive))',
    'Pendiente de Aprobación': 'hsl(var(--chart-3))',
};

const currencyFormatter = new Intl.NumberFormat('es-PY', {
  style: 'currency',
  currency: 'PYG',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});


// --- Main Component ---
export default function AnalisisPresupuestosPage() {
  const { toast } = useToast();
  const [presupuestos, setPresupuestos] = useState<PresupuestoServicio[]>([]);
  const [equipos, setEquipos] = useState<Map<string, Equipo>>(new Map());
  const [loading, setLoading] = useState(true);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -29),
    to: new Date(),
  });
  const [statusFilter, setStatusFilter] = useState<PresupuestoServicio['estado'] | ''>('');

  // Data Fetching
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [presupuestosSnap, equiposSnap] = await Promise.all([
          getDocs(query(collection(db, 'presupuestos_servicio'))),
          getDocs(collection(db, 'equipos_en_servicio'))
        ]);
        
        setPresupuestos(presupuestosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PresupuestoServicio)));
        const equiposMap = new Map<string, Equipo>();
        equiposSnap.forEach(doc => equiposMap.set(doc.id, {id: doc.id, ...doc.data()} as Equipo));
        setEquipos(equiposMap);

      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos para las estadísticas.' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  // Data Processing
  const reportData: ReportData = useMemo(() => {
    const data: ReportData = {
      totalPresupuestos: 0,
      montoTotal: 0,
      tasaAprobacion: 0,
      valorPromedio: 0,
      distribucionEstados: [],
      topMasCostosos: [],
      listadoCompleto: [],
    };

    if (loading) return data;

    const presupuestosFiltrados = presupuestos.filter(p => {
        let inDateRange = true;
        if(dateRange?.from) {
            const fechaPresupuesto = new Date(p.fecha_presupuesto + "T00:00:00");
            const from = dateRange.from;
            const to = dateRange.to ?? from;
            inDateRange = fechaPresupuesto >= from && fechaPresupuesto <= to;
        }

        const matchStatus = !statusFilter || p.estado === statusFilter;
        
        return inDateRange && matchStatus;
    });

    data.totalPresupuestos = presupuestosFiltrados.length;
    data.listadoCompleto = [...presupuestosFiltrados].sort((a, b) => b.total - a.total); // For the table
    
    if (data.totalPresupuestos === 0) return data;

    data.montoTotal = presupuestosFiltrados.reduce((sum, p) => sum + p.total, 0);
    data.valorPromedio = data.montoTotal / data.totalPresupuestos;

    const estadosCount = { 'Pendiente de Aprobación': 0, 'Aprobado': 0, 'Rechazado': 0 };
    presupuestosFiltrados.forEach(p => {
        estadosCount[p.estado]++;
    });

    const totalFinalizados = estadosCount['Aprobado'] + estadosCount['Rechazado'];
    data.tasaAprobacion = totalFinalizados > 0 ? (estadosCount['Aprobado'] / totalFinalizados) * 100 : 0;

    data.distribucionEstados = Object.entries(estadosCount).map(([name, value]) => ({ name, value }));

    data.topMasCostosos = [...presupuestosFiltrados]
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)
        .map(p => ({ id: p.id, cliente: p.cliente_nombre, total: p.total }));

    return data;
  }, [presupuestos, dateRange, loading, statusFilter]);

  const getStatusBadgeVariant = (estado?: PresupuestoServicio['estado']) => {
    switch (estado) {
        case 'Aprobado': return 'default';
        case 'Rechazado': return 'destructive';
        case 'Pendiente de Aprobación': return 'secondary';
        default: return 'outline';
    }
  }


  if (loading) return <p>Generando estadísticas...</p>;

  return (
    <div className="space-y-6">
       <Card>
            <CardHeader>
                <CardTitle>Filtros del Informe</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-4">
                <div className="space-y-2 max-w-sm">
                    <Label>Rango de Fechas de Presupuesto</Label>
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
                 <div className="space-y-2 max-w-sm">
                    <Label>Estado</Label>
                    <Combobox
                        options={[
                            { value: '', label: 'Todos los estados' },
                            { value: 'Pendiente de Aprobación', label: 'Pendiente' },
                            { value: 'Aprobado', label: 'Aprobado' },
                            { value: 'Rechazado', label: 'Rechazado' },
                        ]}
                        value={statusFilter}
                        onChange={setStatusFilter}
                        placeholder="Filtrar por estado"
                    />
                </div>
            </CardContent>
        </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Presupuestos</CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{reportData.totalPresupuestos}</div></CardContent>
          </Card>
           <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monto Total Presupuestado</CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{currencyFormatter.format(reportData.montoTotal)}</div></CardContent>
          </Card>
           <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tasa de Aprobación</CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-primary">{reportData.tasaAprobacion.toFixed(1)}%</div></CardContent>
          </Card>
           <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Valor Promedio</CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{currencyFormatter.format(reportData.valorPromedio)}</div></CardContent>
          </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-5">
        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle>Distribución por Estado</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                 {reportData.distribucionEstados.some(d => d.value > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={reportData.distribucionEstados}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                nameKey="name"
                            >
                                {reportData.distribucionEstados.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                                ))}
                            </Pie>
                            <Tooltip
                                content={<ChartTooltipContent formatter={(value, name) => `${value} Presupuestos`} />}
                            />
                             <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                        <p>No hay datos para mostrar.</p>
                    </div>
                 )}
            </CardContent>
        </Card>
        <Card className="md:col-span-3">
             <CardHeader>
                <CardTitle>Top 10 Presupuestos más Costosos</CardTitle>
             </CardHeader>
             <CardContent className="h-[300px]">
                  {reportData.topMasCostosos.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportData.topMasCostosos} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => currencyFormatter.format(value as number)}/>
                            <YAxis type="category" dataKey="cliente" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={100} />
                            <Tooltip
                                content={<ChartTooltipContent formatter={(value) => currencyFormatter.format(value as number)} />}
                                cursor={{ fill: "hsl(var(--secondary))" }}
                            />
                            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                 ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                        <p>No hay datos para mostrar.</p>
                    </div>
                 )}
             </CardContent>
        </Card>
      </div>

       <Card>
            <CardHeader>
                <CardTitle>Listado de Presupuestos</CardTitle>
                <CardDescription>Detalle de todos los presupuestos generados en el período seleccionado, ordenados de mayor a menor costo.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Equipo</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reportData.listadoCompleto.map((p) => {
                             const equipo = equipos.get(p.equipo_id);
                             return (
                                <TableRow key={p.id}>
                                    <TableCell>{p.fecha_presupuesto}</TableCell>
                                    <TableCell>{p.cliente_nombre}</TableCell>
                                    <TableCell>{equipo ? `${equipo.tipo_equipo_nombre} ${equipo.marca_nombre}` : 'N/A'}</TableCell>
                                    <TableCell><Badge variant={getStatusBadgeVariant(p.estado)}>{p.estado}</Badge></TableCell>
                                    <TableCell className="text-right font-medium">{currencyFormatter.format(p.total)}</TableCell>
                                </TableRow>
                             )
                        })}
                    </TableBody>
                 </Table>
                 {reportData.listadoCompleto.length === 0 && (
                     <div className="h-48 flex items-center justify-center text-muted-foreground">
                        <p>No se encontraron presupuestos que coincidan con los filtros aplicados.</p>
                    </div>
                 )}
            </CardContent>
        </Card>

    </div>
  );
}
