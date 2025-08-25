
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import { addDays, format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/command";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

// --- Types ---
type Equipo = {
  id: string;
  fecha_recepcion: string;
  fecha_diagnostico?: string;
  tipo_equipo_nombre: string;
};
type Presupuesto = {
  id: string;
  equipo_id: string;
  fecha_presupuesto: string;
};
type TrabajoRealizado = {
  id: string;
  orden_trabajo_id: string; // Es el ID del presupuesto
  tecnico_nombre: string;
  fecha_finalizacion: string;
};
type Tecnico = {
    id: string;
    nombre_apellido: string;
};

type CicloVida = {
    equipo_id: string;
    recepcion: Date;
    diagnostico?: Date;
    presupuesto?: Date;
    reparacion?: Date;
    tecnico_nombre?: string;
    tipo_equipo: string;
};

type ReportData = {
    tiempoPromedioReparacion: number;
    tiempoPromedioDiagnostico: number;
    tiempoPromedioEsperaAprobacion: number;
    totalOrdenesCompletadas: number;
    reparacionesPorTecnico: { name: string; total: number }[];
    tiempoPorTipoEquipo: { name: string; tiempo: number }[];
    detalleCiclos: (CicloVida & {dias_diagnostico: number, dias_espera: number, dias_reparacion: number, dias_totales: number})[];
};


// --- Main Component ---
export default function AnalisisRendimientoPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [ciclos, setCiclos] = useState<CicloVida[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [tiposEquipo, setTiposEquipo] = useState<{value: string, label: string}[]>([]);


  // Filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -29),
    to: new Date(),
  });
  const [tecnicoFilter, setTecnicoFilter] = useState('');
  const [tipoEquipoFilter, setTipoEquipoFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [equiposSnap, presupuestosSnap, trabajosSnap, tecnicosSnap] = await Promise.all([
        getDocs(query(collection(db, 'equipos_en_servicio'))),
        getDocs(query(collection(db, 'presupuestos_servicio'))),
        getDocs(query(collection(db, 'trabajos_realizados'))),
        getDocs(query(collection(db, 'tecnicos'), orderBy("nombre_apellido")))
      ]);
      
      const equiposMap = new Map(equiposSnap.docs.map(d => [d.id, d.data() as Equipo]));
      const presupuestosMap = new Map(presupuestosSnap.docs.map(d => [d.data().equipo_id, d.data() as Presupuesto]));
      const trabajosMap = new Map(trabajosSnap.docs.map(d => [d.data().orden_trabajo_id, d.data() as TrabajoRealizado]));
      
      const ciclosVida: CicloVida[] = [];

      for(const [trabajoId, trabajo] of trabajosMap.entries()){
         const presupuesto = presupuestosSnap.docs.find(p => p.id === trabajo.orden_trabajo_id)?.data() as Presupuesto;
         if(!presupuesto) continue;

         const equipo = equiposMap.get(presupuesto.equipo_id);
         if(!equipo) continue;
         
         ciclosVida.push({
             equipo_id: equipo.id,
             recepcion: new Date(equipo.fecha_recepcion + 'T00:00:00'),
             diagnostico: equipo.fecha_diagnostico ? new Date(equipo.fecha_diagnostico + 'T00:00:00') : undefined,
             presupuesto: presupuesto.fecha_presupuesto ? new Date(presupuesto.fecha_presupuesto + 'T00:00:00') : undefined,
             reparacion: trabajo.fecha_finalizacion ? new Date(trabajo.fecha_finalizacion + 'T00:00:00') : undefined,
             tecnico_nombre: trabajo.tecnico_nombre,
             tipo_equipo: equipo.tipo_equipo_nombre,
         });
      }
      setCiclos(ciclosVida);

      const tecnicosData = tecnicosSnap.docs.map(d => ({id: d.id, ...d.data()} as Tecnico));
      setTecnicos(tecnicosData);

      const tiposUnicos = [...new Set(Array.from(equiposMap.values()).map(e => e.tipo_equipo_nombre))];
      setTiposEquipo(tiposUnicos.map(t => ({value: t, label: t})));

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos para el informe.' });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const reportData: ReportData = useMemo(() => {
    const data: ReportData = {
        tiempoPromedioReparacion: 0,
        tiempoPromedioDiagnostico: 0,
        tiempoPromedioEsperaAprobacion: 0,
        totalOrdenesCompletadas: 0,
        reparacionesPorTecnico: [],
        tiempoPorTipoEquipo: [],
        detalleCiclos: [],
    };
    if(loading) return data;

    const ciclosFiltrados = ciclos.filter(c => {
        if(!c.reparacion) return false;
        const inDateRange = dateRange?.from ? (c.reparacion >= dateRange.from && c.reparacion <= (dateRange.to ?? dateRange.from)) : true;
        const matchTecnico = !tecnicoFilter || c.tecnico_nombre === tecnicoFilter;
        const matchTipo = !tipoEquipoFilter || c.tipo_equipo === tipoEquipoFilter;
        return inDateRange && matchTecnico && matchTipo;
    });

    data.totalOrdenesCompletadas = ciclosFiltrados.length;
    if (data.totalOrdenesCompletadas === 0) return data;

    let totalDiasReparacion = 0, totalDiasDiagnostico = 0, totalDiasEspera = 0;
    const tecnicosMap = new Map<string, number>();
    const tiposEquipoMap = new Map<string, { total: number, count: number }>();
    
    data.detalleCiclos = ciclosFiltrados.map(c => {
        const dias_diagnostico = c.diagnostico ? differenceInDays(c.diagnostico, c.recepcion) : 0;
        const dias_espera = c.presupuesto && c.diagnostico ? differenceInDays(c.presupuesto, c.diagnostico) : 0;
        const dias_reparacion = c.reparacion && c.presupuesto ? differenceInDays(c.reparacion, c.presupuesto) : 0;
        const dias_totales = c.reparacion ? differenceInDays(c.reparacion, c.recepcion) : 0;

        totalDiasReparacion += dias_totales;
        totalDiasDiagnostico += dias_diagnostico;
        totalDiasEspera += dias_espera;

        if (c.tecnico_nombre) {
            tecnicosMap.set(c.tecnico_nombre, (tecnicosMap.get(c.tecnico_nombre) || 0) + 1);
        }
        const tipoStat = tiposEquipoMap.get(c.tipo_equipo) || { total: 0, count: 0 };
        tiposEquipoMap.set(c.tipo_equipo, { total: tipoStat.total + dias_totales, count: tipoStat.count + 1 });

        return {...c, dias_diagnostico, dias_espera, dias_reparacion, dias_totales};
    });

    data.tiempoPromedioReparacion = totalDiasReparacion / data.totalOrdenesCompletadas;
    data.tiempoPromedioDiagnostico = totalDiasDiagnostico / data.totalOrdenesCompletadas;
    data.tiempoPromedioEsperaAprobacion = totalDiasEspera / data.totalOrdenesCompletadas;

    data.reparacionesPorTecnico = Array.from(tecnicosMap.entries()).map(([name, total]) => ({ name, total })).sort((a,b) => b.total - a.total);
    data.tiempoPorTipoEquipo = Array.from(tiposEquipoMap.entries()).map(([name, {total, count}]) => ({ name, tiempo: total / count })).sort((a,b) => b.tiempo - a.tiempo);

    return data;

  }, [loading, ciclos, dateRange, tecnicoFilter, tipoEquipoFilter]);

  if (loading) return <p>Generando estadísticas...</p>;

  return (
    <div className="space-y-6">
       <Card>
            <CardHeader>
                <CardTitle>Filtros de Rendimiento</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label>Fecha de Finalización</Label>
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
                 <div className="space-y-2">
                    <Label>Técnico</Label>
                    <Combobox options={[{value: '', label: 'Todos los técnicos'}, ...tecnicos.map(t => ({value: t.nombre_apellido, label: t.nombre_apellido}))]} value={tecnicoFilter} onChange={setTecnicoFilter} placeholder="Filtrar por técnico" />
                </div>
                 <div className="space-y-2">
                    <Label>Tipo de Equipo</Label>
                    <Combobox options={[{value: '', label: 'Todos los tipos'}, ...tiposEquipo]} value={tipoEquipoFilter} onChange={setTipoEquipoFilter} placeholder="Filtrar por tipo" />
                </div>
            </CardContent>
        </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card><CardHeader><CardTitle className="text-sm font-medium">Reparaciones Completadas</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{reportData.totalOrdenesCompletadas}</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm font-medium">Tiempo Promedio Total</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{reportData.tiempoPromedioReparacion.toFixed(1)} días</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm font-medium">Tiempo Promedio en Taller</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{(reportData.tiempoPromedioDiagnostico + (reportData.detalleCiclos.reduce((acc, c) => acc + c.dias_reparacion, 0) / reportData.totalOrdenesCompletadas)).toFixed(1)} días</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm font-medium">Tiempo Promedio en Espera</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{reportData.tiempoPromedioEsperaAprobacion.toFixed(1)} días</div></CardContent></Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
          <Card>
              <CardHeader>
                  <CardTitle>Reparaciones por Técnico</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {reportData.reparacionesPorTecnico.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={reportData.reparacionesPorTecnico} layout="vertical" margin={{left: 100}}>
                            <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                            <YAxis type="category" dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={100} />
                            <Tooltip cursor={{ fill: 'hsl(var(--secondary))' }}/>
                            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ): (<div className="h-full flex items-center justify-center text-muted-foreground"><p>No hay datos para mostrar.</p></div>)}
              </CardContent>
          </Card>
          <Card>
              <CardHeader>
                  <CardTitle>Tiempo Promedio por Tipo de Equipo</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {reportData.tiempoPorTipoEquipo.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={reportData.tiempoPorTipoEquipo}>
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}d`}/>
                            <Tooltip formatter={(val) => [`${(val as number).toFixed(1)} días`, "Tiempo Prom."]} cursor={{ fill: 'hsl(var(--secondary))' }}/>
                            <Bar dataKey="tiempo" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ): (<div className="h-full flex items-center justify-center text-muted-foreground"><p>No hay datos para mostrar.</p></div>)}
              </CardContent>
          </Card>
      </div>

       <Card>
            <CardHeader><CardTitle>Detalle del Ciclo de Vida de Reparación</CardTitle></CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tipo Equipo</TableHead>
                            <TableHead>Técnico</TableHead>
                            <TableHead className="text-right">Días Diagnóstico</TableHead>
                            <TableHead className="text-right">Días Espera</TableHead>
                            <TableHead className="text-right">Días Reparación</TableHead>
                            <TableHead className="text-right">Días Totales</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reportData.detalleCiclos.map((d) => (
                            <TableRow key={d.equipo_id}>
                                <TableCell>{d.tipo_equipo}</TableCell>
                                <TableCell>{d.tecnico_nombre}</TableCell>
                                <TableCell className="text-right">{d.dias_diagnostico}</TableCell>
                                <TableCell className="text-right">{d.dias_espera}</TableCell>
                                <TableCell className="text-right">{d.dias_reparacion}</TableCell>
                                <TableCell className="text-right font-bold">{d.dias_totales}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
                 {reportData.detalleCiclos.length === 0 && (
                     <div className="h-48 flex items-center justify-center text-muted-foreground">
                        <p>No se encontraron reparaciones que coincidan con los filtros aplicados.</p>
                    </div>
                 )}
            </CardContent>
        </Card>

    </div>
  );
}
