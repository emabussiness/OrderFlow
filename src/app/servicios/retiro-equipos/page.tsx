
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { collection, getDocs, query, where, orderBy, doc, getDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { CheckCheck, Eye, Calendar as CalendarIcon } from "lucide-react";
import { addDays, format } from 'date-fns';
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";


// --- Types ---
type RetiroInfo = {
    nombre_retira: string;
    ci_retira: string;
    fecha_retiro: string;
    usuario_id: string;
}

type ItemPresupuesto = {
  id: string;
  nombre: string;
  tipo: 'Repuesto' | 'Mano de Obra';
  cantidad: number;
  precio_unitario: number;
};

type TrabajoRealizado = {
    id: string;
    items_cubiertos_garantia?: ItemPresupuesto[];
}

type EquipoParaRetiro = {
  id: string;
  cliente_nombre: string;
  recepcion_id: string;
  tipo_equipo_nombre: string;
  marca_nombre: string;
  modelo: string;
  estado: "Reparado" | "Diagnosticado" | "Presupuestado" | "Retirado";
  motivo_retiro: 'Reparación Finalizada' | 'Presupuesto Rechazado';
  presupuesto_id: string; 
  retiro_info?: RetiroInfo;
  trabajo_realizado?: TrabajoRealizado;
};

type PresupuestoServicio = {
    id: string;
    total: number;
    estado: 'Aprobado' | 'Rechazado';
}

type GroupedEquipos = {
  [key: string]: {
    cliente_nombre: string;
    equipos: EquipoParaRetiro[];
  }
}

const currencyFormatter = new Intl.NumberFormat('es-PY', {
  style: 'currency',
  currency: 'PYG',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});


// --- Main Component ---
export default function RetiroEquiposPage() {
  const { toast } = useToast();
  const [equipos, setEquipos] = useState<EquipoParaRetiro[]>([]);
  const [presupuestos, setPresupuestos] = useState<Map<string, PresupuestoServicio>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Dialog state
  const [openRetiro, setOpenRetiro] = useState(false);
  const [selectedEquipo, setSelectedEquipo] = useState<EquipoParaRetiro | null>(null);
  const [nombreRetira, setNombreRetira] = useState("");
  const [ciRetira, setCiRetira] = useState("");
  const [pagoId, setPagoId] = useState("");
  const [diasGarantia, setDiasGarantia] = useState(90);
  const [notasGarantia, setNotasGarantia] = useState("La garantía cubre defectos de la reparación realizada y los repuestos instalados. No cubre daños por mal uso, sobretensión o problemas de software no relacionados.");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const equiposReparadosQuery = query(collection(db, 'equipos_en_servicio'), where("estado", "in", ["Reparado", "Retirado"]));
      const presupuestosRechazadosQuery = query(collection(db, 'presupuestos_servicio'), where("estado", "==", "Rechazado"));

      const [equiposReparadosSnap, presupuestosRechazadosSnap] = await Promise.all([
          getDocs(equiposReparadosQuery),
          getDocs(presupuestosRechazadosQuery)
      ]);

      const equiposParaRetiro: EquipoParaRetiro[] = [];
      const presupuestoIds = new Set<string>();
      const equipoIds = new Set<string>();
      const otIds = new Set<string>();

      for (const equipoDoc of equiposReparadosSnap.docs) {
          const equipoData = { id: equipoDoc.id, ...equipoDoc.data() } as any;
          const presupuestoId = await findPresupuestoId(equipoData.id);
          if (presupuestoId) {
            equipoData.presupuesto_id = presupuestoId;
            equipoData.motivo_retiro = 'Reparación Finalizada';
            presupuestoIds.add(presupuestoId);
            equiposParaRetiro.push(equipoData);
            equipoIds.add(equipoData.id);
            otIds.add(presupuestoId);
          }
      }
      
      const equiposRechazadosIds = presupuestosRechazadosSnap.docs.map(doc => doc.data().equipo_id);
      if(equiposRechazadosIds.length > 0) {
        const equiposRechazadosQuery = query(collection(db, 'equipos_en_servicio'), where('__name__', 'in', equiposRechazadosIds));
        const equiposRechazadosSnap = await getDocs(equiposRechazadosQuery);

        for (const equipoDoc of equiposRechazadosSnap.docs) {
           const presupuestoRechazado = presupuestosRechazadosSnap.docs.find(p => p.data().equipo_id === equipoDoc.id);
           if(presupuestoRechazado && !equiposParaRetiro.some(e => e.id === equipoDoc.id)) {
             const equipoData = { id: equipoDoc.id, ...equipoDoc.data(), motivo_retiro: 'Presupuesto Rechazado', presupuesto_id: presupuestoRechazado.id } as any;
             presupuestoIds.add(presupuestoRechazado.id);
             equiposParaRetiro.push(equipoData);
             equipoIds.add(equipoData.id);
           }
        }
      }

      if (presupuestoIds.size > 0) {
        const presupuestosQuery = query(collection(db, 'presupuestos_servicio'), where('__name__', 'in', [...presupuestoIds]));
        const presupuestosSnap = await getDocs(presupuestosQuery);
        const presupuestosMap = new Map<string, PresupuestoServicio>();
        presupuestosSnap.forEach(doc => {
            const data = doc.data() as PresupuestoServicio;
            presupuestosMap.set(doc.id, {id: doc.id, total: data.total, estado: data.estado});
        });
        setPresupuestos(presupuestosMap);
      }
      
      // Fetch trabajos realizados to get warranty items
      const trabajosMap = new Map<string, TrabajoRealizado>();
      if (otIds.size > 0) {
          const trabajosQuery = query(collection(db, 'trabajos_realizados'), where('orden_trabajo_id', 'in', [...otIds]));
          const trabajosSnap = await getDocs(trabajosQuery);
          trabajosSnap.forEach(doc => {
              const trabajoData = { id: doc.id, ...doc.data() } as TrabajoRealizado;
              const otId = doc.data().orden_trabajo_id;
              if (otId) {
                  trabajosMap.set(otId, trabajoData);
              }
          });
      }

      const retirosMap = new Map<string, RetiroInfo>();
      if (equipoIds.size > 0) {
        const retirosQuery = query(collection(db, 'retiros_equipo'), where('equipo_id', 'in', [...equipoIds]));
        const retirosSnap = await getDocs(retirosQuery);
        retirosSnap.forEach(doc => {
            const retiroData = doc.data();
            retirosMap.set(retiroData.equipo_id, {
                nombre_retira: retiroData.nombre_retira,
                ci_retira: retiroData.ci_retira,
                fecha_retiro: retiroData.fecha_retiro,
                usuario_id: retiroData.usuario_id,
            });
        });
      }
      
      const finalEquiposList = equiposParaRetiro.map(equipo => ({
          ...equipo,
          retiro_info: retirosMap.get(equipo.id),
          trabajo_realizado: trabajosMap.get(equipo.presupuesto_id)
      }));

      setEquipos(finalEquiposList);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los equipos listos para retiro." });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  const findPresupuestoId = async (equipoId: string): Promise<string | undefined> => {
    const q = query(collection(db, 'presupuestos_servicio'), where('equipo_id', '==', equipoId), where('estado', '==', 'Aprobado'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }
    return undefined;
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const groupedAndFilteredEquipos = useMemo(() => {
    const grouped: GroupedEquipos = {};

    const filteredEquipos = equipos.filter(equipo => {
      const term = searchTerm.toLowerCase();
      const matchTerm = !term ||
        equipo.cliente_nombre.toLowerCase().includes(term) ||
        equipo.recepcion_id?.toLowerCase().includes(term) ||
        equipo.tipo_equipo_nombre.toLowerCase().includes(term) ||
        equipo.marca_nombre.toLowerCase().includes(term) ||
        equipo.modelo.toLowerCase().includes(term);

      let matchDate = true;
      if (dateRange?.from && equipo.retiro_info) {
          const fechaRetiro = new Date(equipo.retiro_info.fecha_retiro + "T00:00:00");
          const from = dateRange.from;
          const to = dateRange.to ?? from;
          matchDate = fechaRetiro >= from && fechaRetiro <= to;
      } else if (dateRange?.from && !equipo.retiro_info) {
          matchDate = false;
      }

      return matchTerm && matchDate;
    });

    filteredEquipos.forEach(equipo => {
      const key = equipo.recepcion_id || 'sin-recepcion';
      if (!grouped[key]) {
        grouped[key] = {
          cliente_nombre: equipo.cliente_nombre,
          equipos: []
        };
      }
      grouped[key].equipos.push(equipo);
    });

    return grouped;
  }, [equipos, searchTerm, dateRange]);

  const handleOpenRetiro = (equipo: EquipoParaRetiro) => {
    setSelectedEquipo(equipo);
    setNombreRetira("");
    setCiRetira("");
    setPagoId("");
    setDiasGarantia(90);
    setNotasGarantia("La garantía cubre defectos de la reparación realizada y los repuestos instalados. No cubre daños por mal uso, sobretensión o problemas de software no relacionados.");
    setOpenRetiro(true);
  };
  
  const handleRegistrarRetiro = async () => {
    if (!selectedEquipo || !nombreRetira.trim() || !ciRetira.trim()) {
        toast({ variant: 'destructive', title: 'Error de Validación', description: 'El nombre y CI de quien retira son obligatorios.' });
        return;
    }

    const presupuestoAsociado = presupuestos.get(selectedEquipo.presupuesto_id);
    const montoCobrado = presupuestoAsociado?.estado === 'Aprobado' ? presupuestoAsociado.total : 0;
    
    if (montoCobrado > 0 && !pagoId.trim()){
        toast({ variant: 'destructive', title: 'Error de Validación', description: 'Se debe registrar el ID de pago para equipos reparados.' });
        return;
    }

    try {
        const batch = writeBatch(db);

        const equipoRef = doc(db, 'equipos_en_servicio', selectedEquipo.id);
        batch.update(equipoRef, { 
            estado: "Retirado",
            pago_id: pagoId || null
        });
        
        const retiroRef = doc(collection(db, 'retiros_equipo'));
        batch.set(retiroRef, {
            equipo_id: selectedEquipo.id,
            recepcion_id: selectedEquipo.recepcion_id,
            presupuesto_id: selectedEquipo.presupuesto_id,
            cliente_nombre: selectedEquipo.cliente_nombre,
            nombre_retira: nombreRetira.trim(),
            ci_retira: ciRetira.trim(),
            pago_id: pagoId || null,
            fecha_retiro: new Date().toISOString().split('T')[0],
            monto_cobrado: montoCobrado,
            usuario_id: "user-demo",
            fecha_creacion: serverTimestamp(),
        });

        if (selectedEquipo.motivo_retiro === 'Reparación Finalizada') {
            const garantiaRef = doc(collection(db, 'garantias_servicio'));
            const hoy = new Date();
            batch.set(garantiaRef, {
                equipo_id: selectedEquipo.id,
                recepcion_id: selectedEquipo.recepcion_id,
                cliente_nombre: selectedEquipo.cliente_nombre,
                equipo_info: `${selectedEquipo.tipo_equipo_nombre} ${selectedEquipo.marca_nombre} ${selectedEquipo.modelo}`,
                fecha_inicio: new Date().toISOString().split('T')[0],
                fecha_fin: addDays(hoy, diasGarantia).toISOString().split('T')[0],
                dias_validez: diasGarantia,
                notas: notasGarantia,
                items_cubiertos: selectedEquipo.trabajo_realizado?.items_cubiertos_garantia || [],
                estado: 'Activa',
                usuario_id: "user-demo",
            });
        }

        await batch.commit();
        
        toast({ title: "Retiro Registrado", description: "El equipo ha sido marcado como 'Retirado'."});
        setOpenRetiro(false);
        await fetchData();

    } catch (error) {
        console.error("Error registering pickup:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo registrar el retiro." });
    }
  };


  if (loading) return <p>Cargando equipos...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Retiro de Equipos</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Equipos Listos para Retiro</CardTitle>
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
                    {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })}</>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Filtrar por fecha de retiro</span>)}
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
             {Object.entries(groupedAndFilteredEquipos).map(([recepcionId, data]) => (
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
                        <TableHead>Equipo</TableHead>
                        <TableHead>Modelo</TableHead>
                        <TableHead>Motivo de Retiro</TableHead>
                        <TableHead className="text-right">Monto a Pagar</TableHead>
                        <TableHead className="w-[200px] text-center">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.equipos.map((equipo) => {
                        const presupuesto = presupuestos.get(equipo.presupuesto_id);
                        const montoAPagar = presupuesto?.estado === 'Aprobado' ? presupuesto.total : 0;
                        return (
                        <TableRow key={equipo.id}>
                          <TableCell className="font-medium">{`${equipo.tipo_equipo_nombre} ${equipo.marca_nombre}`}</TableCell>
                          <TableCell>{equipo.modelo}</TableCell>
                          <TableCell>
                            <Badge variant={equipo.motivo_retiro === 'Reparación Finalizada' ? 'default' : 'secondary'}>
                              {equipo.motivo_retiro}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{currencyFormatter.format(montoAPagar)}</TableCell>
                          <TableCell className="text-center">
                            {equipo.retiro_info ? (
                               <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className="cursor-help">
                                            <CheckCheck className="mr-2 h-4 w-4 text-green-500" />
                                            Retirado
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80">
                                        <div className="grid gap-4">
                                            <div className="space-y-2">
                                                <h4 className="font-medium leading-none">Información de Retiro</h4>
                                                <p className="text-sm text-muted-foreground">
                                                Este equipo ya fue retirado.
                                                </p>
                                            </div>
                                            <div className="grid gap-2 text-sm">
                                                <div className="grid grid-cols-3 items-center gap-4">
                                                    <span className="font-semibold">Fecha:</span>
                                                    <span className="col-span-2">{equipo.retiro_info.fecha_retiro}</span>
                                                </div>
                                                <div className="grid grid-cols-3 items-center gap-4">
                                                    <span className="font-semibold">Retirado por:</span>
                                                    <span className="col-span-2">{equipo.retiro_info.nombre_retira}</span>
                                                </div>
                                                 <div className="grid grid-cols-3 items-center gap-4">
                                                    <span className="font-semibold">Entregado por:</span>
                                                    <span className="col-span-2">{equipo.retiro_info.usuario_id}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            ) : (
                                <Button size="sm" onClick={() => handleOpenRetiro(equipo)}>
                                   <CheckCheck className="mr-2 h-4 w-4"/> Registrar Retiro
                                </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )})}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {Object.keys(groupedAndFilteredEquipos).length === 0 && (
            <p className="text-center text-muted-foreground py-10">
              No hay equipos pendientes de retiro que coincidan con los filtros.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={openRetiro} onOpenChange={setOpenRetiro}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                  <DialogTitle>Confirmar Retiro de Equipo</DialogTitle>
                  {selectedEquipo && (
                      <DialogDescription>
                        {`${selectedEquipo.tipo_equipo_nombre} ${selectedEquipo.marca_nombre} ${selectedEquipo.modelo}`}
                        <br/>
                        Cliente: <strong>{selectedEquipo.cliente_nombre}</strong>
                      </DialogDescription>
                  )}
              </DialogHeader>
              <ScrollArea className="flex-grow overflow-y-auto -mr-6 pr-6">
                <div className="py-4 space-y-6 px-1">
                    <div className="p-4 rounded-lg bg-secondary">
                        <Label>Monto Final a Pagar</Label>
                        <p className="text-2xl font-bold">{currencyFormatter.format(presupuestos.get(selectedEquipo?.presupuesto_id || '')?.estado === 'Aprobado' ? presupuestos.get(selectedEquipo?.presupuesto_id || '')?.total || 0 : 0)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="nombre_retira">Nombre de quien retira</Label>
                          <Input id="nombre_retira" value={nombreRetira} onChange={e => setNombreRetira(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="ci_retira">Nº de Cédula de Identidad</Label>
                          <Input id="ci_retira" value={ciRetira} onChange={e => setCiRetira(e.target.value)} />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="pago_id">ID de Pago (Opcional si no hay monto a pagar)</Label>
                      <Input id="pago_id" value={pagoId} onChange={e => setPagoId(e.target.value)} placeholder="Ej: ID de la transacción, Nro. de factura..."/>
                    </div>
                    
                    {selectedEquipo?.motivo_retiro === 'Reparación Finalizada' && (
                      <Card>
                          <CardHeader><CardTitle className="text-base">Configuración de Garantía</CardTitle></CardHeader>
                          <CardContent className="space-y-4">
                              <div className="space-y-2">
                                  <Label htmlFor="dias_garantia">Días de Garantía</Label>
                                  <Input id="dias_garantia" type="number" value={diasGarantia} onChange={e => setDiasGarantia(Number(e.target.value) || 0)} />
                              </div>
                              <div className="space-y-2">
                                  <Label>Ítems Cubiertos por la Garantía</Label>
                                  <div className="p-2 border rounded-md max-h-32 overflow-y-auto">
                                    <ul className="text-sm text-muted-foreground list-disc list-inside">
                                      {selectedEquipo?.trabajo_realizado?.items_cubiertos_garantia?.map(item => (
                                        <li key={item.id}>{item.nombre} (x{item.cantidad})</li>
                                      ))}
                                      {(selectedEquipo?.trabajo_realizado?.items_cubiertos_garantia?.length || 0) === 0 && (
                                          <li>No se marcaron ítems específicos para garantía.</li>
                                      )}
                                    </ul>
                                  </div>
                              </div>
                              <div className="space-y-2">
                                  <Label htmlFor="notas_garantia">Notas y Cobertura de la Garantía</Label>
                                  <Textarea id="notas_garantia" rows={4} value={notasGarantia} onChange={e => setNotasGarantia(e.target.value)} />
                              </div>
                          </CardContent>
                      </Card>
                    )}
                </div>
              </ScrollArea>
              <DialogFooter className="border-t pt-4 flex-shrink-0">
                  <Button variant="outline" onClick={() => setOpenRetiro(false)}>Cancelar</Button>
                  <Button onClick={handleRegistrarRetiro}>Confirmar Entrega y Registrar</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}
