
"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, orderBy, where, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

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
};

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
  const [selectedTrabajo, setSelectedTrabajo] = useState<TrabajoRealizado | null>(null);
  const [openDetails, setOpenDetails] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const trabajosSnap = await getDocs(query(collection(db, 'trabajos_realizados'), orderBy("fecha_creacion", "desc")));
      setTrabajos(trabajosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrabajoRealizado)));
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

  const handleOpenDetails = (trabajo: TrabajoRealizado) => {
    setSelectedTrabajo(trabajo);
    setOpenDetails(true);
  };
  
  const calcularTotalItems = (items: ItemPresupuesto[]) => {
      return items.reduce((acc, item) => acc + (item.cantidad * item.precio_unitario), 0);
  }

  if (loading) return <p>Cargando historial de trabajos...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Historial de Trabajos Realizados</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trabajos Completados</CardTitle>
          <CardDescription>Registro de todas las reparaciones finalizadas por los técnicos.</CardDescription>
        </CardHeader>
        <CardContent>
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
              {trabajos.map((trabajo) => (
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
          {trabajos.length === 0 && (
            <p className="text-center text-muted-foreground py-10">
              No hay trabajos realizados registrados.
            </p>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={openDetails} onOpenChange={setOpenDetails}>
          <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                  <DialogTitle>Detalles del Trabajo Realizado (OT: {selectedTrabajo?.orden_trabajo_id.substring(0, 7)})</DialogTitle>
              </DialogHeader>
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
              <DialogFooter className="border-t pt-4 flex justify-between items-center w-full">
                  <div className="font-bold text-lg">Costo Total del Trabajo: {currencyFormatter.format(selectedTrabajo?.costo_total_trabajo || 0)}</div>
                  <Button variant="outline" onClick={() => setOpenDetails(false)}>Cerrar</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}
