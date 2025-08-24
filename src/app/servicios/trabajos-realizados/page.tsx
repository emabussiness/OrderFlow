
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { collection, getDocs, query, orderBy, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MoreHorizontal, Calendar as CalendarIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";


// --- Types ---
type ItemPresupuesto = {
  id: string;
  nombre: string;
  tipo: 'Repuesto' | 'Mano de Obra';
  cantidad: number;
  precio_unitario: number;
};

type TrabajoRealizado = {
  id: string;
  orden_trabajo_id: string;
  tecnico_nombre: string;
  fecha_finalizacion: string;
  horas_trabajadas: number;
  observaciones_tecnicas: string;
  items_utilizados: ItemPresupuesto[];
  items_adicionales: ItemPresupuesto[];
  costo_total_trabajo: number;
  usuario_id: string;
  recepcion_id?: string;
  cliente_nombre?: string;
};

type Presupuesto = {
    id: string;
    recepcion_id: string;
    cliente_nombre: string;
}

type GroupedTrabajos = {
  [key: string]: {
    cliente_nombre: string;
    fecha: string; 
    trabajos: TrabajoRealizado[];
  }
}

const currencyFormatter = new Intl.NumberFormat('es-PY', {
  style: 'currency',
  currency: 'PYG',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});


// --- Main Component ---
export default function TrabajosRealizadosPage() {
  const { toast } = useToast();
  const [trabajos, setTrabajos] = useState<TrabajoRealizado[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTrabajo, setSelectedTrabajo] = useState<TrabajoRealizado | null>(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const trabajosSnap = await getDocs(query(collection(db, 'trabajos_realizados'), orderBy("fecha_creacion", "desc")));
      const trabajosData = trabajosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrabajoRealizado));

      if(trabajosData.length === 0){
          setTrabajos([]);
          setLoading(false);
          return;
      }
      
      const presupuestoIds = [...new Set(trabajosData.map(t => t.orden_trabajo_id))];
      const presupuestosQuery = query(collection(db, 'presupuestos_servicio'), where('__name__', 'in', presupuestoIds));
      const presupuestosSnap = await getDocs(presupuestosQuery);
      const presupuestosMap = new Map(presupuestosSnap.docs.map(doc => [doc.id, doc.data() as Presupuesto]));
      
      const trabajosEnriquecidos = trabajosData.map(trabajo => {
          const presupuesto = presupuestosMap.get(trabajo.orden_trabajo_id);
          return {
              ...trabajo,
              recepcion_id: presupuesto?.recepcion_id || 'N/A',
              cliente_nombre: presupuesto?.cliente_nombre || 'N/A'
          }
      });

      setTrabajos(trabajosEnriquecidos);

    } catch (error) {
      console.error("Error fetching trabajos realizados:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los trabajos realizados." });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const groupedAndFilteredTrabajos = useMemo(() => {
    const grouped: GroupedTrabajos = {};

    const filtered = trabajos.filter(t => {
        const term = searchTerm.toLowerCase();
        const matchTerm = !term ||
            t.cliente_nombre?.toLowerCase().includes(term) ||
            t.recepcion_id?.toLowerCase().includes(term) ||
            t.tecnico_nombre.toLowerCase().includes(term);

        let matchDate = true;
        if (dateRange?.from) {
            const fechaFinalizacion = new Date(t.fecha_finalizacion + "T00:00:00");
            const from = dateRange.from;
            const to = dateRange.to ?? from;
            matchDate = fechaFinalizacion >= from && fechaFinalizacion <= to;
        }

        return matchTerm && matchDate;
    });

     filtered.forEach(trabajo => {
        const key = trabajo.recepcion_id || 'sin-recepcion';
        if (!grouped[key]) {
            grouped[key] = {
                cliente_nombre: trabajo.cliente_nombre || 'Cliente Desconocido',
                fecha: trabajo.fecha_finalizacion,
                trabajos: []
            };
        }
        grouped[key].trabajos.push(trabajo);
    });

    return Object.entries(grouped)
        .sort(([, valA], [, valB]) => new Date(valB.fecha).getTime() - new Date(valA.fecha).getTime())
        .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});

  }, [trabajos, searchTerm, dateRange]);


  const handleOpenDetails = (trabajo: TrabajoRealizado) => {
    setSelectedTrabajo(trabajo);
    setOpenDetails(true);
  };
  
  if (loading) return <p>Cargando historial de trabajos...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Historial de Trabajos Realizados</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trabajos Completados</CardTitle>
          <CardDescription className="flex flex-col md:flex-row gap-4 mt-2">
             <Input
              placeholder="Buscar por cliente, ID de recepción o técnico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow"
            />
            <Popover>
                <PopoverTrigger asChild>
                    <Button id="date" variant={"outline"} className={cn("w-full md:w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })}</>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Filtrar por fecha finalización</span>)}
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
            {Object.entries(groupedAndFilteredTrabajos).map(([recepcionId, data]) => (
              <AccordionItem value={recepcionId} key={recepcionId}>
                <AccordionTrigger>
                   <div className="flex justify-between w-full pr-4">
                    <span className="font-medium">Recepción ID: {recepcionId.substring(0, 7)}</span>
                    <span className="text-muted-foreground">Cliente: {data.cliente_nombre}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha Finalización</TableHead>
                        <TableHead>OT Nº</TableHead>
                        <TableHead>Técnico</TableHead>
                        <TableHead>Registrado por</TableHead>
                        <TableHead className="text-right">Costo Real</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.trabajos.map((trabajo) => (
                        <TableRow key={trabajo.id}>
                          <TableCell>{trabajo.fecha_finalizacion}</TableCell>
                          <TableCell className="font-medium">{trabajo.orden_trabajo_id.substring(0, 7)}</TableCell>
                          <TableCell>{trabajo.tecnico_nombre}</TableCell>
                          <TableCell>{trabajo.usuario_id}</TableCell>
                          <TableCell className="text-right font-medium">{currencyFormatter.format(trabajo.costo_total_trabajo || 0)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Abrir menú</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenDetails(trabajo)}>
                                  Ver Detalles del Trabajo
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
          {Object.keys(groupedAndFilteredTrabajos).length === 0 && (
            <p className="text-center text-muted-foreground py-10">
              No hay trabajos realizados que coincidan con la búsqueda.
            </p>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={openDetails} onOpenChange={setOpenDetails}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                  <DialogTitle>Detalles del Trabajo Realizado (OT: {selectedTrabajo?.orden_trabajo_id.substring(0, 7)})</DialogTitle>
              </DialogHeader>
              <div className="flex-grow overflow-y-auto -mr-6 pr-6">
              {selectedTrabajo && (
                  <div className="py-4 space-y-6">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                          <div><Label>Fecha de Finalización</Label><p>{selectedTrabajo.fecha_finalizacion}</p></div>
                          <div><Label>Técnico a Cargo</Label><p>{selectedTrabajo.tecnico_nombre}</p></div>
                           <div><Label>Horas de Trabajo</Label><p>{selectedTrabajo.horas_trabajadas} hs</p></div>
                          <div><Label>Observaciones Técnicas</Label><p className="text-muted-foreground">{selectedTrabajo.observaciones_tecnicas || "Sin observaciones."}</p></div>
                           <div><Label>Registrado por</Label><p>{selectedTrabajo.usuario_id}</p></div>
                      </div>

                      <div>
                          <Label className="font-semibold text-base mb-2 block">Ítems Utilizados</Label>
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead>Ítem</TableHead>
                                      <TableHead>Tipo</TableHead>
                                      <TableHead className="text-right">Cantidad</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {selectedTrabajo.items_utilizados.map(item => (
                                      <TableRow key={item.id}>
                                          <TableCell>{item.nombre}</TableCell>
                                          <TableCell><Badge variant={item.tipo === 'Repuesto' ? 'outline' : 'secondary'}>{item.tipo}</Badge></TableCell>
                                          <TableCell className="text-right">{item.cantidad}</TableCell>
                                      </TableRow>
                                  ))}
                                  {selectedTrabajo.items_adicionales.map(item => (
                                      <TableRow key={item.id} className="bg-secondary/30">
                                          <TableCell>{item.nombre} <Badge variant="default">Adicional</Badge></TableCell>
                                           <TableCell><Badge variant='outline'>{item.tipo}</Badge></TableCell>
                                          <TableCell className="text-right">{item.cantidad}</TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                           {(selectedTrabajo.items_utilizados.length === 0 && selectedTrabajo.items_adicionales.length === 0) && (
                                <p className="text-center text-sm text-muted-foreground py-4">No se registraron ítems utilizados.</p>
                           )}
                      </div>

                  </div>
              )}
              </div>
              <DialogFooter className="border-t pt-4 flex justify-between items-center w-full">
                  <div className="font-bold text-lg">Costo Total del Trabajo: {currencyFormatter.format(selectedTrabajo?.costo_total_trabajo || 0)}</div>
                  <Button variant="outline" onClick={() => setOpenDetails(false)}>Cerrar</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}
