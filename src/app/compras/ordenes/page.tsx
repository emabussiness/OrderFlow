"use client";

import { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Item = {
  productoId: string;
  nombre: string;
  cantidad: number;
  precio: number;
};

type OrdenCompra = {
  id: string;
  presupuestoId: string;
  pedidoId?: string;
  proveedor: string;
  proveedorId: string;
  fechaOrden: string;
  estado: "Pendiente de Recepción" | "Recibido Parcial" | "Recibido Completo" | "Cancelada";
  total: number;
  items: Item[];
  usuario: string;
  fechaCreacion: string;
};

type Pedido = {
  id: string;
  proveedor: string;
  proveedorId: string;
  fechaPedido: string;
  estado: "Pendiente" | "Completado" | "Cancelado";
  total: number;
  items: Item[];
  observaciones?: string;
  usuario: string;
  fechaCreacion: string;
};

const initialOrdenes: OrdenCompra[] = [
  {
    id: "OC-001",
    presupuestoId: "PRE-001",
    pedidoId: "PED-001",
    proveedor: "Proveedor A",
    proveedorId: "1",
    fechaOrden: "2024-07-31",
    total: 1480.0,
    estado: "Pendiente de Recepción",
    items: [
        { productoId: '101', nombre: "Producto X", cantidad: 10, precio: 148 },
    ],
    usuario: "Admin",
    fechaCreacion: "2024-07-31T10:00:00Z"
  },
];

const proveedores = [
    { id: "1", nombre: "Proveedor A" },
    { id: "2", nombre: "Proveedor B" },
    { id: "3", nombre: "Proveedor C" },
];

const productos = [
    { id: "101", nombre: "Producto X", precio: 100 },
    { id: "102", nombre: "Producto Y", precio: 25.50 },
    { id: "103", nombre: "Producto Z", precio: 50 },
];

export default function OrdenesCompraPage() {
  const { toast } = useToast();
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [presupuestosIds, setPresupuestosIds] = useState<string[]>([]);
  
  const [selectedOrden, setSelectedOrden] = useState<OrdenCompra | null>(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);

  // Form state
  const [creationMode, setCreationMode] = useState<"pedido" | "manual">("manual");
  const [selectedPedidoId, setSelectedPedidoId] = useState('');
  const [selectedProveedorId, setSelectedProveedorId] = useState('');
  const [items, setItems] = useState<Item[]>([]);

  const selectedPedido = pedidos.find(p => p.id === selectedPedidoId);
  
  const pedidosSinPresupuesto = pedidos.filter(p => p.estado === 'Pendiente' && !presupuestosIds.includes(p.id));

  useEffect(() => {
    const storedOrdenes = localStorage.getItem("ordenes_compra");
    setOrdenes(storedOrdenes ? JSON.parse(storedOrdenes) : initialOrdenes);

    const storedPedidos = localStorage.getItem("pedidos");
    setPedidos(storedPedidos ? JSON.parse(storedPedidos) : []);

    const storedPresupuestos = localStorage.getItem("presupuestos");
    if (storedPresupuestos) {
        const presupuestos = JSON.parse(storedPresupuestos);
        setPresupuestosIds(presupuestos.map((p: any) => p.pedidoId));
    }

    const handleStorageChange = () => {
        const stored = localStorage.getItem("ordenes_compra");
        setOrdenes(stored ? JSON.parse(stored) : initialOrdenes);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (ordenes.length > 0) {
        if (JSON.stringify(ordenes) !== JSON.stringify(initialOrdenes) || !localStorage.getItem("ordenes_compra")) {
             localStorage.setItem("ordenes_compra", JSON.stringify(ordenes));
             window.dispatchEvent(new Event('storage'));
        }
    } else if (localStorage.getItem("ordenes_compra")) {
        localStorage.removeItem("ordenes_compra");
    }
  }, [ordenes]);

   useEffect(() => {
    if (creationMode === 'pedido' && selectedPedido) {
      setItems(selectedPedido.items.map(item => ({...item})));
      setSelectedProveedorId(selectedPedido.proveedorId);
    } else {
      setItems([]);
      setSelectedProveedorId('');
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

  const handleItemChange = (index: number, field: keyof Item, value: string | number) => {
    const newItems = [...items];
    const currentItem = newItems[index];

    if (field === 'productoId') {
      const productoId = value as string;
      const producto = productos.find(p => p.id === productoId);
       if (items.some((item, i) => item.productoId === productoId && i !== index)) {
            toast({ variant: "destructive", title: "Producto duplicado", description: "Este producto ya ha sido añadido." });
            return;
       }
      currentItem.productoId = productoId;
      currentItem.precio = producto ? producto.precio : 0;
      currentItem.nombre = producto ? producto.nombre : '';
    } else if (field === 'cantidad') {
      currentItem.cantidad = Number(value) < 1 ? 1 : Number(value);
    } else if (field === 'precio') {
      currentItem.precio = Number(value) < 0 ? 0 : Number(value);
    }
    setItems(newItems);
  }

  const handleAddItem = () => {
    setItems([...items, { productoId: '', nombre: '', cantidad: 1, precio: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };
  
  const calcularTotal = () => {
     return items.reduce((total, item) => total + (item.cantidad * item.precio), 0).toFixed(2);
  }

  const resetForm = () => {
    setCreationMode('manual');
    setSelectedPedidoId('');
    setSelectedProveedorId('');
    setItems([]);
  }

  const handleCreateOC = () => {
    const proveedorId = creationMode === 'pedido' ? selectedPedido?.proveedorId : selectedProveedorId;
    if (!proveedorId || items.length === 0 || items.some(i => !i.productoId)) {
      toast({ variant: "destructive", title: "Error de validación", description: "Proveedor y al menos un producto son requeridos." });
      return;
    }

    const proveedor = proveedores.find(p => p.id === proveedorId);
    
    const nuevaOrden: OrdenCompra = {
      id: `OC-${String(ordenes.length + 1).padStart(3, '0')}`,
      presupuestoId: creationMode === 'pedido' ? 'N/A (Directo)' : 'N/A (Manual)',
      pedidoId: creationMode === 'pedido' ? selectedPedidoId : undefined,
      proveedor: proveedor?.nombre || 'Desconocido',
      proveedorId: proveedor?.id || '',
      fechaOrden: new Date().toISOString().split('T')[0],
      estado: "Pendiente de Recepción",
      total: parseFloat(calcularTotal()),
      items: items,
      usuario: "Usuario", // Hardcoded
      fechaCreacion: new Date().toISOString(),
    };

    setOrdenes([nuevaOrden, ...ordenes]);
    toast({
        title: "Orden de Compra Creada",
        description: `La OC ${nuevaOrden.id} ha sido creada exitosamente.`,
    });
    setOpenCreate(false);
  }

  useEffect(() => {
    if(!openCreate) resetForm();
  }, [openCreate]);


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
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="proveedor" className="text-right">Proveedor</Label>
                            <Select value={selectedProveedorId} onValueChange={setSelectedProveedorId}>
                                <SelectTrigger className="col-span-3"><SelectValue placeholder="Seleccione un proveedor" /></SelectTrigger>
                                <SelectContent>
                                    {proveedores.map(p => (<SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {creationMode === 'pedido' && (
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="pedido" className="text-right">Pedido de Compra</Label>
                            <Select value={selectedPedidoId} onValueChange={setSelectedPedidoId}>
                                <SelectTrigger className="col-span-3"><SelectValue placeholder="Seleccione un pedido pendiente" /></SelectTrigger>
                                <SelectContent>
                                    {pedidosSinPresupuesto.map(p => (
                                       <SelectItem key={p.id} value={p.id}>{p.id} - {p.proveedor}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                                                <Select value={item.productoId} onValueChange={(value) => handleItemChange(index, 'productoId', value)} disabled={creationMode === 'pedido'}>
                                                    <SelectTrigger><SelectValue placeholder="Seleccione producto" /></SelectTrigger>
                                                    <SelectContent>
                                                        {productos.map(p => (
                                                            <SelectItem key={p.id} value={p.id} disabled={items.some(i => i.productoId === p.id && i.productoId !== item.productoId)}>{p.nombre}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell><Input type="number" value={item.cantidad} onChange={(e) => handleItemChange(index, 'cantidad', e.target.value)} min="1" disabled={creationMode === 'pedido'}/></TableCell>
                                            <TableCell><Input type="number" value={item.precio} onChange={(e) => handleItemChange(index, 'precio', e.target.value)} min="0"/></TableCell>
                                            <TableCell className="text-right">${(item.cantidad * item.precio).toFixed(2)}</TableCell>
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
                <TableHead>ID Presupuesto</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenes.map((orden) => (
                <TableRow key={orden.id}>
                  <TableCell className="font-medium">{orden.id}</TableCell>
                  <TableCell>{orden.presupuestoId}</TableCell>
                  <TableCell>{orden.proveedor}</TableCell>
                  <TableCell>{orden.fechaOrden}</TableCell>
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
                         <DropdownMenuItem className="text-red-500" disabled={orden.estado !== 'Pendiente de Recepción'}>Cancelar Orden</DropdownMenuItem>
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
                <DialogTitle>Detalles de la Orden: {selectedOrden?.id}</DialogTitle>
                <DialogDescription>
                    Información detallada de la orden de compra.
                </DialogDescription>
            </DialogHeader>
            {selectedOrden && (
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p className="font-semibold">Proveedor:</p>
                            <p>{selectedOrden.proveedor}</p>
                        </div>
                        <div>
                            <p className="font-semibold">Fecha de la Orden:</p>
                            <p>{selectedOrden.fechaOrden}</p>
                        </div>
                         <div>
                            <p className="font-semibold">Origen:</p>
                            <p>{selectedOrden.presupuestoId.startsWith('PRE-') ? `Presupuesto (${selectedOrden.presupuestoId})` : selectedOrden.presupuestoId }</p>
                        </div>
                        <div>
                            <div className="font-semibold">Estado:</div>
                            <div><Badge variant={getStatusVariant(selectedOrden.estado)}>{selectedOrden.estado}</Badge></div>
                        </div>
                        <div>
                            <p className="font-semibold">Generado por:</p>
                            <p>{selectedOrden.usuario}</p>
                        </div>
                         <div>
                            <p className="font-semibold">Fecha de Generación:</p>
                            <p>{new Date(selectedOrden.fechaCreacion).toLocaleString()}</p>
                        </div>
                    </div>

                    <Card>
                        <CardHeader><CardTitle>Productos</CardTitle></CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Producto</TableHead>
                                        <TableHead>Cantidad</TableHead>
                                        <TableHead>Precio Unit.</TableHead>
                                        <TableHead className="text-right">Subtotal</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedOrden.items.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{item.nombre}</TableCell>
                                            <TableCell>{item.cantidad}</TableCell>
                                            <TableCell>${item.precio.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">${(item.cantidad * item.precio).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                     <div className="text-right font-bold text-xl mt-4">
                        Total: ${selectedOrden.total.toFixed(2)}
                    </div>
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

    