
"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { collection, getDocs, doc, updateDoc, serverTimestamp, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PenSquare, FileWarning } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter as DialogFooterComponent, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Combobox } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- Types ---
type EquipoEnServicio = {
  id: string;
  cliente_nombre: string;
  fecha_recepcion: string;
  tipo_equipo_nombre: string;
  marca_nombre: string;
  modelo: string;
  problema_manifestado: string;
  estado: "Recibido" | "Diagnosticado" | "Presupuestado" | "En Reparación" | "Reparado" | "Retirado";
  recepcion_id: string;
  diagnostico_tecnico?: string;
  trabajos_a_realizar?: string;
  fecha_diagnostico?: string;
  tecnico_id?: string;
  tecnico_nombre?: string;
  usuario_id?: string;
  fecha_creacion?: any;
  origen_garantia_id?: string;
};

type Recepcion = {
  id: string;
  cliente_nombre: string;
  fecha_recepcion: string;
}

type PresupuestoServicio = {
    id: string;
    equipo_id: string;
    estado: 'Pendiente de Aprobación' | 'Aprobado' | 'Rechazado';
}

type Tecnico = {
    id: string;
    nombre_apellido: string;
}

type GroupedEquipos = {
  [key: string]: {
    cliente_nombre: string;
    fecha_recepcion: string;
    equipos: EquipoEnServicio[];
  }
}

