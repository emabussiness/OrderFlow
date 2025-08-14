
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, serverTimestamp, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, PlusCircle, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/command";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";

// Types from Firestore
type ProductoRef = { id: string; nombre: string; precio_referencia: number; };
type ProveedorRef = { id: string; nombre: string; };
type DepositoRef = { id: string; nombre: string; };

type ItemPresupuesto = {
  producto_id: string;
  nombre: string;
  cantidad: number;
  precio_presupuestado: number;
};

type ItemPedido = {
  producto_id: string;
  nombre: string;
  cantidad: number;
  precio_estimado: number;
};

type Pedido = {
  id: string;
  proveedor_id: string;
  proveedor_nombre: string;
  deposito_id: string;
  deposito_nombre: string;
  fecha_pedido: string;
  estado: "Pendiente" | "Completado" | "Cancelado";
  total: number;
  items: ItemPedido[];
};

type Presupuesto = {
  id: string;
  pedido_id: string;
  proveedor_id: string;
  proveedor_nombre: string;
  deposito_id: string;
  deposito_nombre: string;
  fecha_presupuesto: string;
  total: number;
  estado: "Recibido" | "Aprobado" | "Rechazado" | "Procesado";
  items: ItemPresupuesto[];
  observaciones?: string;
  usuario_id: string;
  fecha_creacion: any;
};

