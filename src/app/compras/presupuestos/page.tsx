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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/command";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { initialPresupuestos, proveedores, productos, depositos } from "@/data";

type Item = {
  productoId: string;
  nombre: string;
  cantidad: number;
  precio: number;
};

type Pedido = {
  id: string;
  proveedor: string;
  proveedorId: string;
  deposito: string;
  depositoId: string;
  fechaPedido: string;
  estado: "Pendiente" | "Completado" | "Cancelado";
  total: number;
  items: Item[];
  observaciones?: string;
  usuario: string;
  fechaCreacion: string;
};

type Presupuesto = {
  id: string;
  pedidoId: string;
  proveedor: string;
  proveedorId: string;
  deposito: string;
  depositoId: string;
  fecha: string;
  total: number;
  estado: "Recibido" | "Aprobado" | "Rechazado";
  items: Item[];
  observaciones?: string;
  usuario: string;
  fechaCreacion: string;
};

type OrdenCompra = {
  id: string;
  presupuestoId: string;
  pedidoId?: string;
  proveedor: string;
  proveedorId: string;
  deposito: string;
  depositoId: string;
  fechaOrden: string;
  estado: "Pendiente de Recepción" | "Recibido Parcial" | "Recibido Completo" | "Cancelada";
  total: number;
  items: Item[];
  usuario: string;
  fechaCreacion: string;
};

