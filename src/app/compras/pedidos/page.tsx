
"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, addDoc, getDocs, doc, updateDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, PlusCircle, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogDescription as DialogDescriptionComponent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Combobox } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";


// Tipos de datos de referenciales
type Producto = { id: string; nombre: string; precio_referencia: number; };
type ProveedorRef = { id: string; nombre: string; };
type DepositoRef = { id: string; nombre: string; };

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
  observaciones?: string;
  usuario_id: string;
  fecha_creacion: any;
};

const initialPedidoState: Omit<Pedido, 'id' | 'fecha_pedido' | 'fecha_creacion' | 'usuario_id' | 'total' | 'proveedor_nombre' | 'deposito_nombre'> = {
    proveedor_id: '',
    deposito_id: '',
    estado: 'Pendiente',
    items: [],
    observaciones: '',
}

export default function PedidosPage() {
  const { toast } = useToast();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorRef[]>([]);
  const [depositos, setDepositos] = useState<DepositoRef[]>([]);

  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);

  // Estado del formulario (creación/edición)
  const [isEditing, setIsEditing] = useState(false);
  const [currentPedido, setCurrentPedido] = useState(initialPedidoState);
  const [currentPedidoId, setCurrentPedidoId] = useState<string | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [proveedorFilter, setProveedorFilter] = useState('');
  const [depositoFilter, setDepositoFilter] = useState('');


  const fetchData = async () => {
    setLoading(true);
    try {
      // Pedidos
      const pedidosCollection = collection(db, 'pedidos_compra');
      const q = query(pedidosCollection, orderBy("fecha_creacion", "desc"));
      const pedidosSnapshot = await getDocs(q);
      const pedidosList = pedidosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pedido));
      setPedidos(pedidosList);

      // Referenciales
      const productosSnapshot = await getDocs(query(collection(db, 'productos'), orderBy("nombre")));
      setProductos(productosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Producto)));
      
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
  
  const filteredPedidos = useMemo(() => {
    return pedidos.filter(pedido => {
        const searchTermLower = searchTerm.toLowerCase();
        
        const matchesSearchTerm = searchTerm === '' ||
            pedido.id.toLowerCase().includes(searchTermLower) ||
            pedido.proveedor_nombre.toLowerCase().includes(searchTermLower) ||
            pedido.deposito_nombre.toLowerCase().includes(searchTermLower) ||
            pedido.items.some(item => item.nombre.toLowerCase().includes(searchTermLower));

        const matchesStatus = statusFilter === '' || pedido.estado === statusFilter;
        const matchesProveedor = proveedorFilter === '' || pedido.proveedor_id === proveedorFilter;
        const matchesDeposito = depositoFilter === '' || pedido.deposito_id === depositoFilter;

        return matchesSearchTerm && matchesStatus && matchesProveedor && matchesDeposito;
    });
}, [pedidos, searchTerm, statusFilter, proveedorFilter, depositoFilter]);

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
  
  const handleInputChange = (field: keyof Omit<Pedido, 'id' | 'items'>, value: string) => {
    setCurrentPedido(prev => ({ ...prev, [field]: value }));
  };

  const handleAddItem = () => {
    setCurrentPedido(prev => ({
        ...prev,
        items: [...prev.items, { producto_id: '', nombre: '', cantidad: 1, precio_estimado: 0 }]
    }));
  };

  const handleRemoveItem = (index: number) => {
    setCurrentPedido(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
    }));
  };
  
  const handleItemChange = (index: number, field: keyof ItemPedido, value: string | number) => {
    const newItems = [...currentPedido.items];
    const currentItem = newItems[index];

    if (field === 'producto_id') {
        const productoId = value as string;
        const producto = productos.find(p => p.id === productoId);
        
        if (newItems.some((item, i) => item.producto_id === productoId && i !== index)) {
            toast({
                variant: "destructive",
                title: "Producto duplicado", 
                description: `El producto ${producto?.nombre} ya está en la lista.`
            });
            return;
        }
        currentItem.producto_id = productoId;
        currentItem.precio_estimado = producto ? producto.precio_referencia : 0;
        currentItem.nombre = producto ? producto.nombre : '';

    } else if (field === 'cantidad') {
      currentItem.cantidad = Number(value) < 1 ? 1 : Number(value);
    } else if (field === 'precio_estimado') {
        currentItem.precio_estimado = Number(value) < 0 ? 0 : Number(value);
    }
    
    setCurrentPedido(prev => ({ ...prev, items: newItems }));
  };

  const calcularTotal = () => {
    return currentPedido.items.reduce((total, item) => total + (item.cantidad * item.precio_estimado), 0).toFixed(2);
  }

  const handleOpenDialog = (pedido: Pedido | null = null) => {
    if (pedido) {
      setIsEditing(true);
      setCurrentPedidoId(pedido.id);
      setCurrentPedido({
          proveedor_id: pedido.proveedor_id,
          deposito_id: pedido.deposito_id,
          estado: pedido.estado,
          items: pedido.items,
          observaciones: pedido.observaciones
      });
    } else {
      setIsEditing(false);
      setCurrentPedidoId(null);
      setCurrentPedido(initialPedidoState);
    }
    setOpenDialog(true);
  }

  const handleSavePedido = async () => {
    const { proveedor_id, deposito_id, items } = currentPedido;

    if(!proveedor_id || !deposito_id || items.length === 0 || items.some(i => !i.producto_id)) {
        toast({
            variant: "destructive",
            title: "Error de validación",
            description: "Por favor, complete todos los campos requeridos (proveedor, depósito y productos).",
        })
        return;
    }
    
    const proveedorSeleccionado = proveedores.find(p => p.id === proveedor_id);
    const depositoSeleccionado = depositos.find(d => d.id === deposito_id);
    const total = parseFloat(calcularTotal());

    try {
        if(isEditing && currentPedidoId) {
             const pedidoRef = doc(db, 'pedidos_compra', currentPedidoId);
             await updateDoc(pedidoRef, {
                 ...currentPedido,
                 proveedor_nombre: proveedorSeleccionado?.nombre || 'Desconocido',
                 deposito_nombre: depositoSeleccionado?.nombre || 'Desconocido',
                 total,
             });
             toast({ title: 'Pedido Actualizado', description: 'El pedido ha sido actualizado.' });
        } else {
            const nuevoPedido = {
                ...currentPedido,
                proveedor_nombre: proveedorSeleccionado?.nombre || 'Desconocido',
                deposito_nombre: depositoSeleccionado?.nombre || 'Desconocido',
                total,
                fecha_pedido: new Date().toISOString().split('T')[0],
                usuario_id: "user-demo", // Hardcoded
                fecha_creacion: serverTimestamp()
            };
            await addDoc(collection(db, "pedidos_compra"), nuevoPedido);
            toast({ title: "Pedido Creado", description: `El pedido ha sido creado.` });
        }
        
        await fetchData();
        setOpenDialog(false);
    } catch (e) {
        console.error("Error saving document: ", e);
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el pedido." });
    }
  };

  const handleOpenDetails = (pedido: Pedido) => {
    setSelectedPedido(pedido);
    setOpenDetails(true);
  }

  const handleCancelPedido = async (pedidoId: string) => {
    try {
      const pedidoRef = doc(db, "pedidos_compra", pedidoId);
      await updateDoc(pedidoRef, { estado: 'Cancelado' });
      setPedidos(pedidos.map(p => p.id === pedidoId ? {...p, estado: 'Cancelado'} : p));
      toast({
          title: "Pedido Cancelado",
          description: `El pedido ${pedidoId.substring(0,7)} ha sido cancelado.`,
          variant: "destructive",
      })
    } catch (error) {
       console.error("Error cancelling pedido: ", error);
       toast({ variant: "destructive", title: "Error", description: "No se pudo cancelar el pedido." });
    }
  }

  if (loading) return <p>Cargando datos...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pedidos de Compra</h1>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Crear Pedido
        </Button>
      </div>
      
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Editar Pedido de Compra' : 'Crear Nuevo Pedido de Compra'}</DialogTitle>
              <DialogDescriptionComponent>
                {isEditing ? 'Modifique los detalles del pedido.' : 'Complete los detalles para crear un nuevo pedido.'}
              </DialogDescriptionComponent>
            </DialogHeader>
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proveedor">Proveedor</Label>
                  <Combobox
                      options={proveedores.map(p => ({ value: p.id, label: p.nombre }))}
                      value={currentPedido.proveedor_id}
                      onChange={(value) => handleInputChange('proveedor_id', value)}
                      placeholder="Seleccione un proveedor"
                      searchPlaceholder="Buscar proveedor..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposito">Depósito Destino</Label>
                  <Combobox
                      options={depositos.map(d => ({ value: d.id, label: d.nombre }))}
                      value={currentPedido.deposito_id}
                      onChange={(value) => handleInputChange('deposito_id', value)}
                      placeholder="Seleccione un depósito"
                      searchPlaceholder="Buscar depósito..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea id="observaciones" value={currentPedido.observaciones} onChange={(e) => handleInputChange('observaciones', e.target.value)} placeholder="Añadir observaciones..."/>
              </div>

              {isEditing && (
                <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
                    <Select
                        value={currentPedido.estado}
                        onValueChange={(value) => handleInputChange('estado', value as any)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccione un estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Pendiente">Pendiente</SelectItem>
                            <SelectItem value="Completado">Completado</SelectItem>
                            <SelectItem value="Cancelado">Cancelado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
              )}

            <div className="flex-grow overflow-y-auto pr-2 -mr-2">
              <Card>
                <CardHeader>
                    <CardTitle>Productos</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[300px]">
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
                            {currentPedido.items.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>
                                        <Combobox
                                            options={productos.map(p => ({ value: p.id, label: p.nombre }))}
                                            value={item.producto_id}
                                            onChange={(value) => handleItemChange(index, 'producto_id', value)}
                                            placeholder="Seleccione producto"
                                            searchPlaceholder="Buscar producto..."
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" value={item.cantidad} onChange={(e) => handleItemChange(index, 'cantidad', e.target.value)} min="1"/>
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" value={item.precio_estimado.toFixed(2)} onChange={(e) => handleItemChange(index, 'precio_estimado', e.target.value)} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        ${(item.cantidad * item.precio_estimado).toFixed(2)}
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
                    </ScrollArea>
                </CardContent>
              </Card>
            </div>
            
            <DialogFooter className="pt-4 border-t">
               <div className="flex w-full justify-between items-center">
                  <Button variant="outline" size="sm" onClick={handleAddItem}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Añadir Producto
                  </Button>
                  <div className="flex items-center gap-4">
                    <div className="text-right font-bold text-lg">
                        Total: ${calcularTotal()}
                    </div>
                    <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancelar</Button>
                    <Button onClick={handleSavePedido} disabled={currentPedido.items.length === 0 || currentPedido.items.some(i => !i.producto_id) || !currentPedido.proveedor_id || !currentPedido.deposito_id}>
                      {isEditing ? 'Guardar Cambios' : 'Crear Pedido'}
                    </Button>
                  </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Pedidos</CardTitle>
           <CardDescription>
                Filtre y busque a través de los pedidos de compra.
            </CardDescription>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
                <Input 
                    placeholder="Buscar por ID, producto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="md:col-span-2"
                />
                <Combobox
                    options={[ {value: '', label: 'Todos los proveedores'}, ...proveedores.map(p => ({ value: p.id, label: p.nombre }))]}
                    value={proveedorFilter}
                    onChange={setProveedorFilter}
                    placeholder="Filtrar por proveedor"
                />
                 <Combobox
                    options={[ {value: '', label: 'Todos los estados'}, {value: 'Pendiente', label: 'Pendiente'}, {value: 'Completado', label: 'Completado'}, {value: 'Cancelado', label: 'Cancelado'}]}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    placeholder="Filtrar por estado"
                />
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Pedido</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Depósito</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total Estimado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPedidos.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell className="font-medium">{pedido.id.substring(0,7)}</TableCell>
                  <TableCell>{pedido.proveedor_nombre}</TableCell>
                  <TableCell>{pedido.deposito_nombre}</TableCell>
                  <TableCell>{pedido.fecha_pedido}</TableCell>
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
                        <DropdownMenuItem 
                            onClick={() => handleOpenDialog(pedido)} 
                            disabled={pedido.estado === 'Cancelado' || pedido.estado === 'Completado'}
                        >
                            <Edit className="mr-2 h-4 w-4" />Editar
                        </DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={pedido.estado === 'Cancelado' || pedido.estado === 'Completado'}>
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
           {filteredPedidos.length === 0 && <p className="text-center text-muted-foreground mt-4">No se encontraron pedidos.</p>}
        </CardContent>
      </Card>

      <Dialog open={openDetails} onOpenChange={setOpenDetails}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Detalles del Pedido: {selectedPedido?.id.substring(0, 7)}</DialogTitle>
            <DialogDescriptionComponent>
              Información detallada del pedido de compra.
            </DialogDescriptionComponent>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto pr-6 -mr-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="font-semibold">Proveedor:</p>
                  <p>{selectedPedido?.proveedor_nombre}</p>
                </div>
                <div>
                  <p className="font-semibold">Depósito Destino:</p>
                  <p>{selectedPedido?.deposito_nombre}</p>
                </div>
                <div>
                  <p className="font-semibold">Fecha del Pedido:</p>
                  <p>{selectedPedido?.fecha_pedido}</p>
                </div>
                <div>
                  <div className="font-semibold">Estado:</div>
                  {selectedPedido && <Badge variant={getStatusVariant(selectedPedido.estado)}>{selectedPedido.estado}</Badge>}
                </div>
                <div>
                  <p className="font-semibold">Registrado por:</p>
                  <p>{selectedPedido?.usuario_id}</p>
                </div>
                <div>
                  <p className="font-semibold">Fecha de Creación:</p>
                  <p>{selectedPedido?.fecha_creacion?.toDate().toLocaleString()}</p>
                </div>
              </div>
              <div className="space-y-1 mb-4">
                <p className="font-semibold">Observaciones:</p>
                <p className="text-muted-foreground">{selectedPedido?.observaciones || 'Sin observaciones'}</p>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Productos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead>Precio Estimado</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPedido?.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.nombre}</TableCell>
                            <TableCell>{item.cantidad}</TableCell>
                            <TableCell>${item.precio_estimado.toFixed(2)}</TableCell>
                            <TableCell className="text-right">${(item.cantidad * item.precio_estimado).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
          </div>
          <DialogFooter className="pt-4 border-t">
             <div className="flex justify-between items-center w-full">
                <div className="text-right font-bold text-lg">
                  Total: ${selectedPedido?.total.toFixed(2)}
                </div>
                <Button variant="outline" onClick={() => setOpenDetails(false)}>Cerrar</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

    