export default function PresupuestosProveedorPage() {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [productos, setProductos] = useState<ProductoRef[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorRef[]>([]);
  const [depositos, setDepositos] = useState<DepositoRef[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [selectedPresupuesto, setSelectedPresupuesto] = useState<Presupuesto | null>(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const { toast } = useToast();

  const [creationMode, setCreationMode] = useState<"pedido" | "manual">("pedido");
  const [selectedPedidoId, setSelectedPedidoId] = useState('');
  const [selectedProveedorId, setSelectedProveedorId] = useState('');
  const [selectedDepositoId, setSelectedDepositoId] = useState('');
  const [items, setItems] = useState<ItemPresupuesto[]>([]);
  const [observaciones, setObservaciones] = useState('');
  
  const selectedPedido = pedidos.find(p => p.id === selectedPedidoId);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Presupuestos
      const presupuestosCollection = collection(db, 'presupuesto_proveedor');
      const qPresupuestos = query(presupuestosCollection, orderBy("fecha_creacion", "desc"));
      const presupuestosSnapshot = await getDocs(qPresupuestos);
      const presupuestosList = presupuestosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Presupuesto));
      setPresupuestos(presupuestosList);

      // Fetch Pedidos Pendientes
      const pedidosCollection = collection(db, 'pedidos_compra');
      const qPedidos = query(pedidosCollection, where("estado", "==", "Pendiente"));
      const pedidosSnapshot = await getDocs(qPedidos);
      const pedidosList = pedidosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pedido));

      // Filter out pedidos that already have a budget
      const pedidosConPresupuestoIds = presupuestosList.map(p => p.pedido_id);
      setPedidos(pedidosList.filter(p => !pedidosConPresupuestoIds.includes(p.id)));
      
      // Fetch Referenciales
      const productosSnapshot = await getDocs(query(collection(db, 'productos'), orderBy("nombre")));
      setProductos(productosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductoRef)));
      
      const proveedoresSnapshot = await getDocs(query(collection(db, 'proveedores'), orderBy("nombre")));
      setProveedores(proveedoresSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProveedorRef)));

      const depositosSnapshot = await getDocs(query(collection(db, 'depositos'), orderBy("nombre")));
      setDepositos(depositosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DepositoRef)));


    } catch (error) {
      console.error("Error fetching data: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (creationMode === 'pedido' && selectedPedido) {
      const newItems = selectedPedido.items.map(item => ({
        producto_id: item.producto_id,
        nombre: item.nombre,
        cantidad: item.cantidad,
        precio_presupuestado: item.precio_estimado || 0,
      }));
      setItems(newItems);
      setSelectedProveedorId(selectedPedido.proveedor_id);
      setSelectedDepositoId(selectedPedido.deposito_id);
    } else {
      setItems([]);
      setSelectedProveedorId('');
      setSelectedDepositoId('');
    }
  }, [creationMode, selectedPedidoId, selectedPedido]); 
  
  const getStatusVariant = (status: string): "secondary" | "default" | "destructive" | "outline" => {
    switch (status) {
      case "Recibido": return "secondary";
      case "Aprobado": return "default";
      case "Rechazado": return "destructive";
      case "Procesado": return "outline";
      default: return "outline";
    }
  };

  const handleAddItem = () => {
    setItems([...items, { producto_id: '', nombre: '', cantidad: 1, precio_presupuestado: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof ItemPresupuesto, value: string | number) => {
    const newItems = [...items];
    const currentItem = newItems[index];

    if (field === 'producto_id') {
      const productoId = value as string;
      const producto = productos.find(p => p.id === productoId);
       if (items.some((item, i) => item.producto_id === productoId && i !== index)) {
            toast({ variant: "destructive", title: "Producto duplicado", description: "Este producto ya ha sido añadido." });
            return;
       }
      currentItem.producto_id = productoId;
      currentItem.precio_presupuestado = producto ? producto.precio_referencia : 0;
      currentItem.nombre = producto ? producto.nombre : '';
    } else if (field === 'cantidad') {
      currentItem.cantidad = Number(value) < 1 ? 1 : Number(value);
    } else if (field === 'precio_presupuestado') {
      currentItem.precio_presupuestado = Number(value) < 0 ? 0 : Number(value);
    }
    setItems(newItems);
  }
  
  const calcularTotal = () => {
     return items.reduce((total, item) => total + (item.cantidad * item.precio_presupuestado), 0).toFixed(2);
  }

  const resetForm = () => {
    setCreationMode('pedido');
    setSelectedPedidoId('');
    setSelectedProveedorId('');
    setSelectedDepositoId('');
    setItems([]);
    setObservaciones('');
  }

  const handleCreatePresupuesto = async () => {
    const proveedorId = creationMode === 'pedido' ? selectedPedido?.proveedor_id : selectedProveedorId;
    const depositoId = creationMode === 'pedido' ? selectedPedido?.deposito_id : selectedDepositoId;

    if (!proveedorId || !depositoId || items.length === 0 || (creationMode === 'manual' && items.some(i => !i.producto_id))) {
      toast({ variant: "destructive", title: "Error", description: "Proveedor, depósito y al menos un producto son requeridos." });
      return;
    }
    
    const proveedor = proveedores.find(p => p.id === proveedorId);
    const deposito = depositos.find(d => d.id === depositoId);

    try {
        const nuevoPresupuesto = {
            pedido_id: creationMode === 'pedido' ? selectedPedidoId : 'N/A (Manual)',
            proveedor_nombre: proveedor?.nombre || 'N/A',
            proveedor_id: proveedor?.id || '',
            deposito_nombre: deposito?.nombre || 'N/A',
            deposito_id: deposito?.id || '',
            fecha_presupuesto: new Date().toISOString().split('T')[0],
            total: parseFloat(calcularTotal()),
            estado: 'Recibido' as 'Recibido',
            items: items.map(item => ({ producto_id: item.producto_id, cantidad: item.cantidad, precio_presupuestado: item.precio_presupuestado, nombre: item.nombre })),
            observaciones,
            usuario_id: "user-demo", // Hardcoded
            fecha_creacion: serverTimestamp(),
        }

        const docRef = await addDoc(collection(db, "presupuesto_proveedor"), nuevoPresupuesto);
        
        // Mark pedido as "Completado" since it now has a budget and an OC will be generated from it
        if(creationMode === 'pedido' && selectedPedidoId) {
            const pedidoRef = doc(db, 'pedidos_compra', selectedPedidoId);
            await updateDoc(pedidoRef, { estado: "Completado" });
        }

        await fetchData(); // Refresh lists
        
        toast({ title: "Presupuesto Registrado", description: `El presupuesto ha sido creado.` });
        setOpenCreate(false);
    } catch(e) {
        console.error("Error creating presupuesto:", e);
        toast({ variant: "destructive", title: "Error", description: "No se pudo crear el presupuesto." });
    }
  }

  useEffect(() => {
    if(!openCreate) resetForm();
  }, [openCreate]);


  const handleOpenDetails = (presupuesto: Presupuesto) => {
    setSelectedPresupuesto(presupuesto);
    setOpenDetails(true);
  }

  const handleUpdateStatus = async (presupuesto: Presupuesto, newStatus: "Aprobado" | "Rechazado") => {
    const presupuestoRef = doc(db, 'presupuesto_proveedor', presupuesto.id);
    try {
        await updateDoc(presupuestoRef, { estado: newStatus });
        toast({ title: `Presupuesto ${newStatus}`, description: `El estado del presupuesto ha sido actualizado.` });
        await fetchData();
    } catch(e) {
        console.error("Error updating status:", e);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el estado.'});
    }
  }

  if (loading) return <p>Cargando datos...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Presupuestos de Proveedores</h1>
         <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Registrar Presupuesto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Presupuesto</DialogTitle>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                <div className="grid gap-4 py-4">
                <RadioGroup value={creationMode} onValueChange={(value) => setCreationMode(value as any)} className="grid grid-cols-2 gap-4">
                    <div>
                        <RadioGroupItem value="pedido" id="r1" className="peer sr-only" />
                        <Label htmlFor="r1" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                            Basado en Pedido
                        </Label>
                    </div>
                    <div>
                        <RadioGroupItem value="manual" id="r2" className="peer sr-only" />
                        <Label htmlFor="r2" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                            Registro Manual
                        </Label>
                    </div>
                </RadioGroup>

                {creationMode === 'pedido' ? (
                    <div className="space-y-2">
                    <Label htmlFor="pedido">Pedido de Compra</Label>
                        <Combobox
                            options={pedidos.map(p => ({ value: p.id, label: `${p.id.substring(0,7)} - ${p.proveedor_nombre}` }))}
                            value={selectedPedidoId}
                            onChange={setSelectedPedidoId}
                            placeholder="Seleccione un pedido pendiente"
                            searchPlaceholder="Buscar pedido..."
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                    <Label htmlFor="proveedor">Proveedor</Label>
                        <Combobox
                            options={proveedores.map(p => ({ value: p.id, label: p.nombre }))}
                            value={selectedProveedorId}
                            onChange={setSelectedProveedorId}
                            placeholder="Seleccione un proveedor"
                            searchPlaceholder="Buscar proveedor..."
                        />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="deposito">Depósito</Label>
                        <Combobox
                            options={depositos.map(d => ({ value: d.id, label: d.nombre }))}
                            value={selectedDepositoId}
                            onChange={setSelectedDepositoId}
                            placeholder="Seleccione un depósito"
                            searchPlaceholder="Buscar depósito..."
                        />
                    </div>
                    </div>
                )}
                
                <div className="space-y-2">
                    <Label htmlFor="observaciones">Observaciones</Label>
                    <Textarea id="observaciones" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Añadir observaciones..."/>
                </div>

                {(selectedPedido || creationMode === 'manual') && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Productos del Presupuesto</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ScrollArea className="h-[300px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Producto</TableHead>
                                            <TableHead className="w-[150px]">Cantidad</TableHead>
                                            <TableHead className="w-[150px]">Precio Cotizado</TableHead>
                                            <TableHead className="w-[150px] text-right">Subtotal</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    <Combobox
                                                        options={productos.map(p => ({ value: p.id, label: p.nombre }))}
                                                        value={item.producto_id}
                                                        onChange={(value) => handleItemChange(index, 'producto_id', value)}
                                                        disabled={creationMode === 'pedido'}
                                                        placeholder="Seleccione producto"
                                                        searchPlaceholder="Buscar producto..."
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input type="number" value={item.cantidad} onChange={(e) => handleItemChange(index, 'cantidad', e.target.value)} min="1" disabled={creationMode === 'pedido'}/>
                                                </TableCell>
                                                <TableCell>
                                                    <Input type="number" value={item.precio_presupuestado} onChange={(e) => handleItemChange(index, 'precio_presupuestado', e.target.value)} min="0"/>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                ${(item.cantidad * item.precio_presupuestado).toFixed(2)}
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} disabled={creationMode === 'pedido'}>
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                             </ScrollArea>
                        </CardContent>
                    </Card>
                )}
                </div>
            </div>
            <DialogFooter className="border-t pt-4">
                <div className="flex justify-between w-full items-center">
                    <Button variant="outline" size="sm" onClick={handleAddItem} disabled={creationMode === 'pedido'}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Añadir Producto
                    </Button>
                    <div className="flex items-center gap-4">
                        <div className="text-right font-bold text-lg">
                            Total: ${calcularTotal()}
                        </div>
                        <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
                        <Button onClick={handleCreatePresupuesto} disabled={(creationMode === 'pedido' && !selectedPedidoId) || (creationMode === 'manual' && (!selectedProveedorId || !selectedDepositoId || items.length === 0))}>Registrar</Button>
                    </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Presupuestos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Presupuesto</TableHead>
                <TableHead>ID Pedido</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {presupuestos.map((presupuesto) => (
                <TableRow key={presupuesto.id}>
                  <TableCell className="font-medium">{presupuesto.id.substring(0,7)}</TableCell>
                  <TableCell>{presupuesto.pedido_id?.substring(0,7) ?? 'N/A'}</TableCell>
                  <TableCell>{presupuesto.proveedor_nombre}</TableCell>
                  <TableCell>{presupuesto.fecha_presupuesto}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(presupuesto.estado)}>
                      {presupuesto.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    ${presupuesto.total.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDetails(presupuesto)}>Ver Detalles</DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={presupuesto.estado !== 'Recibido'}>Aprobar</DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Confirmar Aprobación?</AlertDialogTitle>
                              <AlertDialogDescription>
                                ¿Estás seguro de que deseas aprobar este presupuesto? Podrás generar una OC desde la pantalla de Órdenes de Compra.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cerrar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleUpdateStatus(presupuesto, 'Aprobado')}>Confirmar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                         <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={presupuesto.estado !== 'Recibido'}>
                               <span className="text-red-500">Rechazar</span>
                            </DropdownMenuItem>
                           </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Confirmar Rechazo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. ¿Estás seguro?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cerrar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleUpdateStatus(presupuesto, 'Rechazado')} className="bg-destructive hover:bg-destructive/90">Confirmar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={openDetails} onOpenChange={setOpenDetails}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>Detalles del Presupuesto: {selectedPresupuesto?.id.substring(0,7)}</DialogTitle>
                <DialogDescription>
                    Información detallada del presupuesto recibido del proveedor.
                </DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto pr-6 -mr-6">
                {selectedPresupuesto && (
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div><p className="font-semibold">Proveedor:</p><p>{selectedPresupuesto.proveedor_nombre}</p></div>
                            <div><p className="font-semibold">Depósito:</p><p>{selectedPresupuesto.deposito_nombre}</p></div>
                            <div><p className="font-semibold">Fecha:</p><p>{selectedPresupuesto.fecha_presupuesto}</p></div>
                            <div><p className="font-semibold">Pedido ID:</p><p>{selectedPresupuesto.pedido_id?.substring(0,7) ?? 'N/A'}</p></div>
                            <div><div className="font-semibold">Estado:</div><Badge variant={getStatusVariant(selectedPresupuesto.estado)}>{selectedPresupuesto.estado}</Badge></div>
                            <div><p className="font-semibold">Registrado por:</p><p>{selectedPresupuesto.usuario_id}</p></div>
                            <div><p className="font-semibold">Fecha de Registro:</p><p>{selectedPresupuesto.fecha_creacion?.toDate().toLocaleString()}</p></div>
                        </div>
                        <div><p className="font-semibold">Observaciones:</p><p className="text-muted-foreground">{selectedPresupuesto.observaciones || 'Sin observaciones'}</p></div>
                        <Card>
                            <CardHeader><CardTitle>Productos Cotizados</CardTitle></CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[300px]">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Producto</TableHead><TableHead>Cantidad</TableHead><TableHead>Precio Unit.</TableHead><TableHead className="text-right">Subtotal</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedPresupuesto.items.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{item.nombre}</TableCell>
                                                    <TableCell>{item.cantidad}</TableCell>
                                                    <TableCell>${item.precio_presupuestado.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right">${(item.cantidad * item.precio_presupuestado).toFixed(2)}</TableCell>
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
            <DialogFooter className="border-t pt-4">
                <div className="flex justify-between w-full items-center">
                    <div className="text-right font-bold text-lg">Total Presupuestado: ${selectedPresupuesto?.total.toFixed(2)}</div>
                    <Button variant="outline" onClick={() => setOpenDetails(false)}>Cerrar</Button>
                </div>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

