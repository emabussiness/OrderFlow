
"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { collection, getDocs, doc, updateDoc, serverTimestamp, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PenSquare } from "lucide-react";
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
  fecha_creacion?: any;
};

type Recepcion = {
  id: string;
  cliente_nombre: string;
  fecha_recepcion: string;
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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog state
  const [openDiagnostico, setOpenDiagnostico] = useState(false);
  const [selectedEquipo, setSelectedEquipo] = useState<EquipoEnServicio | null>(null);
  const [diagnosticoTecnico, setDiagnosticoTecnico] = useState("");
  const [trabajosARealizar, setTrabajosARealizar] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const qEquipos = query(
        collection(db, 'equipos_en_servicio'),
        where("estado", "in", ["Recibido", "Diagnosticado"])
      );
      const equiposSnapshot = await getDocs(qEquipos);
      const equiposList = equiposSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EquipoEnServicio));
      setEquipos(equiposList);

      const recepcionesSnapshot = await getDocs(query(collection(db, 'recepciones'), orderBy("fecha_creacion", "desc")));
      const recepcionesList = recepcionesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recepcion));
      setRecepciones(recepcionesList);


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
      setOpenDiagnostico(true);
  };
  
  const resetForm = () => {
      setSelectedEquipo(null);
      setDiagnosticoTecnico('');
      setTrabajosARealizar('');
  }

  useEffect(() => {
      if(!openDiagnostico) resetForm();
  }, [openDiagnostico]);

  const handleSaveDiagnostico = async () => {
      if (!selectedEquipo || !diagnosticoTecnico.trim() || !trabajosARealizar.trim()) {
          toast({ variant: 'destructive', title: 'Error de Validación', description: 'El diagnóstico y los trabajos a realizar son obligatorios.' });
          return;
      }
      
      try {
          const equipoRef = doc(db, 'equipos_en_servicio', selectedEquipo.id);
          const isNewDiagnosis = selectedEquipo.estado === 'Recibido';

          await updateDoc(equipoRef, {
              estado: "Diagnosticado",
              diagnostico_tecnico: diagnosticoTecnico.trim(),
              trabajos_a_realizar: trabajosARealizar.trim(),
              fecha_diagnostico: selectedEquipo.fecha_diagnostico || format(new Date(), "yyyy-MM-dd"),
              // tecnico_id: "hardcoded_technician" // TODO: Add technician selection
          });
          
          toast({ title: "Diagnóstico Guardado", description: `El diagnóstico ha sido ${isNewDiagnosis ? 'registrado' : 'actualizado'} exitosamente.`});
          setOpenDiagnostico(false);
          await fetchData();
          
      } catch (error) {
           console.error("Error saving diagnosis:", error);
           toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el diagnóstico." });
      }
  };

  if (loading) return <p>Cargando equipos pendientes...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Diagnóstico de Equipos</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recepciones con Equipos Pendientes</CardTitle>
          <CardDescription>
              Equipos en estado "Recibido" o "Diagnosticado" que están pendientes de acción.
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
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.equipos.map((equipo) => (
                        <TableRow key={equipo.id}>
                          <TableCell>{`${equipo.tipo_equipo_nombre} ${equipo.marca_nombre} ${equipo.modelo}`}</TableCell>
                          <TableCell className="max-w-[300px] truncate">{equipo.problema_manifestado}</TableCell>
                          <TableCell>
                            <Badge variant={equipo.estado === 'Diagnosticado' ? 'default' : 'secondary'}>
                              {equipo.estado}
                            </Badge>
                          </TableCell>
                          <TableCell>
                              <Button variant="outline" size="sm" onClick={() => handleOpenDiagnostico(equipo)}>
                                  <PenSquare className="mr-2 h-4 w-4"/>
                                  {equipo.estado === 'Diagnosticado' ? 'Editar' : 'Diagnosticar'}
                              </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {Object.keys(groupedAndFilteredEquipos).length === 0 && <p className="text-center text-muted-foreground mt-4">No hay equipos pendientes de diagnóstico.</p>}
        </CardContent>
      </Card>
      
      <Dialog open={openDiagnostico} onOpenChange={setOpenDiagnostico}>
          <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                  <DialogTitle>Registrar Diagnóstico Técnico</DialogTitle>
                  {selectedEquipo && (
                    <DialogDescription>
                        {`${selectedEquipo.tipo_equipo_nombre} ${selectedEquipo.marca_nombre} ${selectedEquipo.modelo} - Cliente: ${selectedEquipo.cliente_nombre}`}
                    </DialogDescription>
                  )}
              </DialogHeader>
              <div className="py-4 space-y-4">
                  <Card>
                      <CardHeader className="pb-2">
                          <CardTitle className="text-base">Problema Manifestado por el Cliente</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <p className="text-sm text-muted-foreground">{selectedEquipo?.problema_manifestado}</p>
                      </CardContent>
                  </Card>
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
              <DialogFooterComponent>
                  <Button variant="outline" onClick={() => setOpenDiagnostico(false)}>Cancelar</Button>
                  <Button onClick={handleSaveDiagnostico}>Guardar Diagnóstico</Button>
              </DialogFooterComponent>
          </DialogContent>
      </Dialog>
    </>
  );
}
