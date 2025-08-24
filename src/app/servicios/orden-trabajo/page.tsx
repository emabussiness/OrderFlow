
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { collection, getDocs, query, where, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MoreHorizontal, Eye, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// --- Types ---
type PresupuestoAprobado = {
  id: string;
  equipo_id: string;
  cliente_nombre: string;
  recepcion_id: string;
  fecha_presupuesto: string;
  estado: 'Aprobado';
  total: number;
  usuario_id?: string;
};

type Equipo = {
  id: string;
  tipo_equipo_nombre: string;
  marca_nombre: string;
  modelo: string;
  estado: "En Reparación" | "Reparado" | "Retirado";
  diagnostico_tecnico?: string;
  trabajos_a_realizar?: string;
};

type TrabajoRealizado = {
    id: string;
    orden_trabajo_id: string;
}

type OrdenTrabajo = {
  id: string; // Presupuesto ID
  fecha_aprobacion: string;
  cliente_nombre: string;
  recepcion_id: string;
  equipo_info: string;
  equipo_estado: string;
  diagnostico_tecnico?: string;
  trabajos_a_realizar?: string;
  trabajo_realizado_id?: string;
  total: number;
  usuario_id?: string;
};

type GroupedOrdenes = {
  [key: string]: {
    cliente_nombre: string;
    fecha_recepcion: string; // We'll need to fetch this
    ordenes: OrdenTrabajo[];
  }
}


const currencyFormatter = new Intl.NumberFormat('es-PY', {
  style: 'currency',
  currency: 'PYG',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});


// --- Main Component ---
export default function OrdenDeTrabajoPage() {
  const { toast } = useToast();
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const presupuestosQuery = query(
        collection(db, 'presupuestos_servicio'),
        where("estado", "==", "Aprobado")
      );
      const presupuestosSnap = await getDocs(presupuestosQuery);
      const presupuestosAprobados = presupuestosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PresupuestoAprobado));
      
      if (presupuestosAprobados.length === 0) {
        setOrdenes([]);
        setLoading(false);
        return;
      }
      
      const equipoIds = [...new Set(presupuestosAprobados.map(p => p.equipo_id))];
      const equiposQuery = query(collection(db, 'equipos_en_servicio'), where('__name__', 'in', equipoIds));
      const equiposSnap = await getDocs(equiposQuery);
      const equiposMap = new Map(equiposSnap.docs.map(doc => [doc.id, doc.data() as Equipo]));
      
      const otIds = presupuestosAprobados.map(p => p.id);
      if (otIds.length === 0) {
           setOrdenes([]);
           setLoading(false);
           return;
      }
      const trabajosQuery = query(collection(db, 'trabajos_realizados'), where('orden_trabajo_id', 'in', otIds));
      const trabajosSnap = await getDocs(trabajosQuery);
      const trabajosMap = new Map(trabajosSnap.docs.map(doc => [doc.data().orden_trabajo_id, doc.id]));

      const ordenesDeTrabajo = presupuestosAprobados.map(presupuesto => {
        const equipo = equiposMap.get(presupuesto.equipo_id);
        return {
          id: presupuesto.id,
          fecha_aprobacion: presupuesto.fecha_presupuesto,
          cliente_nombre: presupuesto.cliente_nombre,
          recepcion_id: presupuesto.recepcion_id,
          equipo_info: equipo ? `${equipo.tipo_equipo_nombre} ${equipo.marca_nombre} ${equipo.modelo}` : "Info no disponible",
          equipo_estado: equipo?.estado || 'Desconocido',
          diagnostico_tecnico: equipo?.diagnostico_tecnico,
          trabajos_a_realizar: equipo?.trabajos_a_realizar,
          trabajo_realizado_id: trabajosMap.get(presupuesto.id),
          total: presupuesto.total,
          usuario_id: presupuesto.usuario_id,
        };
      }).sort((a,b) => new Date(b.fecha_aprobacion).getTime() - new Date(a.fecha_aprobacion).getTime());

      setOrdenes(ordenesDeTrabajo);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las órdenes de trabajo." });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const getStatusVariant = (status: string): "secondary" | "default" | "outline" => {
    if (status === 'Reparado') return 'default';
    if (status === 'En Reparación') return 'secondary';
    return 'outline';
  }

  const groupedAndFilteredOrdenes = useMemo(() => {
    const grouped: GroupedOrdenes = {};

     const filteredOrdenes = ordenes.filter(ot => {
        const term = searchTerm.toLowerCase();
        const matchTerm = !term ||
            ot.cliente_nombre.toLowerCase().includes(term) ||
            ot.recepcion_id.toLowerCase().includes(term) ||
            ot.equipo_info.toLowerCase().includes(term);

        let matchDate = true;
        if (dateRange?.from) {
            const fechaAprobacion = new Date(ot.fecha_aprobacion + "T00:00:00");
            const from = dateRange.from;
            const to = dateRange.to ?? from;
            matchDate = fechaAprobacion >= from && fechaAprobacion <= to;
        }
        
        return matchTerm && matchDate;
    });

    filteredOrdenes.forEach(ot => {
        const key = ot.recepcion_id;
        if (!grouped[key]) {
            grouped[key] = {
                cliente_nombre: ot.cliente_nombre,
                fecha_recepcion: ot.fecha_aprobacion, // Using approval date as reference
                ordenes: []
            };
        }
        grouped[key].ordenes.push(ot);
    });

    return Object.entries(grouped)
        .sort(([, valA], [, valB]) => new Date(valB.fecha_recepcion).getTime() - new Date(valA.fecha_recepcion).getTime())
        .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});

  }, [ordenes, searchTerm, dateRange]);


  if (loading) return <p>Cargando órdenes de trabajo...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Órdenes de Trabajo</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Trabajo Activas</CardTitle>
          <CardDescription className="flex flex-col md:flex-row gap-4 mt-2">
            <Input
              placeholder="Buscar por cliente, ID de recepción o equipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow"
            />
             <Popover>
                <PopoverTrigger asChild>
                    <Button id="date" variant={"outline"} className={cn("w-full md:w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })}</>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Filtrar por fecha aprobación</span>)}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar initialFocus mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es}/>
                </PopoverContent>
            </Popover>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
             {Object.entries(groupedAndFilteredOrdenes).map(([recepcionId, data]) => (
              <AccordionItem value={recepcionId} key={recepcionId}>
                 <AccordionTrigger>
                  <div className="flex justify-between w-full pr-4">
                    <span className="font-medium">Recepción ID: {recepcionId.substring(0, 7)}</span>
                    <span className="text-muted-foreground">Cliente: {data.cliente_nombre}</span>
                    <span className="text-muted-foreground">Fecha Aprobación Reciente: {data.fecha_recepcion}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>OT Nº</TableHead>
                        <TableHead>Equipo</TableHead>
                        <TableHead>Estado del Equipo</TableHead>
                        <TableHead>Aprobado por</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.ordenes.map((ot) => (
                        <TableRow key={ot.id}>
                          <TableCell className="font-medium">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="link" className="p-0 h-auto">{ot.id.substring(0, 7)}</Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-96">
                                <div className="grid gap-4">
                                  <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Diagnóstico Técnico</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {ot.diagnostico_tecnico || "No especificado"}
                                    </p>
                                  </div>
                                  <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Trabajos a Realizar</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {ot.trabajos_a_realizar || "No especificado"}
                                    </p>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                          <TableCell>{ot.equipo_info}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(ot.equipo_estado)}>{ot.equipo_estado}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{ot.usuario_id || 'N/A'}</TableCell>
                          <TableCell className="text-right font-medium">{currencyFormatter.format(ot.total)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Abrir menú</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {ot.trabajo_realizado_id ? (
                                  <DropdownMenuItem asChild>
                                    <Link href={`/servicios/trabajos-realizados?view=${ot.trabajo_realizado_id}`}>Ver Trabajo Realizado</Link>
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem asChild>
                                    <Link href={`/servicios/trabajos-realizados/${ot.id}`}>Registrar Trabajo</Link>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem asChild disabled={ot.equipo_estado !== 'Reparado'}>
                                  <Link href={`/servicios/retiro-equipos?ot_id=${ot.id}`}>Registrar Retiro</Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {Object.keys(groupedAndFilteredOrdenes).length === 0 && (
            <p className="text-center text-muted-foreground py-10">
              No hay órdenes de trabajo activas que coincidan con la búsqueda.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
