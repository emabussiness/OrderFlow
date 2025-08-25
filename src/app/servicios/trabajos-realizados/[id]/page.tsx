
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { doc, getDoc, collection, getDocs, query, where, writeBatch, serverTimestamp, increment, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/command";
import { PlusCircle, Trash2, ArrowLeft, FileWarning, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from 'next/navigation'
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// --- Types ---
type PresupuestoServicio = {
    id: string;
    equipo_id: string;
    cliente_nombre: string;
    recepcion_id: string;
    items: ItemPresupuesto[];
    total: number;
    observaciones?: string;
};

type Equipo = {
    id: string;
    tipo_equipo_nombre: string;
    marca_nombre: string;
    modelo: string;
    origen_garantia_id?: string;
};

type GarantiaOriginal = {
    id: string;
    items_cubiertos?: ItemPresupuesto[];
}

type ItemPresupuesto = {
  id: string; // Puede ser producto_id o servicio_id
  nombre: string;
  tipo: 'Repuesto' | 'Mano de Obra';
  cantidad: number;
  precio_unitario: number;
};

type Tecnico = {
    id: string;
    nombre_apellido: string;
};

type Producto = {
    id: string;
    nombre: string;
    precio_referencia: number;
    costo_promedio?: number;
};

type Servicio = {
    id: string;
    nombre: string;
    precio: number;
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
  const params = useParams();
  const router = useRouter();
  const otId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [presupuesto, setPresupuesto] = useState<PresupuestoServicio | null>(null);
  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [garantiaOriginal, setGarantiaOriginal] = useState<GarantiaOriginal | null>(null);
  
  // Referenciales
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);


  // Form State
  const [selectedTecnicoId, setSelectedTecnicoId] = useState('');
  const [horasTrabajadas, setHorasTrabajadas] = useState(1);
  const [observacionesTecnicas, setObservacionesTecnicas] = useState('');
  const [itemsUtilizados, setItemsUtilizados] = useState<Record<string, boolean>>({});
  const [itemsAdicionales, setItemsAdicionales] = useState<ItemPresupuesto[]>([]);
  const [itemsGarantia, setItemsGarantia] = useState<Record<string, boolean>>({});

  
  const fetchData = useCallback(async () => {
    if (!otId) return;
    setLoading(true);
    try {
        const presupuestoRef = doc(db, "presupuestos_servicio", otId);
        const presupuestoSnap = await getDoc(presupuestoRef);

        if (!presupuestoSnap.exists()) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se encontró la orden de trabajo.' });
            router.push('/servicios/orden-trabajo');
            return;
        }
        const presupuestoData = { id: presupuestoSnap.id, ...presupuestoSnap.data() } as PresupuestoServicio;
        setPresupuesto(presupuestoData);

        const equipoRef = doc(db, "equipos_en_servicio", presupuestoData.equipo_id);
        const equipoSnap = await getDoc(equipoRef);
        if (equipoSnap.exists()) {
            const equipoData = { id: equipoSnap.id, ...equipoSnap.data() } as Equipo
            setEquipo(equipoData);

            if(equipoData.origen_garantia_id) {
                const garantiaRef = doc(db, 'garantias_servicio', equipoData.origen_garantia_id);
                const garantiaSnap = await getDoc(garantiaRef);
                if (garantiaSnap.exists()) {
                    setGarantiaOriginal({ id: garantiaSnap.id, ...garantiaSnap.data()} as GarantiaOriginal);
                }
            }
        }
        
        const initialChecked: Record<string, boolean> = {};
        const initialGarantia: Record<string, boolean> = {};
        presupuestoData.items.forEach(item => {
            initialChecked[item.id] = true; // All items are used by default
            initialGarantia[item.id] = true; // All items are covered by warranty by default
        });
        setItemsUtilizados(initialChecked);
        setItemsGarantia(initialGarantia);

        // Fetch referenciales
        const [tecnicosSnap, productosSnap, serviciosSnap] = await Promise.all([
            getDocs(query(collection(db, 'tecnicos'), orderBy("nombre_apellido"))),
            getDocs(query(collection(db, 'productos'), orderBy("nombre"))),
            getDocs(query(collection(db, 'servicios'), orderBy("nombre"))),
        ]);
        setTecnicos(tecnicosSnap.docs.map(d => ({id: d.id, ...d.data()} as Tecnico)));
        setProductos(productosSnap.docs.map(d => ({id: d.id, ...d.data()} as Producto)));
        setServicios(serviciosSnap.docs.map(d => ({id: d.id, ...d.data()} as Servicio)));


    } catch (error) {
      console.error("Error fetching OT data:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la información de la OT." });
    } finally {
      setLoading(false);
    }
  }, [otId, toast, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddItem = (tipo: 'Repuesto' | 'Mano de Obra') => {
    const newItemId = `adicional-${Date.now()}`;
    const newItem: ItemPresupuesto = {
      id: newItemId, // Temporary ID
      nombre: '',
      tipo: tipo,
      cantidad: 1,
      precio_unitario: 0,
    };
    setItemsAdicionales(prev => [...prev, newItem]);
    setItemsGarantia(prev => ({...prev, [newItemId]: true})); // Include new item in warranty by default
  };

  const handleRemoveItemAdicional = (index: number) => {
    const itemToRemove = itemsAdicionales[index];
    setItemsAdicionales(prev => prev.filter((_, i) => i !== index));
    setItemsGarantia(prev => {
        const newGarantia = {...prev};
        delete newGarantia[itemToRemove.id];
        return newGarantia;
    });
  };
  
   const handleItemAdicionalChange = (index: number, field: keyof ItemPresupuesto, value: any) => {
      const newItems = [...itemsAdicionales];
      const currentItem = newItems[index];

      if (field === 'id') {
          const list = currentItem.tipo === 'Repuesto' ? productos : servicios;
          const selectedItem = list.find(p => p.id === value);
          
          if (newItems.some(item => item.id === value && item.tipo === currentItem.tipo)) {
              toast({ variant: 'destructive', description: `El ítem "${selectedItem?.nombre}" ya está en la lista.` });
              return;
           }

          if (selectedItem) {
              const oldId = currentItem.id;
              currentItem.id = selectedItem.id;
              currentItem.nombre = selectedItem.nombre;
              currentItem.precio_unitario = (selectedItem as any).precio_referencia || (selectedItem as any).precio || 0;
              
              setItemsGarantia(prev => {
                  const newGarantia = {...prev};
                  const isCovered = newGarantia[oldId];
                  delete newGarantia[oldId];
                  newGarantia[selectedItem.id] = isCovered;
                  return newGarantia;
              });
          }
      } else {
          (currentItem as any)[field] = Number(value) < 0 ? 0 : Number(value);
      }
      setItemsAdicionales(newItems);
  };

    const garantiaCoverageMap = useMemo(() => {
        const map = new Map<string, number>();
        if (!garantiaOriginal?.items_cubiertos) return map;

        for (const item of garantiaOriginal.items_cubiertos) {
            map.set(item.id, (map.get(item.id) || 0) + item.cantidad);
        }
        return map;
    }, [garantiaOriginal]);
  
  const costoTotalTrabajo = useMemo(() => {
    let costoTotal = 0;

    const itemsPresupuestoUtilizados = presupuesto?.items.filter(item => itemsUtilizados[item.id]) || [];
    const todosLosItems = [...itemsPresupuestoUtilizados, ...itemsAdicionales.filter(i => i.id && !i.id.startsWith('adicional-'))];

    todosLosItems.forEach(item => {
        const cantidadCubierta = garantiaCoverageMap.get(item.id) || 0;
        const cantidadACobrar = Math.max(0, item.cantidad - cantidadCubierta);
        costoTotal += cantidadACobrar * item.precio_unitario;
    });

    return costoTotal;
  }, [itemsUtilizados, itemsAdicionales, presupuesto, garantiaCoverageMap]);


  const handleSubmitTrabajo = async () => {
      if(!selectedTecnicoId) {
          toast({variant: 'destructive', title: 'Error', description: 'Debe seleccionar un técnico.'});
          return;
      }
      
      const itemsPresupuestoUtilizados = presupuesto?.items.filter(item => itemsUtilizados[item.id]) || [];
      const todosLosItems = [...itemsPresupuestoUtilizados, ...itemsAdicionales.filter(i => i.id)];

      const itemsCubiertosPorGarantia = todosLosItems.filter(item => itemsGarantia[item.id]);

      try {
        const batch = writeBatch(db);
        
        // 1. Create trabajo_realizado document
        const trabajoRef = doc(collection(db, 'trabajos_realizados'));
        batch.set(trabajoRef, {
            orden_trabajo_id: otId,
            equipo_id: presupuesto?.equipo_id,
            tecnico_id: selectedTecnicoId,
            tecnico_nombre: tecnicos.find(t => t.id === selectedTecnicoId)?.nombre_apellido,
            fecha_finalizacion: new Date().toISOString().split('T')[0],
            horas_trabajadas: horasTrabajadas,
            observaciones_tecnicas: observacionesTecnicas,
            items_utilizados: itemsPresupuestoUtilizados,
            items_adicionales: itemsAdicionales.filter(item => item.id && item.cantidad > 0),
            items_cubiertos_garantia: itemsCubiertosPorGarantia, 
            costo_total_trabajo: costoTotalTrabajo,
            usuario_id: "user-demo",
            fecha_creacion: serverTimestamp(),
        });

        // 2. Update Equipo status to "Reparado"
        const equipoRef = doc(db, 'equipos_en_servicio', presupuesto!.equipo_id);
        batch.update(equipoRef, { estado: "Reparado" });

        // 3. Decrement stock for all used parts
        const repuestosADescontar = todosLosItems.filter(item => item.tipo === 'Repuesto');
        for (const repuesto of repuestosADescontar) {
             const stockQuery = query(collection(db, 'stock'), where('producto_id', '==', repuesto.id));
            const stockSnap = await getDocs(stockQuery);
            if(!stockSnap.empty) {
                const stockDocRef = stockSnap.docs[0].ref;
                batch.update(stockDocRef, { cantidad: increment(-repuesto.cantidad) });
            }
        }
        
        await batch.commit();

        toast({title: "Trabajo Registrado", description: "La reparación ha sido registrada y el equipo marcado como 'Reparado'."});
        router.push('/servicios/orden-trabajo');

      } catch (error) {
         console.error("Error saving work:", error);
         toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el registro del trabajo.' });
      }

  }

  if (loading) return <p>Cargando datos de la Orden de Trabajo...</p>;
  if (!presupuesto) return <p>Orden de trabajo no encontrada.</p>;

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
             <Button variant="outline" size="icon" asChild>
                <Link href="/servicios/orden-trabajo"><ArrowLeft/></Link>
            </Button>
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    Registrar Trabajo Realizado (OT: {otId.substring(0, 7)})
                    {equipo?.origen_garantia_id && <Badge variant="destructive"><FileWarning className="mr-2 h-4 w-4"/>Reclamo de Garantía</Badge>}
                </h1>
                <p className="text-muted-foreground">
                    {equipo?.tipo_equipo_nombre} {equipo?.marca_nombre} {equipo?.modelo} para {presupuesto.cliente_nombre}
                </p>
            </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
                <CardHeader><CardTitle>Detalles de la Reparación</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="tecnico">Técnico a Cargo</Label>
                            <Combobox options={tecnicos.map(t => ({value: t.id, label: t.nombre_apellido}))} value={selectedTecnicoId} onChange={setSelectedTecnicoId} placeholder="Seleccionar técnico..."/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="horas">Horas de Mano de Obra</Label>
                            <Input id="horas" type="number" value={horasTrabajadas} onChange={e => setHorasTrabajadas(Number(e.target.value) || 0)} min="0.5" step="0.5"/>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="obs-tecnicas">Observaciones Técnicas de la Reparación</Label>
                        <Textarea id="obs-tecnicas" value={observacionesTecnicas} onChange={e => setObservacionesTecnicas(e.target.value)} rows={4} placeholder="Describa detalles importantes del proceso de reparación..."/>
                    </div>
                </CardContent>
            </Card>
             <div className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>Resumen Presupuesto</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">{presupuesto.observaciones || "Sin observaciones."}</p>
                    </CardContent>
                    <CardFooter className="font-bold text-xl">
                        Total Presupuestado: {currencyFormatter.format(presupuesto.total)}
                    </CardFooter>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Costo Total del Trabajo</CardTitle></CardHeader>
                     <CardContent>
                        <p className="text-sm text-muted-foreground">Este es el valor total de los ítems y mano de obra utilizados que no están cubiertos por la garantía.</p>
                    </CardContent>
                    <CardFooter className="font-bold text-xl text-primary">
                        {currencyFormatter.format(costoTotalTrabajo)}
                    </CardFooter>
                </Card>
            </div>
        </div>

        <Card>
            <CardHeader><CardTitle>Checklist de Ítems Presupuestados</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead className="w-10"></TableHead><TableHead>Ítem</TableHead><TableHead>Tipo</TableHead><TableHead>Cant.</TableHead><TableHead className="text-right">Precio Unit.</TableHead><TableHead className="w-[100px] text-center">Garantía</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {presupuesto.items.map(item => (
                            <TableRow key={item.id} className={!itemsUtilizados[item.id] ? "text-muted-foreground" : ""}>
                                <TableCell><Checkbox checked={itemsUtilizados[item.id] || false} onCheckedChange={(checked) => setItemsUtilizados(prev => ({...prev, [item.id]: !!checked}))}/></TableCell>
                                <TableCell>{item.nombre}</TableCell>
                                <TableCell>{item.tipo}</TableCell>
                                <TableCell>{item.cantidad}</TableCell>
                                <TableCell className="text-right">{currencyFormatter.format(item.precio_unitario)}</TableCell>
                                <TableCell className="text-center">
                                    <Checkbox 
                                        checked={itemsGarantia[item.id] || false} 
                                        onCheckedChange={(checked) => setItemsGarantia(prev => ({...prev, [item.id]: !!checked}))}
                                        disabled={!itemsUtilizados[item.id]}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <Card>
             <CardHeader>
                 <div className="flex justify-between items-center">
                    <CardTitle>Repuestos y Servicios Adicionales</CardTitle>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleAddItem('Mano de Obra')}><PlusCircle className="mr-2 h-4"/>Añadir Servicio</Button>
                        <Button variant="outline" size="sm" onClick={() => handleAddItem('Repuesto')}><PlusCircle className="mr-2 h-4"/>Añadir Repuesto</Button>
                    </div>
                 </div>
                 <CardDescription>Añada aquí cualquier ítem utilizado que no estuviera en el presupuesto original.</CardDescription>
            </CardHeader>
            <CardContent>
                {itemsAdicionales.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-7 gap-4 items-end border-b pb-4 mb-4">
                         <div className="col-span-3 space-y-1">
                            <Label>{item.tipo} Adicional</Label>
                            <Combobox 
                                options={item.tipo === 'Repuesto' ? productos.map(p => ({value: p.id, label: p.nombre})) : servicios.map(s => ({value: s.id, label: s.nombre}))} 
                                value={item.id.startsWith('adicional-') ? '' : item.id} 
                                onChange={val => handleItemAdicionalChange(index, 'id', val)} 
                                placeholder={`Seleccionar ${item.tipo}`}/>
                         </div>
                          <div className="space-y-1">
                            <Label>Cantidad</Label>
                            <Input type="number" value={item.cantidad} onChange={e => handleItemAdicionalChange(index, 'cantidad', e.target.value)} />
                         </div>
                          <div className="space-y-1">
                            <Label>Precio Unit.</Label>
                            <Input type="number" value={item.precio_unitario} onChange={e => handleItemAdicionalChange(index, 'precio_unitario', e.target.value)} />
                         </div>
                         <div className="flex flex-col items-center space-y-1">
                             <Label>Garantía</Label>
                             <Checkbox 
                                checked={itemsGarantia[item.id] || false} 
                                onCheckedChange={(checked) => setItemsGarantia(prev => ({...prev, [item.id]: !!checked}))}
                                disabled={!item.id || item.id.startsWith('adicional-')}
                             />
                         </div>
                          <div>
                            <Button variant="destructive" size="icon" onClick={() => handleRemoveItemAdicional(index)}><Trash2 className="h-4 w-4"/></Button>
                         </div>
                    </div>
                ))}
                {itemsAdicionales.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">No se han añadido ítems adicionales.</p>}
            </CardContent>
        </Card>
        
        <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSubmitTrabajo}>Finalizar y Guardar Registro</Button>
        </div>

    </div>
  );
}
