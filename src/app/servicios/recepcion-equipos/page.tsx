
"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { collection, getDocs, addDoc, doc, serverTimestamp, query, orderBy, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, PlusCircle, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter as DialogFooterComponent, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// --- Types ---
type Cliente = { id: string; nombre: string; };
type TipoEquipo = { id: string; nombre: string; };
type Marca = { id: string; nombre: string; };

type EquipoRecepcionado = {
    id: string; // Will be generated when saving
    tipo_equipo_id: string;
    tipo_equipo_nombre: string;
    marca_id: string;
    marca_nombre: string;
    modelo: string;
    numero_serie?: string;
    problema_manifestado: string;
    accesorios?: string;
    estado: "Recibido";
};

type EquipoEnRecepcion = {
    id: string;
    tipo: string;
    marca: string;
    modelo: string;
    problema_manifestado: string; 
};

type Recepcion = {
  id: string;
  cliente_id: string;
  cliente_nombre: string;
  fecha_recepcion: string;
  equipos: EquipoEnRecepcion[];
  usuario_id: string;
  fecha_creacion: any;
};

// --- Main Component ---
export default function RecepcionEquiposPage() {
  const { toast } = useToast();
  const [recepciones, setRecepciones] = useState<Recepcion[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tiposEquipo, setTiposEquipo] = useState<TipoEquipo[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [openCreate, setOpenCreate] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [equipos, setEquipos] = useState<Partial<EquipoRecepcionado>[]>([]);
  
  // Details Dialog state
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedRecepcion, setSelectedRecepcion] = useState<Recepcion | null>(null);

  
  const fetchData = async () => {
    setLoading(true);
    try {
      const [recepcionesSnap, clientesSnap, tiposEquipoSnap, marcasSnap] = await Promise.all([
        getDocs(query(collection(db, 'recepciones'), orderBy("fecha_creacion", "desc"))),
        getDocs(query(collection(db, 'clientes'), orderBy("nombre"))),
        getDocs(query(collection(db, 'tipos_equipo'), orderBy("nombre"))),
        getDocs(query(collection(db, 'marcas'), orderBy("nombre")))
      ]);
      setRecepciones(recepcionesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recepcion)));
      setClientes(clientesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cliente)));
      setTiposEquipo(tiposEquipoSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TipoEquipo)));
      setMarcas(marcasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Marca)));
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddEquipo = () => {
    setEquipos(prev => [...prev, { problema_manifestado: '' }]);
  };

  const handleRemoveEquipo = (index: number) => {
    setEquipos(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleEquipoChange = (index: number, field: keyof EquipoRecepcionado, value: string) => {
    const newEquipos = [...equipos];
    const equipo = newEquipos[index];

    if (field === 'tipo_equipo_id') {
        const tipo = tiposEquipo.find(t => t.id === value);
        equipo.tipo_equipo_id = value;
        equipo.tipo_equipo_nombre = tipo?.nombre || '';
    } else if (field === 'marca_id') {
        const marca = marcas.find(m => m.id === value);
        equipo.marca_id = value;
        equipo.marca_nombre = marca?.nombre || '';
    } else {
        (equipo as any)[field] = value;
    }
    setEquipos(newEquipos);
  }

  const resetForm = () => {
    setSelectedClienteId('');
    setEquipos([]);
  };

  const handleCreateRecepcion = async () => {
    if (!selectedClienteId || equipos.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debe seleccionar un cliente y añadir al menos un equipo.' });
      return;
    }

    const isAnyEquipoInvalid = equipos.some(e => !e.tipo_equipo_id || !e.marca_id || !e.modelo || !e.problema_manifestado);
    if(isAnyEquipoInvalid) {
        toast({ variant: 'destructive', title: 'Error', description: 'Todos los campos de cada equipo son obligatorios.' });
        return;
    }

    const clienteSeleccionado = clientes.find(c => c.id === selectedClienteId);
    if (!clienteSeleccionado) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cliente no válido.' });
        return;
    }
    
    try {
        const batch = writeBatch(db);
        const equiposParaRecepcion: EquipoEnRecepcion[] = [];
        const hoy = new Date();

        // 1. Create individual equipment documents
        for (const equipo of equipos) {
            const equipoRef = doc(collection(db, "equipos_en_servicio"));
            batch.set(equipoRef, {
                ...equipo,
                cliente_id: selectedClienteId,
                cliente_nombre: clienteSeleccionado.nombre,
                fecha_recepcion: format(hoy, "yyyy-MM-dd"),
                estado: "Recibido",
                usuario_id: "user-demo",
                fecha_creacion: serverTimestamp(),
            });
            equiposParaRecepcion.push({
                id: equipoRef.id,
                tipo: equipo.tipo_equipo_nombre!,
                marca: equipo.marca_nombre!,
                modelo: equipo.modelo!,
                problema_manifestado: equipo.problema_manifestado!,
            });
        }
        
        // 2. Create the main reception document
        const recepcionRef = doc(collection(db, "recepciones"));
        batch.set(recepcionRef, {
            cliente_id: selectedClienteId,
            cliente_nombre: clienteSeleccionado.nombre,
            fecha_recepcion: format(hoy, "yyyy-MM-dd"),
            equipos: equiposParaRecepcion,
            usuario_id: "user-demo",
            fecha_creacion: serverTimestamp(),
        });
        
        await batch.commit();

        toast({ title: 'Recepción Registrada', description: 'Los equipos han sido registrados y están listos para diagnóstico.' });
        setOpenCreate(false);
        await fetchData();
    } catch (e) {
        console.error("Error creating reception:", e);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo registrar la recepción.' });
    }
  };
  
  const handleOpenDetails = (recepcion: Recepcion) => {
    setSelectedRecepcion(recepcion);
    setOpenDetails(true);
  };

  useEffect(() => {
    if (!openCreate) resetForm();
  }, [openCreate]);


  if (loading) return <p>Cargando datos...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Recepción de Equipos para Servicio</h1>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" />Registrar Recepción</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Registrar Nueva Recepción de Equipos</DialogTitle>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto pr-2 -mr-2">
              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="cliente">Cliente</Label>
                  <Combobox
                    options={clientes.map(c => ({ value: c.id, label: c.nombre }))}
                    value={selectedClienteId}
                    onChange={setSelectedClienteId}
                    placeholder="Seleccione un cliente"
                    searchPlaceholder="Buscar cliente..."
                  />
                </div>
                
                <Separator />
                
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Equipos Recibidos</h3>
                    <Button variant="outline" size="sm" onClick={handleAddEquipo}>
                        <PlusCircle className="mr-2 h-4 w-4" />Añadir Equipo
                    </Button>
                </div>

                <ScrollArea className="h-[45vh]">
                    <div className="space-y-6 p-1">
                        {equipos.map((equipo, index) => (
                          <Card key={index} className="relative">
                            <CardHeader>
                                <CardTitle>Equipo #{index + 1}</CardTitle>
                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-red-500 hover:text-red-500" onClick={() => handleRemoveEquipo(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Tipo de Equipo</Label>
                                <Combobox options={tiposEquipo.map(t => ({value: t.id, label: t.nombre}))} value={equipo.tipo_equipo_id || ''} onChange={(val) => handleEquipoChange(index, 'tipo_equipo_id', val)} />
                              </div>
                              <div className="space-y-2">
                                <Label>Marca</Label>
                                <Combobox options={marcas.map(m => ({value: m.id, label: m.nombre}))} value={equipo.marca_id || ''} onChange={(val) => handleEquipoChange(index, 'marca_id', val)} />
                              </div>
                              <div className="space-y-2">
                                <Label>Modelo</Label>
                                <Input value={equipo.modelo || ''} onChange={(e) => handleEquipoChange(index, 'modelo', e.target.value)} />
                              </div>
                               <div className="space-y-2">
                                <Label>Número de Serie (Opcional)</Label>
                                <Input value={equipo.numero_serie || ''} onChange={(e) => handleEquipoChange(index, 'numero_serie', e.target.value)} />
                              </div>
                               <div className="md:col-span-2 space-y-2">
                                <Label>Problema Manifestado por el Cliente</Label>
                                <Textarea value={equipo.problema_manifestado || ''} onChange={(e) => handleEquipoChange(index, 'problema_manifestado', e.target.value)} />
                              </div>
                              <div className="md:col-span-2 space-y-2">
                                <Label>Accesorios (Opcional)</Label>
                                <Input value={equipo.accesorios || ''} onChange={(e) => handleEquipoChange(index, 'accesorios', e.target.value)} placeholder="Ej: Cargador, cable, estuche..." />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                </ScrollArea>
                {equipos.length === 0 && <p className="text-center text-muted-foreground p-4">Añada al menos un equipo.</p>}

              </div>
            </div>
            <DialogFooterComponent className="border-t pt-4">
              <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
              <Button onClick={handleCreateRecepcion}>Confirmar Recepción</Button>
            </DialogFooterComponent>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Recepciones</CardTitle>
          <CardDescription>Registro de todas las recepciones de equipos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Recepción</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Equipos</TableHead>
                <TableHead>Registrado por</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recepciones.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.id.substring(0, 7)}</TableCell>
                  <TableCell>{r.fecha_recepcion}</TableCell>
                  <TableCell>{r.cliente_nombre}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{r.equipos.length}</Badge>
                  </TableCell>
                  <TableCell>{r.usuario_id}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDetails(r)}>Ver Detalles</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {recepciones.length === 0 && <p className="text-center text-muted-foreground mt-4">No hay recepciones registradas.</p>}
        </CardContent>
      </Card>

        <Dialog open={openDetails} onOpenChange={setOpenDetails}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>Detalles de la Recepción: {selectedRecepcion?.id.substring(0, 7)}</DialogTitle>
                <DialogDescription>
                    Información detallada de la recepción y los equipos asociados.
                </DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto pr-6 -mr-6">
                {selectedRecepcion && (
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div><p className="font-semibold">Cliente:</p><p>{selectedRecepcion.cliente_nombre}</p></div>
                        <div><p className="font-semibold">Fecha de Recepción:</p><p>{selectedRecepcion.fecha_recepcion}</p></div>
                        <div><p className="font-semibold">ID Recepción:</p><p>{selectedRecepcion.id}</p></div>
                        <div><p className="font-semibold">Registrado por:</p><p>{selectedRecepcion.usuario_id}</p></div>
                    </div>

                    <Card>
                        <CardHeader><CardTitle>Equipos en esta Recepción</CardTitle></CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[40vh]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Marca</TableHead>
                                            <TableHead>Modelo</TableHead>
                                            <TableHead>Problema Manifestado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedRecepcion.equipos.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{item.tipo}</TableCell>
                                                <TableCell>{item.marca}</TableCell>
                                                <TableCell>{item.modelo}</TableCell>
                                                <TableCell className="max-w-[200px] truncate">{item.problema_manifestado}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            )}
            </div>
            <DialogFooterComponent className="border-t pt-4">
                <Button variant="outline" onClick={() => setOpenDetails(false)}>Cerrar</Button>
            </DialogFooterComponent>
            </DialogContent>
        </Dialog>
    </>
  );
}