export default function PresupuestosProveedorPage() {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [selectedPresupuesto, setSelectedPresupuesto] = useState<Presupuesto | null>(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const { toast } = useToast();

  // Form state
  const [creationMode, setCreationMode] = useState<"pedido" | "manual">("pedido");
  const [selectedPedidoId, setSelectedPedidoId] = useState('');
  const [selectedProveedorId, setSelectedProveedorId] = useState('');
  const [selectedDepositoId, setSelectedDepositoId] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [observaciones, setObservaciones] = useState('');
  
  const selectedPedido = pedidos.find(p => p.id === selectedPedidoId);
  const pedidosConPresupuesto = presupuestos.map(p => p.pedidoId);
  const pedidosPendientes = pedidos.filter(p => p.estado === 'Pendiente' && !pedidosConPresupuesto.includes(p.id));

  useEffect(() => {
    const storedPresupuestos = localStorage.getItem("presupuestos");
    setPresupuestos(storedPresupuestos ? JSON.parse(storedPresupuestos) : initialPresupuestos);

    const storedPedidos = localStorage.getItem("pedidos");
    setPedidos(storedPedidos ? JSON.parse(storedPedidos) : []);
  }, []);

  useEffect(() => {
    localStorage.setItem("presupuestos", JSON.stringify(presupuestos));
  }, [presupuestos]);


  useEffect(() => {
    if (creationMode === 'pedido' && selectedPedido) {
      const newItems = selectedPedido.items.map(item => ({
        ...item,
        precio: item.precio
      }));
      setItems(newItems);
      setSelectedProveedorId(selectedPedido.proveedorId);
      setSelectedDepositoId(selectedPedido.depositoId);
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
      default: return "outline";
    }
  };

  const handleAddItem = () => {
    setItems([...items, { productoId: '', nombre: '', cantidad: 1, precio: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

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
  
  const calcularTotal = () => {
     return items.reduce((total, item) => total + (item.cantidad * item.precio), 0).toFixed(2);
  }

  const resetForm = () => {
    setCreationMode('pedido');
    setSelectedPedidoId('');
    setSelectedProveedorId('');
    setSelectedDepositoId('');
    setItems([]);
    setObservaciones('');
  }

  const handleCreatePresupuesto = () => {
    const proveedorId = creationMode === 'pedido' ? selectedPedido?.proveedorId : selectedProveedorId;
    const depositoId = creationMode === 'pedido' ? selectedPedido?.depositoId : selectedDepositoId;

    if (!proveedorId || !depositoId || items.length === 0 || (creationMode === 'manual' && items.some(i => !i.productoId))) {
      toast({
        variant: "destructive",
        title: "Error de validación",
        description: "Debe seleccionar un proveedor, un depósito y tener al menos un item."
      });
      return;
    }

    if (creationMode === 'pedido' && pedidosConPresupuesto.includes(selectedPedidoId)) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Ya existe un presupuesto para el pedido seleccionado."
        });
        return;
    }
    
    const proveedor = proveedores.find(p => p.id === proveedorId);
    const deposito = depositos.find(d => d.id === depositoId);

    const nuevoPresupuesto: Presupuesto = {
      id: `PRE-${String(presupuestos.length + 1).padStart(3, '0')}`,
      pedidoId: creationMode === 'pedido' ? selectedPedidoId : 'N/A (Manual)',
      proveedor: proveedor?.nombre || 'N/A',
      proveedorId: proveedor?.id || '',
      deposito: deposito?.nombre || 'N/A',
      depositoId: deposito?.id || '',
      fecha: new Date().toISOString().split('T')[0],
      total: parseFloat(calcularTotal()),
      estado: 'Recibido',
      items: items,
      observaciones,
      usuario: "Usuario", // Hardcoded for now
      fechaCreacion: new Date().toISOString(),
    }

    setPresupuestos([nuevoPresupuesto, ...presupuestos]);
    toast({
      title: "Presupuesto Registrado",
      description: `El presupuesto ${nuevoPresupuesto.id} ha sido creado.`,
    });
    setOpenCreate(false);
  }

  useEffect(() => {
    if(!openCreate) {
        resetForm();
    }
  }, [openCreate]);


  const handleOpenDetails = (presupuesto: Presupuesto) => {
    setSelectedPresupuesto(presupuesto);
    setOpenDetails(true);
  }

  const handleUpdateStatus = (presupuestoId: string, newStatus: "Aprobado" | "Rechazado") => {
    let presupuestoAprobado: Presupuesto | undefined;
    const updatedPresupuestos = presupuestos.map(p => {
        if (p.id === presupuestoId) {
            presupuestoAprobado = { ...p, estado: newStatus };
            return presupuestoAprobado;
        }
        return p;
    });

    setPresupuestos(updatedPresupuestos);

    if (newStatus === 'Aprobado' && presupuestoAprobado) {
        const storedOrdenes = localStorage.getItem("ordenes_compra") || "[]";
        const ordenes: OrdenCompra[] = JSON.parse(storedOrdenes);
        
        const nuevaOrden: OrdenCompra = {
            id: `OC-${String(ordenes.length + 1).padStart(3, '0')}`,
            presupuestoId: presupuestoAprobado.id,
            pedidoId: presupuestoAprobado.pedidoId.startsWith('PED-') ? presupuestoAprobado.pedidoId : undefined,
            proveedor: presupuestoAprobado.proveedor,
            proveedorId: presupuestoAprobado.proveedorId,
            deposito: presupuestoAprobado.deposito,
            depositoId: presupuestoAprobado.depositoId,
            fechaOrden: new Date().toISOString().split('T')[0],
            estado: "Pendiente de Recepción",
            total: presupuestoAprobado.total,
            items: presupuestoAprobado.items,
            usuario: "Usuario", // Hardcoded
            fechaCreacion: new Date().toISOString(),
        };

        const nuevasOrdenes = [nuevaOrden, ...ordenes];
        localStorage.setItem("ordenes_compra", JSON.stringify(nuevasOrdenes));
        window.dispatchEvent(new StorageEvent('storage', { key: 'ordenes_compra', newValue: JSON.stringify(nuevasOrdenes) }));

        toast({
            title: "Presupuesto Aprobado y Orden de Compra Generada",
            description: `La OC ${nuevaOrden.id} ha sido creada.`,
        });
    } else {
        toast({
            title: `Presupuesto ${newStatus}`,
            description: `El presupuesto ${presupuestoId} ha sido marcado como ${newStatus.toLowerCase()}.`,
            variant: newStatus === 'Rechazado' ? 'destructive' : 'default',
        });
    }
  }

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
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Presupuesto</DialogTitle>
              <DialogDescription>
                Seleccione un pedido y registre los precios del proveedor, o registre manualmente.
              </DialogDescription>
            </DialogHeader>
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
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="pedido" className="text-right">
                    Pedido de Compra
                  </Label>
                  <div className="col-span-3">
                      <Combobox
                          options={pedidosPendientes.map(p => ({ value: p.id, label: `${p.id} - ${p.proveedor}` }))}
                          value={selectedPedidoId}
                          onChange={setSelectedPedidoId}
                          placeholder="Seleccione un pedido pendiente"
                          searchPlaceholder="Buscar pedido..."
                      />
                  </div>
                </div>
              ) : (
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
             
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="observaciones" className="text-right">
                  Observaciones
                </Label>
                <Textarea id="observaciones" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="col-span-3" placeholder="Añadir observaciones..."/>
              </div>

              {(selectedPedido || creationMode === 'manual') && (
                 <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Productos del Presupuesto</CardTitle>
                    </CardHeader>
                    <CardContent>
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
                                                value={item.productoId}
                                                onChange={(value) => handleItemChange(index, 'productoId', value)}
                                                disabled={creationMode === 'pedido' && !!item.productoId}
                                                placeholder="Seleccione producto"
                                                searchPlaceholder="Buscar producto..."
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input type="number" value={item.cantidad} onChange={(e) => handleItemChange(index, 'cantidad', e.target.value)} min="1" disabled={creationMode === 'pedido'}/>
                                        </TableCell>
                                        <TableCell>
                                            <Input type="number" value={item.precio} onChange={(e) => handleItemChange(index, 'precio', e.target.value)} min="0"/>
                                        </TableCell>
                                        <TableCell className="text-right">
                                          ${(item.cantidad * item.precio).toFixed(2)}
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
                         <div className="flex justify-between items-center mt-4">
                            <Button variant="outline" size="sm" onClick={handleAddItem} disabled={creationMode === 'pedido'}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Añadir Producto
                            </Button>
                            <div className="text-right font-bold text-lg">
                                Total: ${calcularTotal()}
                            </div>
                        </div>
                    </CardContent>
                 </Card>
              )}
             
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
              <Button onClick={handleCreatePresupuesto} disabled={(creationMode === 'pedido' && !selectedPedidoId) || (creationMode === 'manual' && (!selectedProveedorId || !selectedDepositoId))}>Registrar</Button>
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
                <TableHead>Depósito</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {presupuestos.map((presupuesto) => (
                <TableRow key={presupuesto.id}>
                  <TableCell className="font-medium">{presupuesto.id}</TableCell>
                  <TableCell>{presupuesto.pedidoId}</TableCell>
                  <TableCell>{presupuesto.proveedor}</TableCell>
                  <TableCell>{presupuesto.deposito}</TableCell>
                  <TableCell>{presupuesto.fecha}</TableCell>
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
                                ¿Estás seguro de que deseas aprobar este presupuesto? Esta acción generará una Orden de Compra.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cerrar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleUpdateStatus(presupuesto.id, 'Aprobado')}>Confirmar</AlertDialogAction>
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
                                Esta acción no se puede deshacer. ¿Estás seguro de que deseas rechazar este presupuesto?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cerrar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleUpdateStatus(presupuesto.id, 'Rechazado')} className="bg-destructive hover:bg-destructive/90">Confirmar</AlertDialogAction>
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
                <DialogTitle>Detalles del Presupuesto: {selectedPresupuesto?.id}</DialogTitle>
                <DialogDescription>
                    Información detallada del presupuesto recibido del proveedor.
                </DialogDescription>
            </DialogHeader>
            {selectedPresupuesto && (
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p className="font-semibold">Proveedor:</p>
                            <p>{selectedPresupuesto.proveedor}</p>
                        </div>
                        <div>
                            <p className="font-semibold">Depósito:</p>
                            <p>{selectedPresupuesto.deposito}</p>
                        </div>
                        <div>
                            <p className="font-semibold">Fecha:</p>
                            <p>{selectedPresupuesto.fecha}</p>
                        </div>
                         <div>
                            <p className="font-semibold">Pedido ID:</p>
                            <p>{selectedPresupuesto.pedidoId}</p>
                        </div>
                        <div>
                            <div className="font-semibold">Estado:</div>
                            <Badge variant={getStatusVariant(selectedPresupuesto.estado)}>{selectedPresupuesto.estado}</Badge>
                        </div>
                        <div>
                            <p className="font-semibold">Registrado por:</p>
                            <p>{selectedPresupuesto.usuario}</p>
                        </div>
                         <div>
                            <p className="font-semibold">Fecha de Registro:</p>
                            <p>{new Date(selectedPresupuesto.fechaCreacion).toLocaleString()}</p>
                        </div>
                    </div>
                     <div>
                        <p className="font-semibold">Observaciones:</p>
                        <p className="text-muted-foreground">{selectedPresupuesto.observaciones || 'Sin observaciones'}</p>
                    </div>

                    <Card>
                        <CardHeader><CardTitle>Productos Cotizados</CardTitle></CardHeader>
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
                                    {selectedPresupuesto.items.map((item, index) => (
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
                        Total Presupuestado: ${selectedPresupuesto.total.toFixed(2)}
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