// --- Main Component ---
export default function DiagnosticoPage() {
  const { toast } = useToast();
  const [equipos, setEquipos] = useState<EquipoEnServicio[]>([]);
  const [recepciones, setRecepciones] = useState<Recepcion[]>([]);
  const [presupuestos, setPresupuestos] = useState<PresupuestoServicio[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog state
  const [openDiagnostico, setOpenDiagnostico] = useState(false);
  const [selectedEquipo, setSelectedEquipo] = useState<EquipoEnServicio | null>(null);
  const [diagnosticoTecnico, setDiagnosticoTecnico] = useState("");
  const [trabajosARealizar, setTrabajosARealizar] = useState("");
  const [selectedTecnicoId, setSelectedTecnicoId] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [equiposSnap, recepcionesSnap, presupuestosSnap, tecnicosSnap] = await Promise.all([
        getDocs(query(collection(db, 'equipos_en_servicio'))),
        getDocs(query(collection(db, 'recepciones'), orderBy("fecha_creacion", "desc"))),
        getDocs(collection(db, 'presupuestos_servicio')),
        getDocs(query(collection(db, 'tecnicos'), orderBy("nombre_apellido")))
      ]);

      const equiposList = equiposSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as EquipoEnServicio));
      setEquipos(equiposList);

      const recepcionesList = recepcionesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recepcion));
      setRecepciones(recepcionesList);
      
      const presupuestosList = presupuestosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PresupuestoServicio));
      setPresupuestos(presupuestosList);
      
      const tecnicosList = tecnicosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tecnico));
      setTecnicos(tecnicosList);


    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los equipos pendientes de diagnóstico." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [toast]);
  
  const presupuestosMap = useMemo(() => {
    return new Map(presupuestos.map(p => [p.equipo_id, p]));
  }, [presupuestos]);

  const groupedAndFilteredEquipos = useMemo(() => {
    const recepcionesMap = new Map(recepciones.map(r => [r.id, r]));

    const grouped: GroupedEquipos = {};

    equipos.forEach(equipo => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = !term ||
        equipo.cliente_nombre.toLowerCase().includes(term) ||
        equipo.recepcion_id?.toLowerCase().includes(term) ||
        equipo.tipo_equipo_nombre.toLowerCase().includes(term) ||
        equipo.marca_nombre.toLowerCase().includes(term) ||
        equipo.modelo.toLowerCase().includes(term);

      if (matchesSearch && equipo.recepcion_id) {
        const key = equipo.recepcion_id;
        if (!grouped[key]) {
          const recepcionData = recepcionesMap.get(key);
          grouped[key] = {
            cliente_nombre: recepcionData?.cliente_nombre || equipo.cliente_nombre,
            fecha_recepcion: recepcionData?.fecha_recepcion || equipo.fecha_recepcion,
            equipos: []
          };
        }
        grouped[key].equipos.push(equipo);
      }
    });

    return Object.entries(grouped)
        .sort(([keyA, valA], [keyB, valB]) => new Date(valB.fecha_recepcion).getTime() - new Date(valA.fecha_recepcion).getTime())
        .reduce((acc, [key, val]) => ({...acc, [key]: val}), {});
        
  }, [equipos, searchTerm, recepciones]);

  
  const handleOpenDiagnostico = (equipo: EquipoEnServicio) => {
      setSelectedEquipo(equipo);
      setDiagnosticoTecnico(equipo.diagnostico_tecnico || '');
      setTrabajosARealizar(equipo.trabajos_a_realizar || '');
      setSelectedTecnicoId(equipo.tecnico_id || '');
      setOpenDiagnostico(true);
  };
  
  const resetForm = () => {
      setSelectedEquipo(null);
      setDiagnosticoTecnico('');
      setTrabajosARealizar('');
      setSelectedTecnicoId('');
  }

  useEffect(() => {
      if(!openDiagnostico) resetForm();
  }, [openDiagnostico]);

  const handleSaveDiagnostico = async () => {
      if (!selectedEquipo || !diagnosticoTecnico.trim() || !trabajosARealizar.trim() || !selectedTecnicoId) {
          toast({ variant: 'destructive', title: 'Error de Validación', description: 'El diagnóstico, los trabajos a realizar y el técnico son obligatorios.' });
          return;
      }
      
      try {
          const equipoRef = doc(db, 'equipos_en_servicio', selectedEquipo.id);
          const isNewDiagnosis = selectedEquipo.estado === 'Recibido';
          const tecnicoSeleccionado = tecnicos.find(t => t.id === selectedTecnicoId);

          await updateDoc(equipoRef, {
              estado: "Diagnosticado",
              diagnostico_tecnico: diagnosticoTecnico.trim(),
              trabajos_a_realizar: trabajosARealizar.trim(),
              fecha_diagnostico: selectedEquipo.fecha_diagnostico || format(new Date(), "yyyy-MM-dd"),
              tecnico_id: selectedTecnicoId,
              tecnico_nombre: tecnicoSeleccionado?.nombre_apellido || 'N/A',
              usuario_id: 'user-demo' // Hardcoded user
          });
          
          toast({ title: "Diagnóstico Guardado", description: `El diagnóstico ha sido ${isNewDiagnosis ? 'registrado' : 'actualizado'} exitosamente.`});
          setOpenDiagnostico(false);
          await fetchData();
          
      } catch (error) {
           console.error("Error saving diagnosis:", error);
           toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el diagnóstico." });
      }
  };

  const renderActionButton = (equipo: EquipoEnServicio) => {
    const presupuestoAsociado = presupuestosMap.get(equipo.id);

    if (equipo.estado === 'Recibido') {
      return <Button variant="default" size="sm" onClick={() => handleOpenDiagnostico(equipo)}><PenSquare className="mr-2 h-4 w-4"/>Diagnosticar</Button>;
    }
    
    if (equipo.estado === 'Diagnosticado' && !presupuestoAsociado) {
      return <Button variant="secondary" size="sm" onClick={() => handleOpenDiagnostico(equipo)}><PenSquare className="mr-2 h-4 w-4"/>Editar Diagnóstico</Button>;
    }

    if (presupuestoAsociado) {
       switch (presupuestoAsociado.estado) {
         case 'Pendiente de Aprobación':
            return <Button variant="outline" size="sm" disabled>Presupuestado</Button>;
         case 'Rechazado':
             return <Button variant="destructive" size="sm" disabled>Presupuestado (Rechazado)</Button>;
         case 'Aprobado':
             if (equipo.estado === 'Reparado') {
                return <Button variant="default" size="sm" disabled>Reparado</Button>;
             }
             return <Button variant="outline" size="sm" disabled>En Reparación</Button>;
       }
    }

    // Fallback for any other states
    return <Button variant="outline" size="sm" disabled>{equipo.estado}</Button>;
  };

  if (loading) return <p>Cargando equipos...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Diagnóstico de Equipos</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recepciones con Equipos</CardTitle>
          <CardDescription>
              Listado completo de todos los equipos ingresados. Utilice el buscador para filtrar.
              <Input
                placeholder="Buscar por cliente, ID de recepción, tipo, marca o modelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-2"
              />
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
                    <span className="text-muted-foreground">Fecha: {data.fecha_recepcion}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Equipo</TableHead>
                        <TableHead>Problema Manifestado</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Registrado por</TableHead>
                        <TableHead className="w-[180px]">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.equipos.map((equipo) => (
                        <TableRow key={equipo.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                                <span>{`${equipo.tipo_equipo_nombre} ${equipo.marca_nombre} ${equipo.modelo}`}</span>
                                {equipo.origen_garantia_id && <Badge variant="destructive"><FileWarning className="h-3 w-3 mr-1"/>Reclamo</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">{equipo.problema_manifestado}</TableCell>
                          <TableCell>
                            {equipo.diagnostico_tecnico ? (
                                <Popover>
                                <PopoverTrigger asChild>
                                    <Badge variant='default' className="cursor-pointer">Diagnosticado</Badge>
                                </PopoverTrigger>
                                <PopoverContent className="w-96">
                                    <div className="grid gap-4">
                                        <div className="space-y-2">
                                            <h4 className="font-medium leading-none">Diagnóstico Técnico</h4>
                                            <p className="text-sm text-muted-foreground">{equipo.diagnostico_tecnico}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="font-medium leading-none">Técnico</h4>
                                            <p className="text-sm text-muted-foreground">{equipo.tecnico_nombre || "No asignado"}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="font-medium leading-none">Trabajos a Realizar</h4>
                                            <p className="text-sm text-muted-foreground">{equipo.trabajos_a_realizar}</p>
                                        </div>
                                    </div>
                                </PopoverContent>
                                </Popover>
                            ) : (
                                <Badge variant='secondary'>
                                    {equipo.estado}
                                </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{equipo.usuario_id || 'N/A'}</TableCell>
                          <TableCell>
                            {renderActionButton(equipo)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {Object.keys(groupedAndFilteredEquipos).length === 0 && <p className="text-center text-muted-foreground mt-4">No hay equipos que coincidan con la búsqueda.</p>}
        </CardContent>
      </Card>
      
      <Dialog open={openDiagnostico} onOpenChange={setOpenDiagnostico}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                  <DialogTitle>Registrar Diagnóstico Técnico</DialogTitle>
                  {selectedEquipo && (
                    <DialogDescription>
                        <div className="flex items-center gap-2">
                            <span>{`${selectedEquipo.tipo_equipo_nombre} ${selectedEquipo.marca_nombre} ${selectedEquipo.modelo} - Cliente: ${selectedEquipo.cliente_nombre}`}</span>
                            {selectedEquipo.origen_garantia_id && <Badge variant="destructive"><FileWarning className="h-3 w-3 mr-1"/>Reclamo de Garantía</Badge>}
                        </div>
                    </DialogDescription>
                  )}
              </DialogHeader>
              <ScrollArea className="flex-grow overflow-y-auto -mr-6 pr-6">
                <div className="py-4 space-y-4 px-1">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Problema Manifestado por el Cliente</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{selectedEquipo?.problema_manifestado}</p>
                        </CardContent>
                    </Card>
                    <div className="space-y-2">
                        <Label htmlFor="tecnico">Técnico Responsable</Label>
                        <Combobox
                          options={tecnicos.map(t => ({value: t.id, label: t.nombre_apellido}))}
                          value={selectedTecnicoId}
                          onChange={setSelectedTecnicoId}
                          placeholder="Seleccione un técnico"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="diagnostico-tecnico">Diagnóstico Técnico</Label>
                        <Textarea 
                            id="diagnostico-tecnico" 
                            rows={5}
                            value={diagnosticoTecnico} 
                            onChange={e => setDiagnosticoTecnico(e.target.value)}
                            placeholder="Describa la falla encontrada, los componentes afectados y la causa raíz del problema."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="trabajos-realizar">Trabajos a Realizar</Label>
                        <Textarea 
                            id="trabajos-realizar" 
                            rows={5}
                            value={trabajosARealizar} 
                            onChange={e => setTrabajosARealizar(e.target.value)}
                            placeholder="Describa los pasos y reparaciones recomendadas para solucionar el problema."
                        />
                    </div>
                </div>
              </ScrollArea>
              <DialogFooterComponent className="border-t pt-4 flex-shrink-0">
                  <Button variant="outline" onClick={() => setOpenDiagnostico(false)}>Cancelar</Button>
                  <Button onClick={handleSaveDiagnostico}>Guardar Diagnóstico</Button>
              </DialogFooterComponent>
          </DialogContent>
      </Dialog>
    </>
  );
}
