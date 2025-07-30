"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, PlusCircle, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type Pedido = {
  id: string;
  proveedor: string;
  proveedorId: string;
  fechaPedido: string;
  estado: "Pendiente" | "Completado" | "Cancelado";
  total: number;
  items: ItemPedido[];
  observaciones?: string;
  usuario: string;
  fechaCreacion: string;
};

const initialPedidos: Pedido[] = [
  {
    id: "PED-001",
    proveedor: "Proveedor A",
    proveedorId: "1",
    fechaPedido: "2024-07-30",
    estado: "Pendiente",
    total: 1500.00,
    items: [
        { productoId: '101', nombre: 'Producto X', cantidad: 10, precio: 150 },
    ],
    usuario: "Usuario Demo",
    fechaCreacion: "2024-07-30T10:00:00Z"
  },
  {
    id: "PED-002",
    proveedor: "Proveedor B",
    proveedorId: "2",
    fechaPedido: "2024-07-29",
    estado: "Completado",
    total: 750.50,
    items: [
        { productoId: '102', nombre: 'Producto Y', cantidad: 30, precio: 25.50 },
    ],
    usuario: "Usuario Demo",
    fechaCreacion: "2024-07-29T11:30:00Z"
  },
  {
    id: "PED-003",
    proveedor: "Proveedor C",
    proveedorId: "3",
    fechaPedido: "2024-07-28",
    estado: "Cancelado",
    total: 200.00,
    items: [
        { productoId: '103', nombre: 'Producto Z', cantidad: 4, precio: 50 },
    ],
    usuario: "Usuario Demo",
    fechaCreacion: "2024-07-28T14:00:00Z"
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

type ItemPedido = {
  productoId: string;
  nombre: string;
  cantidad: number;
  precio: number;
};

export default function PedidosPage() {
  const { toast } = useToast();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);

  const [items, setItems] = useState<ItemPedido[]>([]);
  const [proveedorId, setProveedorId] = useState('');
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    const storedPedidos = localStorage.getItem("pedidos");
    if (storedPedidos) {
      setPedidos(JSON.parse(storedPedidos));
    } else {
      setPedidos(initialPedidos);
    }
  }, []);

  useEffect(() => {
    if (pedidos.length > 0) {
        localStorage.setItem("pedidos", JSON.stringify(pedidos));
    }
  }, [pedidos]);

  const getStatusVariant = (status: string): "secondary" | "default" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case "pendiente":
        return "secondary";
      case "completado":
        return "default";
      case "cancelado":
        return "destructive";
      default:
        return "outline";
    }
  };

  const handleAddItem = () => {
    setItems([...items, { productoId: '', nombre: '', cantidad: 1, precio: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };
  
 const handleItemChange = (index: number, field: keyof ItemPedido, value: string | number) => {
    const newItems = [...items];
    const currentItem = newItems[index];

    if (field === 'productoId') {
        const productoId = value as string;
        const producto = productos.find(p => p.id === productoId);
        
        const existingItemIndex = items.findIndex((item, i) => item.productoId === productoId && i !== index);

        if (existingItemIndex !== -1) {
            toast({
                variant: "destructive",
                title: "Producto duplicado", 
                description: `El producto ${producto?.nombre} ya está en la lista. No se puede añadir de nuevo.`
            });
        } else {
            currentItem.productoId = productoId;
            currentItem.precio = producto ? producto.precio : 0;
            currentItem.nombre = producto ? producto.nombre : '';
            setItems(newItems);
        }

    } else if (field === 'cantidad') {
      currentItem.cantidad = Number(value) < 1 ? 1 : Number(value);
    } else if (field === 'precio') {
        currentItem.precio = Number(value) < 0 ? 0 : Number(value);
    }
    
    setItems(newItems);
  };

  const calcularTotal = () => {
    return items.reduce((total, item) => total + (item.cantidad * item.precio), 0).toFixed(2);
  }

  const resetForm = () => {
    setItems([]);
    setProveedorId('');
    setObservaciones('');
  }

  const handleCreatePedido = () => {
    if(!proveedorId || items.length === 0 || items.some(i => !i.productoId)) {
        toast({
            variant: "destructive",
            title: "Error de validación",
            description: "Por favor, complete todos los campos requeridos.",
        })
        return;
    }
    const proveedorSeleccionado = proveedores.find(p => p.id === proveedorId);
    const nuevoPedido: Pedido = {
        id: `PED-${String(pedidos.length + 1).padStart(3, '0')}`,
        proveedor: proveedorSeleccionado?.nombre || 'Desconocido',
        proveedorId: proveedorId,
        fechaPedido: new Date().toISOString().split('T')[0],
        estado: 'Pendiente',
        total: parseFloat(calcularTotal()),
        items: items,
        observaciones: observaciones,
        usuario: "Usuario", // Hardcoded for now
        fechaCreacion: new Date().toISOString()
    }
    setPedidos([nuevoPedido, ...pedidos]);
    toast({
        title: "Pedido Creado",
        description: `El pedido ${nuevoPedido.id} ha sido creado exitosamente.`,
    })
    setOpenCreate(false);
  };

  useEffect(() => {
    if(!openCreate) {
        resetForm();
    }
  }, [openCreate]);


  const handleOpenDetails = (pedido: Pedido) => {
    setSelectedPedido(pedido);
    setOpenDetails(true);
  }

  const handleCancelPedido = (pedidoId: string) => {
    setPedidos(pedidos.map(p => p.id === pedidoId ? {...p, estado: 'Cancelado'} : p));
    toast({
        title: "Pedido Cancelado",
        description: `El pedido ${pedidoId} ha sido cancelado.`,
        variant: "destructive",
    })
  }
  
  const handleGeneratePresupuesto = (pedidoId: string) => {
     toast({
        title: "Función no implementada",
        description: `La generación de presupuesto para el pedido ${pedidoId} estará disponible pronto.`,
    })
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pedidos de Compra</h1>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear Pedido
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Pedido de Compra</DialogTitle>
              <DialogDescription>
                Complete los detalles para crear un nuevo pedido.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="proveedor" className="text-right">
                  Proveedor
                </Label>
                <Select value={proveedorId} onValueChange={setProveedorId}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleccione un proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {proveedores.map(p => (
                       <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="observaciones" className="text-right">
                  Observaciones
                </Label>
                <Textarea id="observaciones" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="col-span-3" placeholder="Añadir observaciones..."/>
              </div>

              <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Productos</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead className="w-[150px]">Cantidad</TableHead>
                                <TableHead className="w-[150px]">Precio Estimado</TableHead>
                                <TableHead className="w-[150px] text-right">Subtotal</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>
                                        <Select value={item.productoId} onValueChange={(value) => handleItemChange(index, 'productoId', value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione un producto" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {productos.map(p => (
                                                    <SelectItem key={p.id} value={p.id} disabled={items.some(i => i.productoId === p.id && i !== index)}>
                                                        {p.nombre}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" value={item.cantidad} onChange={(e) => handleItemChange(index, 'cantidad', e.target.value)} min="1"/>
                                    </TableCell>
                                     <TableCell>
                                        <Input type="number" value={item.precio.toFixed(2)} onChange={(e) => handleItemChange(index, 'precio', e.target.value)} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        ${(item.cantidad * item.precio).toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <div className="flex justify-between items-center mt-4">
                        <Button variant="outline" size="sm" onClick={handleAddItem}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Añadir Producto
                        </Button>
                        <div className="text-right font-bold text-lg">
                            Total: ${calcularTotal()}
                        </div>
                    </div>
                </CardContent>
              </Card>

            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
              <Button onClick={handleCreatePedido} disabled={items.length === 0 || items.some(i => !i.productoId) || !proveedorId}>Crear Pedido</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Pedido</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total Estimado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell className="font-medium">{pedido.id}</TableCell>
                  <TableCell>{pedido.proveedor}</TableCell>
                  <TableCell>{pedido.fechaPedido}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(pedido.estado)}>
                      {pedido.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    ${pedido.total.toFixed(2)}
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
                        <DropdownMenuItem onClick={() => handleOpenDetails(pedido)}>Ver Detalles</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGeneratePresupuesto(pedido.id)}>Generar Presupuesto</DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={pedido.estado === 'Cancelado'}>
                                    <span className="text-red-500">Cancelar</span>
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto cancelará permanentemente el pedido.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cerrar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleCancelPedido(pedido.id)} className="bg-destructive hover:bg-destructive/90">Confirmar</AlertDialogAction>
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
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Detalles del Pedido: {selectedPedido?.id}</DialogTitle>
                <DialogDescription>
                    Información detallada del pedido de compra.
                </DialogDescription>
            </DialogHeader>
            {selectedPedido && (
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p className="font-semibold">Proveedor:</p>
                            <p>{selectedPedido.proveedor}</p>
                        </div>
                        <div>
                            <p className="font-semibold">Fecha del Pedido:</p>
                            <p>{selectedPedido.fechaPedido}</p>
                        </div>
                        <div>
                            <p className="font-semibold">Estado:</p>
                            <Badge variant={getStatusVariant(selectedPedido.estado)}>{selectedPedido.estado}</Badge>
                        </div>
                        <div>
                            <p className="font-semibold">Registrado por:</p>
                            <p>{selectedPedido.usuario}</p>
                        </div>
                         <div>
                            <p className="font-semibold">Fecha de Creación:</p>
                            <p>{new Date(selectedPedido.fechaCreacion).toLocaleString()}</p>
                        </div>
                    </div>
                     <div>
                        <p className="font-semibold">Observaciones:</p>
                        <p className="text-muted-foreground">{selectedPedido.observaciones || 'Sin observaciones'}</p>
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
                                    {selectedPedido.items.map((item, index) => (
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
                        Total: ${selectedPedido.total.toFixed(2)}
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

    