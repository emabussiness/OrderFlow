
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { collection, getDocs, query, where, doc, writeBatch, serverTimestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilePlus2, PlusCircle, Trash2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Combobox } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

// --- Types ---
type EquipoDiagnosticado = {
  id: string;
  cliente_nombre: string;
  fecha_recepcion: string;
  fecha_diagnostico?: string;
  tipo_equipo_nombre: string;
  marca_nombre: string;
  modelo: string;
  problema_manifestado: string;
  diagnostico_tecnico?: string;
  trabajos_a_realizar?: string;
  estado: "Recibido" | "Diagnosticado" | "Presupuestado" | "En Reparación" | "Reparado" | "Retirado";
  recepcion_id: string;
};

type PresupuestoServicio = {
    id: string;
    equipo_id: string;
    // ... otros campos
}

type GroupedEquipos = {
  [key: string]: {
    cliente_nombre: string;
    fecha_recepcion: string;
    equipos: EquipoDiagnosticado[];
  }
}

type Producto = { id: string; nombre: string; precio_referencia: number; };
type Servicio = { id: string; nombre: string; precio: number; };

type ItemPresupuesto = {
  id: string; // Puede ser producto_id o servicio_id
  nombre: string;
  tipo: 'Repuesto' | 'Mano de Obra';
  cantidad: number;
  precio_unitario: number;
};

const currencyFormatter = new Intl.NumberFormat('es-PY', {
  style: 'currency',
  currency: 'PYG',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});


