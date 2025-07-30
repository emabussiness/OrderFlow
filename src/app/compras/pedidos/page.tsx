"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const pedidos = [
  {
    id: "PED-001",
    proveedor: "Proveedor A",
    fecha: "2024-07-30",
    estado: "Pendiente",
    total: 1500.00,
  },
  {
    id: "PED-002",
    proveedor: "Proveedor B",
    fecha: "2024-07-29",
    estado: "Completado",
    total: 750.50,
  },
  {
    id: "PED-003",
    proveedor: "Proveedor C",
    fecha: "2024-07-28",
    estado: "Cancelado",
    total: 200.00,
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
  cantidad: number;
  precio: number;
};

export default function PedidosPage() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ItemPedido[]>([]);

  const getStatusVariant = (status: string) => {
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
    setItems([...items, { productoId: '', cantidad: 1, precio: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };
  
  const handleItemChange = (index: number, field: 'productoId' | 'cantidad', value: string | number) => {
    const newItems = [...items];

    if (field === 'productoId') {
        const productoId = value as string;
        const productoExistente = items.find((item, i) => item.productoId === productoId && i !== index);

        if (productoExistente) {
            // Si el producto ya existe en otra linea, incrementamos la cantidad y eliminamos esta
            const itemsSinDuplicado = items.filter((item, i) => item.productoId !== productoId || i === index);
            const itemOriginalIndex = itemsSinDuplicado.findIndex((item) => item.productoId === productoId);
            
            if (itemOriginalIndex !== -1) {
                itemsSinDuplicado[itemOriginalIndex].cantidad += newItems[index].cantidad;
            }
            
            // Remove the current row which is now a duplicate
            const finalItems = newItems.filter((_, i) => i !== index);
            const originalItem = finalItems.find(item => item.productoId === productoId);
            if(originalItem) {
                originalItem.cantidad += 1;
                setItems(finalItems.filter((_,i) => i !== index));
            } else {
                 const itemToUpdate = finalItems.find(item => item.productoId === newItems[index].productoId);
                 if (itemToUpdate) {
                     itemToUpdate.cantidad += 1;
                 }
                 setItems(finalItems.filter((_, i) => i !== index));
            }
            // Find the original item and increment its quantity
            const finalItemsWithIncrement = newItems.filter((_, i) => i !== index);
            const itemToIncrement = finalItemsWithIncrement.find(item => item.productoId === productoId);
            if(itemToIncrement){
                itemToIncrement.cantidad += 1;
                setItems(finalItemsWithIncrement);
            }

        } else {
            const producto = productos.find(p => p.id === productoId);
            newItems[index].productoId = productoId;
            newItems[index].precio = producto ? producto.precio : 0;
            setItems(newItems);
        }

    } else if (field === 'cantidad') {
      newItems[index].cantidad = Number(value);
      setItems(newItems);
    }
  };


  const handleCreatePedido = () => {
    // Lógica para crear el pedido
    console.log("Creando pedido...", items);
    setOpen(false);
    // Resetear items
    setItems([]);
  };
  
  const calcularTotal = () => {
    return items.reduce((total, item) => total + (item.cantidad * item.precio), 0).toFixed(2);
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Pedidos de Compra</h1>
        <Dialog open={open} onOpenChange={setOpen}>
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
                <Select>
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
                <Textarea id="observaciones" className="col-span-3" placeholder="Añadir observaciones..."/>
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
                                                    <SelectItem key={p.id} value={p.id} disabled={items.some(i => i.productoId === p.id && items[index].productoId !== p.id)}>
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
                                        <Input type="number" value={item.precio.toFixed(2)} readOnly className="border-none bg-transparent"/>
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
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreatePedido} disabled={items.length === 0 || items.some(i => !i.productoId)}>Crear Pedido</Button>
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
                  <TableCell>{pedido.fecha}</TableCell>
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
                        <DropdownMenuItem>Ver Detalles</DropdownMenuItem>
                        <DropdownMenuItem>Generar Presupuesto</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500">
                          Cancelar
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
    </div>
  );
}

    