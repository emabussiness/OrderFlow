
"use client";

import { useState, useEffect, useCallback } from "react";
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
import { PlusCircle, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from 'next/navigation'
import { Separator } from "@/components/ui/separator";

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
};

type ItemPresupuesto = {
  id: string;
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
  
  const fetchData = useCallback(async () => {
    if (!otId) return;
    setLoading(true);
    try {
        const presupuestoRef = doc(db, "presupuestos_servicio", otId);
        const presupuestoSnap = await getDoc(presupuestoRef);

        if (!presupuestoSnap.exists()) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se encontró la orden de trabajo.' });
            return;
        }
        const presupuestoData = { id: presupuestoSnap.id, ...presupuestoSnap.data() } as PresupuestoServicio;
        setPresupuesto(presupuestoData);

        const equipoRef = doc(db, "equipos_en_servicio", presupuestoData.equipo_id);
        const equipoSnap = await getDoc(equipoRef);
        if (equipoSnap.exists()) {
            setEquipo({ id: equipoSnap.id, ...equipoSnap.data() } as Equipo);
        }
        
        // Set initial checked items
        const initialChecked: Record<string, boolean> = {};
        presupuestoData.items.forEach(item => {
            initialChecked[item.id] = true;
        });
        setItemsUtilizados(initialChecked);

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
  }, [otId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddItem = (tipo: 'Repuesto' | 'Mano de Obra') => {
    setItemsAdicionales(prev => [...prev, { id: '', nombre: '', tipo: tipo, cantidad: 1, precio_unitario: 0 }]);
  };

  const handleRemoveItemAdicional = (index: number) => {
    setItemsAdicionales(prev => prev.filter((_, i) => i !== index));
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
              currentItem.id = selectedItem.id;
              currentItem.nombre = selectedItem.nombre;
              currentItem.precio_unitario = (selectedItem as any).precio_referencia || (selectedItem as any).precio || 0;
          }
      } else {
          (currentItem as any)[field] = Number(value) < 0 ? 0 : Number(value);
      }
      setItemsAdicionales(newItems);
  };
  
  const calcularTotalCosto = () => {
    const costoItemsPresupuestados = presupuesto?.items
        .filter(item => itemsUtilizados[item.id])
        .reduce((acc, item) => {
            if(item.tipo === 'Repuesto') {
                const producto = productos.find(p => p.id === item.id);
                return acc + (item.cantidad * (producto?.costo_promedio || item.precio_unitario));
            }
            // El costo de la mano de obra es su precio
            return acc + (item.cantidad * item.precio_unitario);
        }, 0) || 0;
        
    const costoItemsAdicionales = itemsAdicionales.reduce((acc, item) => {
         if(item.tipo === 'Repuesto') {
            const producto = productos.find(p => p.id === item.id);
            return acc + (item.cantidad * (producto?.costo_promedio || item.precio_unitario));
        }
        return acc + (item.cantidad * item.precio_unitario);
    }, 0)

    return costoItemsPresupuestados + costoItemsAdicionales;
  }

  const handleSubmitTrabajo = async () => {
      if(!selectedTecnicoId) {
          toast({variant: 'destructive', title: 'Error', description: 'Debe seleccionar un técnico.'});
          return;
      }
      
      const repuestosUtilizados = presupuesto?.items
        .filter(item => item.tipo === 'Repuesto' && itemsUtilizados[item.id])
        .map(item => ({...item})) || [];
        
      const repuestosAdicionales = itemsAdicionales.filter(item => item.id && item.cantidad > 0 && item.tipo === 'Repuesto');
      const todosLosRepuestos = [...repuestosUtilizados, ...repuestosAdicionales];

      try {
        const batch = writeBatch(db);
        const costoTotal = calcularTotalCosto();

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
            items_utilizados: presupuesto?.items.filter(i => itemsUtilizados[i.id]),
            items_adicionales: itemsAdicionales.filter(item => item.id && item.cantidad > 0),
            costo_total_trabajo: costoTotal,
            usuario_id: "user-demo",
            fecha_creacion: serverTimestamp(),
        });

        // 2. Update Equipo status to "Reparado"
        const equipoRef = doc(db, 'equipos_en_servicio', presupuesto!.equipo_id);
        batch.update(equipoRef, { estado: "Reparado" });

        // 3. Decrement stock for all used parts
        for (const repuesto of todosLosRepuestos) {
             const stockQuery = query(
                collection(db, 'stock'),
                where('producto_id', '==', repuesto.id)
                // We assume stock is not per-depot for service parts for now
                // Add where('deposito_id', '==', idDelDepositoDeServicios) if needed
            );
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
                <h1 className="text-2xl font-bold">Registrar Trabajo Realizado (OT: {otId.substring(0, 7)})</h1>
                <p className="text-muted-foreground">
                    {equipo?.tipo_equipo_nombre} {equipo?.marca_nombre} {equipo?.modelo} para {presupuesto.cliente_nombre}
                </p>
            </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader><CardTitle>Detalles de la Reparación</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="tecnico">Técnico a Cargo</Label>
                        <Combobox options={tecnicos.map(t => ({value: t.id, label: t.nombre_apellido}))} value={selectedTecnicoId} onChange={setSelectedTecnicoId} placeholder="Seleccionar técnico..."/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="horas">Horas de Mano de Obra</Label>
                        <Input id="horas" type="number" value={horasTrabajadas} onChange={e => setHorasTrabajadas(Number(e.target.value) || 0)} min="0.5" step="0.5"/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="obs-tecnicas">Observaciones Técnicas de la Reparación</Label>
                        <Textarea id="obs-tecnicas" value={observacionesTecnicas} onChange={e => setObservacionesTecnicas(e.target.value)} rows={4} placeholder="Describa detalles importantes del proceso de reparación..."/>
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader><CardTitle>Resumen Presupuesto</CardTitle></CardHeader>
                 <CardContent>
                    <p className="text-sm text-muted-foreground">{presupuesto.observaciones || "Sin observaciones."}</p>
                 </CardContent>
                <CardFooter className="font-bold text-xl">
                    Total Presupuestado: {currencyFormatter.format(presupuesto.total)}
                </CardFooter>
            </Card>
        </div>

        <Card>
            <CardHeader><CardTitle>Checklist de Ítems Presupuestados</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead className="w-10"></TableHead><TableHead>Ítem</TableHead><TableHead>Tipo</TableHead><TableHead>Cant.</TableHead><TableHead className="text-right">Precio Unit.</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {presupuesto.items.map(item => (
                            <TableRow key={item.id}>
                                <TableCell><Checkbox checked={itemsUtilizados[item.id] || false} onCheckedChange={(checked) => setItemsUtilizados(prev => ({...prev, [item.id]: !!checked}))}/></TableCell>
                                <TableCell>{item.nombre}</TableCell>
                                <TableCell>{item.tipo}</TableCell>
                                <TableCell>{item.cantidad}</TableCell>
                                <TableCell className="text-right">{currencyFormatter.format(item.precio_unitario)}</TableCell>
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
                    <div key={index} className="grid grid-cols-6 gap-4 items-end border-b pb-4 mb-4">
                         <div className="col-span-3 space-y-1">
                            <Label>{item.tipo} Adicional</Label>
                            <Combobox 
                                options={item.tipo === 'Repuesto' ? productos.map(p => ({value: p.id, label: p.nombre})) : servicios.map(s => ({value: s.id, label: s.nombre}))} 
                                value={item.id} 
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