// --- Main Component ---
export default function PresupuestoServicioPage() {
  const { toast } = useToast();
  const [equipos, setEquipos] = useState<EquipoDiagnosticado[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [presupuestos, setPresupuestos] = useState<PresupuestoServicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog State
  const [openPresupuesto, setOpenPresupuesto] = useState(false);
  const [selectedEquipo, setSelectedEquipo] = useState<EquipoDiagnosticado | null>(null);
  const [itemsPresupuesto, setItemsPresupuesto] = useState<ItemPresupuesto[]>([]);
  const [observaciones, setObservaciones] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [equiposSnap, productosSnap, serviciosSnap, presupuestosSnap] = await Promise.all([
        getDocs(query(collection(db, 'equipos_en_servicio'), where("estado", "==", "Diagnosticado"))),
        getDocs(query(collection(db, 'productos'), orderBy("nombre"))),
        getDocs(query(collection(db, 'servicios'), orderBy("nombre"))),
        getDocs(collection(db, 'presupuestos_servicio'))
      ]);
      
      const equiposList = equiposSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as EquipoDiagnosticado));
      setEquipos(equiposList);
      setProductos(productosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Producto)));
      setServicios(serviciosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Servicio)));
      setPresupuestos(presupuestosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PresupuestoServicio)));

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos necesarios." });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const equiposYaPresupuestados = useMemo(() => {
    return new Set(presupuestos.map(p => p.equipo_id));
  }, [presupuestos]);

  const groupedAndFilteredEquipos = useMemo(() => {
    const grouped: GroupedEquipos = {};

    const sortedEquipos = [...equipos].sort((a, b) => 
        new Date(b.fecha_diagnostico || 0).getTime() - new Date(a.fecha_diagnostico || 0).getTime()
    );

    sortedEquipos.forEach(equipo => {
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
          grouped[key] = {
            cliente_nombre: equipo.cliente_nombre,
            fecha_recepcion: equipo.fecha_recepcion,
            equipos: []
          };
        }
        grouped[key].equipos.push(equipo);
      }
    });

    return Object.entries(grouped)
        .sort(([, valA], [, valB]) => new Date(valB.fecha_recepcion).getTime() - new Date(valA.fecha_recepcion).getTime())
        .reduce((acc, [key, val]) => ({...acc, [key]: val}), {});

  }, [equipos, searchTerm]);

  const handleOpenPresupuesto = (equipo: EquipoDiagnosticado) => {
    setSelectedEquipo(equipo);
    setOpenPresupuesto(true);
  }
  
  const resetDialog = () => {
      setSelectedEquipo(null);
      setItemsPresupuesto([]);
      setObservaciones('');
  }
  
  useEffect(() => {
      if(!openPresupuesto) resetDialog();
  }, [openPresupuesto]);

  const handleAddItem = (type: 'Repuesto' | 'Mano de Obra') => {
      const newItem: ItemPresupuesto = {
        id: '',
        nombre: '',
        tipo: type,
        cantidad: 1,
        precio_unitario: 0,
      };
      
      setItemsPresupuesto(prev => [...prev, newItem]);
  };
  
  const handleItemChange = (index: number, field: keyof ItemPresupuesto, value: any) => {
      const newItems = [...itemsPresupuesto];
      const currentItem = newItems[index];

      if (field === 'id') {
          const list = currentItem.tipo === 'Repuesto' ? productos : servicios;
          const selectedItem = list.find(p => p.id === value);

           if (newItems.some(item => item.id === value && item.tipo === currentItem.tipo)) {
              toast({ variant: 'destructive', description: `El ítem "${selectedItem?.nombre}" ya está en la lista.` });
              return;
           }

          if (selectedItem) {
              currentItem.id = selectedItem.id;
              currentItem.nombre = selectedItem.nombre;
              currentItem.precio_unitario = (selectedItem as any).precio_referencia || (selectedItem as any).precio || 0;
          }
      } else if (field === 'cantidad' || field === 'precio_unitario') {
          (currentItem as any)[field] = Number(value) < 0 ? 0 : Number(value);
      }
      
      setItemsPresupuesto(newItems);
  };

  const handleRemoveItem = (index: number) => {
      setItemsPresupuesto(prev => prev.filter((_, i) => i !== index));
  }

  const totalPresupuesto = useMemo(() => {
      return itemsPresupuesto.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
  }, [itemsPresupuesto]);
  
  const handleSavePresupuesto = async () => {
    if (!selectedEquipo || itemsPresupuesto.length === 0 || itemsPresupuesto.some(i => !i.id)) {
        toast({ variant: 'destructive', description: 'Debe añadir al menos un ítem y seleccionar un producto/servicio válido para cada uno.' });
        return;
    }

    try {
        const batch = writeBatch(db);

        // 1. Create Presupuesto document
        const presupuestoRef = doc(collection(db, 'presupuestos_servicio'));
        batch.set(presupuestoRef, {
            equipo_id: selectedEquipo.id,
            recepcion_id: selectedEquipo.recepcion_id,
            cliente_nombre: selectedEquipo.cliente_nombre,
            fecha_presupuesto: new Date().toISOString().split('T')[0],
            items: itemsPresupuesto,
            total: totalPresupuesto,
            estado: 'Pendiente de Aprobación',
            observaciones,
            usuario_id: 'user-demo',
            fecha_creacion: serverTimestamp(),
        });
        
        await batch.commit();
        
        toast({ title: "Presupuesto Guardado", description: "El presupuesto ha sido creado y está pendiente de aprobación."});
        setOpenPresupuesto(false);
        await fetchData();

    } catch (error) {
        console.error("Error saving presupuesto:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el presupuesto.' });
    }
  };


  if (loading) return <p>Cargando equipos diagnosticados...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Presupuestos de Servicio</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Equipos Pendientes de Presupuesto</CardTitle>
          <CardDescription>
            Equipos diagnosticados listos para generar un presupuesto de reparación.
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
                        <TableHead>Fecha Diag.</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.equipos.map((equipo) => {
                        const presupuestoExistente = equiposYaPresupuestados.has(equipo.id);
                        return (
                        <TableRow key={equipo.id}>
                           <TableCell>{`${equipo.tipo_equipo_nombre} ${equipo.marca_nombre} ${equipo.modelo}`}</TableCell>
                           <TableCell>{equipo.fecha_diagnostico}</TableCell>
                           <TableCell>
                                <Popover>
                                  <PopoverTrigger asChild>
                                      <Badge variant="secondary" className="cursor-pointer">{equipo.estado}</Badge>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-96">
                                    <div className="grid gap-4">
                                      <div className="space-y-2">
                                        <h4 className="font-medium leading-none">Diagnóstico Técnico</h4>
                                        <p className="text-sm text-muted-foreground">
                                          {equipo.diagnostico_tecnico || "No se ha proporcionado un diagnóstico."}
                                        </p>
                                      </div>
                                       <div className="space-y-2">
                                        <h4 className="font-medium leading-none">Trabajos a Realizar</h4>
                                        <p className="text-sm text-muted-foreground">
                                          {equipo.trabajos_a_realizar || "No se han especificado los trabajos."}
                                        </p>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                           </TableCell>
                           <TableCell>
                               <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleOpenPresupuesto(equipo)}
                                  disabled={presupuestoExistente}
                                >
                                   {presupuestoExistente ? 'Presupuestado' : <><FilePlus2 className="mr-2 h-4 w-4"/>Presupuestar</>}
                               </Button>
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
              No hay equipos pendientes de presupuesto en este momento.
            </p>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={openPresupuesto} onOpenChange={setOpenPresupuesto}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                  <DialogTitle>Crear Presupuesto de Servicio</DialogTitle>
                  {selectedEquipo && (
                      <DialogDescription>
                        {`${selectedEquipo.tipo_equipo_nombre} ${selectedEquipo.marca_nombre} ${selectedEquipo.modelo} | Cliente: ${selectedEquipo.cliente_nombre}`}
                      </DialogDescription>
                  )}
              </DialogHeader>
              <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-4 -mr-4">
                  <div className="space-y-4">
                      <Card>
                          <CardHeader className="pb-2"><CardTitle className="text-base">Diagnóstico</CardTitle></CardHeader>
                          <CardContent><p className="text-sm text-muted-foreground">{selectedEquipo?.diagnostico_tecnico}</p></CardContent>
                      </Card>
                       <Card>
                          <CardHeader className="pb-2"><CardTitle className="text-base">Trabajos Sugeridos</CardTitle></CardHeader>
                          <CardContent><p className="text-sm text-muted-foreground">{selectedEquipo?.trabajos_a_realizar}</p></CardContent>
                      </Card>
                       <div className="space-y-2">
                            <Label htmlFor="observaciones">Observaciones Adicionales</Label>
                            <Textarea id="observaciones" value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={4} />
                        </div>
                  </div>
                  <div className="space-y-4">
                      <Card>
                          <CardHeader>
                              <CardTitle>Ítems del Presupuesto</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="h-64 pr-4">
                              <div className="space-y-4">
                                {itemsPresupuesto.map((item, index) => (
                                  <div key={index} className="space-y-3 p-2 border rounded-md">
                                     <div className="flex items-center justify-between">
                                        <Label className="font-semibold">{item.tipo === 'Repuesto' ? 'Repuesto' : 'Mano de Obra'} #{index + 1}</Label>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveItem(index)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                    <Combobox
                                      options={
                                          item.tipo === 'Repuesto'
                                              ? productos.map(p => ({ value: p.id, label: p.nombre }))
                                              : servicios.map(s => ({ value: s.id, label: s.nombre }))
                                      }
                                      value={item.id}
                                      onChange={(val) => handleItemChange(index, 'id', val)}
                                      placeholder={`Seleccionar ${item.tipo}...`}
                                      searchPlaceholder={`Buscar ${item.tipo}...`}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                        <Label htmlFor={`qty-${index}`} className="text-xs">Cantidad</Label>
                                        <Input id={`qty-${index}`} type="number" value={item.cantidad} onChange={e => handleItemChange(index, 'cantidad', e.target.value)} />
                                      </div>
                                      <div className="space-y-1">
                                        <Label htmlFor={`price-${index}`} className="text-xs">P. Unitario</Label>
                                        <Input id={`price-${index}`} type="number" value={item.precio_unitario} onChange={e => handleItemChange(index, 'precio_unitario', e.target.value)} />
                                      </div>
                                    </div>
                                    {index < itemsPresupuesto.length - 1 && <Separator className="mt-4"/>}
                                  </div>
                                ))}
                                {itemsPresupuesto.length === 0 && (
                                  <p className="text-sm text-center text-muted-foreground py-4">Añada ítems al presupuesto.</p>
                                )}
                              </div>
                            </ScrollArea>
                          </CardContent>
                          <CardFooter className="gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleAddItem('Mano de Obra')}><PlusCircle className="mr-2 h-4 w-4" />Añadir Servicio</Button>
                              <Button variant="outline" size="sm" onClick={() => handleAddItem('Repuesto')}><PlusCircle className="mr-2 h-4 w-4" />Añadir Repuesto</Button>
                          </CardFooter>
                      </Card>
                  </div>
              </div>
              <DialogFooter className="border-t pt-4 flex-shrink-0">
                  <div className="w-full flex justify-between items-center">
                      <p className="text-xl font-bold">Total: {currencyFormatter.format(totalPresupuesto)}</p>
                      <div>
                          <Button variant="outline" className="mr-2" onClick={() => setOpenPresupuesto(false)}>Cancelar</Button>
                          <Button onClick={handleSavePresupuesto}>Guardar Presupuesto</Button>
                      </div>
                  </div>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}
