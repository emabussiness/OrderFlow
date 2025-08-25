
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

// --- Types ---
type Equipo = {
  id: string;
  estado: "Recibido" | "Diagnosticado" | "Presupuestado" | "En Reparación" | "Reparado" | "Retirado";
  tipo_equipo_nombre: string;
  fecha_recepcion: string;
};

type ReportData = {
  totalRecepciones: number;
  totalEquipos: number;
  pendientesDiagnostico: number;
  pendientesPresupuesto: number;
  equiposPorTipo: { name: string; total: number }[];
};

// --- Main Component ---
export default function EstadisticasRecepcionPage() {
  const { toast } = useToast();
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [presupuestos, setPresupuestos] = useState<string[]>([]); // Array of equipo_id that have a budget
  const [loading, setLoading] = useState(true);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -29),
    to: new Date(),
  });

  // Data Fetching
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [equiposSnap, presupuestosSnap] = await Promise.all([
          getDocs(collection(db, 'equipos_en_servicio')),
          getDocs(collection(db, 'presupuestos_servicio'))
        ]);
        
        setEquipos(equiposSnap.docs.map(doc => doc.data() as Equipo));
        setPresupuestos(presupuestosSnap.docs.map(doc => doc.data().equipo_id));

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
        totalRecepciones: 0,
        totalEquipos: 0,
        pendientesDiagnostico: 0,
        pendientesPresupuesto: 0,
        equiposPorTipo: []
    };

    if (loading || !dateRange?.from) return data;

    const from = dateRange.from;
    const to = dateRange.to ?? from;
    
    const equiposFiltrados = equipos.filter(e => {
        const fechaRecepcion = new Date(e.fecha_recepcion + "T00:00:00");
        return fechaRecepcion >= from && fechaRecepcion <= to;
    });

    const recepcionIds = new Set(equiposFiltrados.map(e => (e as any).recepcion_id));
    data.totalRecepciones = recepcionIds.size;
    data.totalEquipos = equiposFiltrados.length;
    
    const equiposPorTipoMap = new Map<string, number>();

    equiposFiltrados.forEach(equipo => {
        // Equipos por tipo
        equiposPorTipoMap.set(equipo.tipo_equipo_nombre, (equiposPorTipoMap.get(equipo.tipo_equipo_nombre) || 0) + 1);

        // Pendientes de diagnóstico
        if (equipo.estado === 'Recibido') {
            data.pendientesDiagnostico++;
        }
        // Pendientes de presupuesto
        if (equipo.estado === 'Diagnosticado' && !presupuestos.includes(equipo.id)) {
            data.pendientesPresupuesto++;
        }
    });

    data.equiposPorTipo = Array.from(equiposPorTipoMap.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a,b) => b.total - a.total);

    return data;
  }, [equipos, presupuestos, dateRange, loading]);


  if (loading) return <p>Generando estadísticas...</p>;

  return (
    <div className="space-y-6">
       <Card>
            <CardHeader>
                <CardTitle>Filtros del Informe</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2 max-w-sm">
                    <Label>Rango de Fechas de Recepción</Label>
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
            </CardContent>
        </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Equipos Recibidos</CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{reportData.totalEquipos}</div></CardContent>
          </Card>
           <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recepciones Totales</CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{reportData.totalRecepciones}</div></CardContent>
          </Card>
           <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pendientes de Diagnóstico</CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-destructive">{reportData.pendientesDiagnostico}</div></CardContent>
          </Card>
           <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pendientes de Presupuesto</CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-orange-500">{reportData.pendientesPresupuesto}</div></CardContent>
          </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Equipos Recibidos por Tipo</CardTitle>
          <CardDescription>
            Distribución de los tipos de equipos que ingresan a servicio técnico en el período seleccionado.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[400px]">
          {reportData.equiposPorTipo.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.equiposPorTipo} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={100} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            borderColor: 'hsl(var(--border))'
                        }}
                        cursor={{ fill: "hsl(var(--secondary))" }} 
                       />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
              </ResponsiveContainer>
          ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p>No hay datos de recepción de equipos para el período seleccionado.</p>
              </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
