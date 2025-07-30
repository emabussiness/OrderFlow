"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type ItemOrden = {
  productoId: string;
  nombre: string;
  cantidad: number;
  precio: number;
};

type OrdenCompra = {
  id: string;
  presupuestoId: string;
  proveedor: string;
  fechaOrden: string;
  estado: "Pendiente de Recepción" | "Recibido Parcial" | "Recibido Completo" | "Cancelada";
  total: number;
  items: ItemOrden[];
  usuario: string;
  fechaCreacion: string;
};

const initialOrdenes: OrdenCompra[] = [
  {
    id: "OC-001",
    presupuestoId: "PRE-001",
    proveedor: "Proveedor A",
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


export default function OrdenesCompraPage() {
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [selectedOrden, setSelectedOrden] = useState<OrdenCompra | null>(null);
  const [openDetails, setOpenDetails] = useState(false);

  useEffect(() => {
    const storedOrdenes = localStorage.getItem("ordenes_compra");
    if (storedOrdenes) {
      setOrdenes(JSON.parse(storedOrdenes));
    } else {
      setOrdenes(initialOrdenes);
    }
  }, []);

  useEffect(() => {
    // This effect ensures that if another page updates localStorage, this page reflects the changes.
    const handleStorageChange = () => {
        const storedOrdenes = localStorage.getItem("ordenes_compra");
        if (storedOrdenes) {
            setOrdenes(JSON.parse(storedOrdenes));
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (ordenes.length > 0) {
        // We might not want to overwrite initial data if it's the first load and localStorage is empty.
        // A more complex logic can be added here if needed.
        if (localStorage.getItem("ordenes_compra") || ordenes.length > initialOrdenes.length) {
             localStorage.setItem("ordenes_compra", JSON.stringify(ordenes));
        }
    }
  }, [ordenes]);

  const getStatusVariant = (status: string): "secondary" | "default" | "destructive" | "outline" => {
    switch (status) {
      case "Pendiente de Recepción":
        return "secondary";
      case "Recibido Completo":
        return "default";
      case "Recibido Parcial":
        return "outline";
      case "Cancelada":
        return "destructive";
      default:
        return "outline";
    }
  };

  const handleOpenDetails = (orden: OrdenCompra) => {
    setSelectedOrden(orden);
    setOpenDetails(true);
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Órdenes de Compra</h1>
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
                        <DropdownMenuItem>Registrar Recepción</DropdownMenuItem>
                         <DropdownMenuItem className="text-red-500">Cancelar Orden</DropdownMenuItem>
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
                            <p className="font-semibold">Presupuesto ID:</p>
                            <p>{selectedOrden.presupuestoId}</p>
                        </div>
                        <div>
                            <p className="font-semibold">Estado:</p>
                            <Badge variant={getStatusVariant(selectedOrden.estado)}>{selectedOrden.estado}</Badge>
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

    