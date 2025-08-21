
"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { collection, getDocs, doc, updateDoc, serverTimestamp, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, PlusCircle, PenSquare } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter as DialogFooterComponent, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
  // Campos a agregar en el diagnóstico
  diagnostico_tecnico?: string;
  trabajos_a_realizar?: string;
  fecha_diagnostico?: string;
  tecnico_id?: string;
};

// --- Main Component ---
export default function DiagnosticoPage() {
  const { toast } = useToast();
  const [equipos, setEquipos] = useState<EquipoEnServicio[]>([]);
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
      const q = query(
        collection(db, 'equipos_en_servicio'),
        orderBy("fecha_recepcion", "asc")
      );
      const equiposSnapshot = await getDocs(q);
      const equiposList = equiposSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EquipoEnServicio));
      // Filter for "Recibido" status on the client side to avoid composite index requirement
      setEquipos(equiposList.filter(e => e.estado === "Recibido"));
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

  const filteredEquipos = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return equipos.filter(e =>
      e.cliente_nombre.toLowerCase().includes(term) ||
      e.tipo_equipo_nombre.toLowerCase().includes(term) ||
      e.marca_nombre.toLowerCase().includes(term) ||
      e.modelo.toLowerCase().includes(term)
    );
  }, [equipos, searchTerm]);
  
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
          await updateDoc(equipoRef, {
              estado: "Diagnosticado",
              diagnostico_tecnico: diagnosticoTecnico.trim(),
              trabajos_a_realizar: trabajosARealizar.trim(),
              fecha_diagnostico: format(new Date(), "yyyy-MM-dd"),
              // tecnico_id: "hardcoded_technician" // TODO: Add technician selection
          });
          
          toast({ title: "Diagnóstico Guardado", description: "El equipo ha sido actualizado y está listo para presupuestar."});
          setOpenDiagnostico(false);
          await fetchData(); // Refresh data to remove diagnosed item from list
          
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
          <CardTitle>Equipos Pendientes de Diagnóstico</CardTitle>
          <CardDescription>
              <Input
                placeholder="Buscar por cliente, tipo, marca o modelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-2"
              />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha Recepción</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead>Problema Manifestado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEquipos.map((equipo) => (
                <TableRow key={equipo.id}>
                  <TableCell>{equipo.fecha_recepcion}</TableCell>
                  <TableCell className="font-medium">{equipo.cliente_nombre}</TableCell>
                  <TableCell>{`${equipo.tipo_equipo_nombre} ${equipo.marca_nombre} ${equipo.modelo}`}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{equipo.problema_manifestado}</TableCell>
                  <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleOpenDiagnostico(equipo)}>
                          <PenSquare className="mr-2 h-4 w-4"/>
                          Diagnosticar
                      </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredEquipos.length === 0 && <p className="text-center text-muted-foreground mt-4">No hay equipos pendientes de diagnóstico.</p>}
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
