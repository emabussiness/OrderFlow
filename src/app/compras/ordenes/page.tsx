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
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Combobox } from "@/components/ui/command";
import { productos as initialProductos, proveedores, depositos } from "@/data";

type ItemOrden = {
  producto_id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
};

type ItemPedido = {
  producto_id: string;
  nombre: string;
  cantidad: number;
  precio_estimado: number;
};

type OrdenCompra = {
  id: string;
  presupuesto_proveedor_id?: string;
  pedido_id?: string;
  proveedor_nombre: string;
  proveedor_id: string;
  deposito_nombre: string;
  deposito_id: string;
  fecha_orden: string;
  estado: "Pendiente de Recepción" | "Recibido Parcial" | "Recibido Completo" | "Cancelada";
  total: number;
  items: ItemOrden[];
  usuario_id: string;
  fecha_creacion: any;
};

type Pedido = {
  id: string;
  proveedor_nombre: string;
  proveedor_id: string;
  deposito_nombre: string;
  deposito_id: string;
  fecha_pedido: string;
  estado: "Pendiente" | "Completado" | "Cancelado";
  total: number;
  items: ItemPedido[];
};

export default function OrdenesCompraPage() {
  const { toast } = useToast();
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedOrden, setSelectedOrden] = useState<OrdenCompra | null>(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);

  // Form state
  const [creationMode, setCreationMode] = useState<"pedido" | "manual">("manual");
  const [selectedPedidoId, setSelectedPedidoId] = useState('');
  const [selectedProveedorId, setSelectedProveedorId] = useState('');
  const [selectedDepositoId, setSelectedDepositoId] = useState('');
  const [items, setItems] = useState<ItemOrden[]>([]);

  const selectedPedido = pedidos.find(p => p.id === selectedPedidoId);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Ordenes
      const ordenesCollection = collection(db, 'ordenes_compra');
      const qOrdenes = query(ordenesCollection, orderBy("fecha_creacion", "desc"));
      const ordenesSnapshot = await getDocs(qOrdenes);
      const ordenesList = ordenesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrdenCompra));
      setOrdenes(ordenesList);

      // Fetch Pedidos pendientes sin OC y sin Presupuesto
      const qPedidos = query(collection(db, 'pedidos_compra'), where("estado", "==", "Pendiente"));
      const pedidosSnapshot = await getDocs(qPedidos);
      const pedidosList = pedidosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pedido));

      const qPresupuestos = await getDocs(collection(db, 'presupuesto_proveedor'));
      const presupuestosPedidosIds = qPresupuestos.docs.map(doc => doc.data().pedido_id);
      
      const ordenesPedidosIds = ordenesList.map(oc => oc.pedido_id);

      const pedidosFiltrados = pedidosList.filter(p => !presupuestosPedidosIds.includes(p.id) && !ordenesPedidosIds.includes(p.id));
      setPedidos(pedidosFiltrados);

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
      setItems(selectedPedido.items.map(item => ({...item, precio_unitario: item.precio_estimado})));
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
      case "Pendiente de Recepción": return "secondary";
      case "Recibido Completo": return "default";
      case "Recibido Parcial": return "outline";
      case "Cancelada": return "destructive";
      default: return "outline";
    }
  };

  const handleOpenDetails = (orden: OrdenCompra) => {
    setSelectedOrden(orden);
    setOpenDetails(true);
  }

  const handleItemChange = (index: number, field: keyof ItemOrden, value: string | number) => {
    const newItems = [...items];
    const currentItem = newItems[index];

    if (field === 'producto_id') {
      const productoId = value as string;
      const producto = initialProductos.find(p => p.id === productoId);
       if (items.some((item, i) => item.producto_id === productoId && i !== index)) {
            toast({ variant: "destructive", title: "Producto duplicado", description: "Este producto ya ha sido añadido." });
            return;
       }
      currentItem.producto_id = productoId;
      currentItem.precio_unitario = producto ? producto.precio_referencia : 0;
      currentItem.nombre = producto ? producto.nombre : '';
    } else if (field === 'cantidad') {
      currentItem.cantidad = Number(value) < 1 ? 1 : Number(value);
    } else if (field === 'precio_unitario') {
      currentItem.precio_unitario = Number(value) < 0 ? 0 : Number(value);
    }
    setItems(newItems);
  }

  const handleAddItem = () => {
    setItems([...items, { producto_id: '', nombre: '', cantidad: 1, precio_unitario: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };
  
  const calcularTotal = () => {
     return items.reduce((total, item) => total + (item.cantidad * item.precio_unitario), 0).toFixed(2);
  }

  const resetForm = () => {
    setCreationMode('manual');
    setSelectedPedidoId('');
    setSelectedProveedorId('');
    setSelectedDepositoId('');
    setItems([]);
  }

  const handleCreateOC = async () => {
    const proveedorId = creationMode === 'pedido' ? selectedPedido?.proveedor_id : selectedProveedorId;
    const depositoId = creationMode === 'pedido' ? selectedPedido?.deposito_id : selectedDepositoId;

    if (!proveedorId || !depositoId || items.length === 0 || items.some(i => !i.producto_id)) {
      toast({ variant: "destructive", title: "Error", description: "Proveedor, depósito y productos son requeridos." });
      return;
    }

    const proveedor = proveedores.find(p => p.id === proveedorId);
    const deposito = depositos.find(d => d.id === depositoId);
    
    try {
        const nuevaOrden = {
          presupuesto_proveedor_id: 'N/A (Directa)',
          pedido_id: creationMode === 'pedido' ? selectedPedidoId : undefined,
          proveedor_nombre: proveedor?.nombre || 'Desconocido',
          proveedor_id: proveedor?.id || '',
          deposito_nombre: deposito?.nombre || 'Desconocido',
          deposito_id: deposito?.id || '',
          fecha_orden: new Date().toISOString().split('T')[0],
          estado: "Pendiente de Recepción" as "Pendiente de Recepción",
          total: parseFloat(calcularTotal()),
          items: items,
          usuario_id: "user-demo",
          fecha_creacion: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, "ordenes_compra"), nuevaOrden);
        
        if (creationMode === 'pedido' && selectedPedidoId) {
          const pedidoRef = doc(db, 'pedidos_compra', selectedPedidoId);
          await updateDoc(pedidoRef, { estado: "Completado" });
        }

        toast({ title: "Orden de Compra Creada", description: `La OC ha sido creada exitosamente.` });
        setOpenCreate(false);
        await fetchData();
    } catch(e) {
        console.error("Error creating OC:", e);
        toast({ variant: "destructive", title: "Error", description: "No se pudo crear la Orden de Compra." });
    }
  }

  useEffect(() => {
    if(!openCreate) resetForm();
  }, [openCreate]);


  if (loading) return <p>Cargando órdenes de compra...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Órdenes de Compra</h1>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4"/>Registrar Orden de Compra</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Registrar Nueva Orden de Compra</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <RadioGroup value={creationMode} onValueChange={(value) => setCreationMode(value as any)} className="grid grid-cols-2 gap-4">
                        <div>
                            <RadioGroupItem value="manual" id="r1" className="peer sr-only" />
                            <Label htmlFor="r1" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                Registro Manual
                            </Label>
                        </div>
                        <div>
                            <RadioGroupItem value="pedido" id="r2" className="peer sr-only" />
                            <Label htmlFor="r2" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                Basado en Pedido
                            </Label>
                        </div>
                    </RadioGroup>

                    {creationMode === 'manual' && (
                        <>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="proveedor" className="text-right">Proveedor</Label>
                             <div className="col-span-3">
                                <Combobox
                                    options={proveedores.map(p => ({ value: p.id, label: p.nombre }))}
                                    value={selectedProveedorId}
                                    onChange={setSelectedProveedorId}
                                    placeholder="Seleccione un proveedor"
                                    searchPlaceholder="Buscar proveedor..."
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="deposito" className="text-right">Depósito</Label>
                             <div className="col-span-3">
                                <Combobox
                                    options={depositos.map(d => ({ value: d.id, label: d.nombre }))}
                                    value={selectedDepositoId}
                                    onChange={setSelectedDepositoId}
                                    placeholder="Seleccione un depósito"
                                    searchPlaceholder="Buscar depósito..."
                                />
                            </div>
                        </div>
                        </>
                    )}

                    {creationMode === 'pedido' && (
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="pedido" className="text-right">Pedido de Compra</Label>
                            <div className="col-span-3">
                                <Combobox
                                    options={pedidos.map(p => ({ value: p.id, label: `${p.id.substring(0,7)} - ${p.proveedor_nombre}` }))}
                                    value={selectedPedidoId}
                                    onChange={setSelectedPedidoId}
                                    placeholder="Seleccione un pedido pendiente"
                                    searchPlaceholder="Buscar pedido..."
                                />
                            </div>
                        </div>
                    )}
                    
                    <Card className="col-span-4">
                        <CardHeader><CardTitle>Productos de la Orden</CardTitle></CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Producto</TableHead>
                                        <TableHead className="w-[150px]">Cantidad</TableHead>
                                        <TableHead className="w-[150px]">Precio Unit.</TableHead>
                                        <TableHead className="w-[150px] text-right">Subtotal</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <Combobox
                                                    options={initialProductos.map(p => ({ value: p.id, label: p.nombre }))}
                                                    value={item.producto_id}
                                                    onChange={(value) => handleItemChange(index, 'producto_id', value)}
                                                    disabled={creationMode === 'pedido'}
                                                    placeholder="Seleccione producto"
                                                    searchPlaceholder="Buscar producto..."
                                                />
                                            </TableCell>
                                            <TableCell><Input type="number" value={item.cantidad} onChange={(e) => handleItemChange(index, 'cantidad', e.target.value)} min="1" disabled={creationMode === 'pedido'}/></TableCell>
                                            <TableCell><Input type="number" value={item.precio_unitario} onChange={(e) => handleItemChange(index, 'precio_unitario', e.target.value)} min="0"/></TableCell>
                                            <TableCell className="text-right">${(item.cantidad * item.precio_unitario).toFixed(2)}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} disabled={creationMode === 'pedido'}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {creationMode === 'manual' && (
                                <div className="flex justify-between items-center mt-4">
                                    <Button variant="outline" size="sm" onClick={handleAddItem}><PlusCircle className="mr-2 h-4 w-4" />Añadir Producto</Button>
                                    <div className="text-right font-bold text-lg">Total: ${calcularTotal()}</div>
                                </div>
                            )}
                             {creationMode === 'pedido' && (
                                <div className="text-right font-bold text-lg mt-4">Total: ${calcularTotal()}</div>
                            )}
                        </CardContent>
                    </Card>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
                    <Button onClick={handleCreateOC}>Crear Orden</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Listado de Órdenes de Compra</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Orden</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Depósito</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenes.map((orden) => (
                <TableRow key={orden.id}>
                  <TableCell className="font-medium">{orden.id.substring(0,7)}</TableCell>
                  <TableCell>{orden.presupuesto_proveedor_id ? `Presupuesto (${orden.presupuesto_proveedor_id.substring(0,7)})` : `Pedido (${orden.pedido_id?.substring(0,7)})`}</TableCell>
                  <TableCell>{orden.proveedor_nombre}</TableCell>
                  <TableCell>{orden.deposito_nombre}</TableCell>
                  <TableCell>{orden.fecha_orden}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(orden.estado)}>
                      {orden.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    ${orden.total.toFixed(2)}
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
                        <DropdownMenuItem onClick={() => handleOpenDetails(orden)}>Ver Detalles</DropdownMenuItem>
                        <DropdownMenuItem disabled>Registrar Recepción</DropdownMenuItem>
                         <DropdownMenuItem disabled={orden.estado !== 'Pendiente de Recepción'}>
                            <span className="text-red-500">Cancelar Orden</span>
                        </DropdownMenuItem>
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
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Detalles de la Orden: {selectedOrden?.id.substring(0,7)}</DialogTitle>
            </DialogHeader>
            {selectedOrden && (
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div><p className="font-semibold">Proveedor:</p><p>{selectedOrden.proveedor_nombre}</p></div>
                        <div><p className="font-semibold">Depósito:</p><p>{selectedOrden.deposito_nombre}</p></div>
                        <div><p className="font-semibold">Fecha de la Orden:</p><p>{selectedOrden.fecha_orden}</p></div>
                         <div><p className="font-semibold">Origen:</p><p>{selectedOrden.presupuesto_proveedor_id ? `Presupuesto (${selectedOrden.presupuesto_proveedor_id.substring(0,7)})` : `Pedido (${selectedOrden.pedido_id?.substring(0,7)})`}</p></div>
                        <div><div className="font-semibold">Estado:</div><Badge variant={getStatusVariant(selectedOrden.estado)}>{selectedOrden.estado}</Badge></div>
                        <div><p className="font-semibold">Generado por:</p><p>{selectedOrden.usuario_id}</p></div>
                         <div><p className="font-semibold">Fecha de Generación:</p><p>{selectedOrden.fecha_creacion?.toDate().toLocaleString()}</p></div>
                    </div>
                    <Card>
                        <CardHeader><CardTitle>Productos</CardTitle></CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Producto</TableHead><TableHead>Cantidad</TableHead><TableHead>Precio Unit.</TableHead><TableHead className="text-right">Subtotal</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedOrden.items.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{item.nombre}</TableCell>
                                            <TableCell>{item.cantidad}</TableCell>
                                            <TableCell>${item.precio_unitario.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">${(item.cantidad * item.precio_unitario).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                     <div className="text-right font-bold text-xl mt-4">Total: ${selectedOrden.total.toFixed(2)}</div>
                </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={() => setOpenDetails(false)}>Cerrar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
