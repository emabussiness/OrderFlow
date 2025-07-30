"use client";

import { useState } from "react";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

type Presupuesto = {
  id: string;
  pedidoId: string;
  proveedor: string;
  fecha: string;
  total: number;
  estado: "Recibido" | "Aprobado" | "Rechazado";
  items: { producto: string; cantidad: number; precio: number }[];
};

const initialPresupuestos: Presupuesto[] = [
  {
    id: "PRE-001",
    pedidoId: "PED-001",
    proveedor: "Proveedor A",
    fecha: "2024-07-31",
    total: 1480.0,
    estado: "Recibido",
    items: [
        { producto: "Producto X", cantidad: 10, precio: 148 },
    ]
  },
  {
    id: "PRE-002",
    pedidoId: "PED-002",
    proveedor: "Proveedor B",
    fecha: "2024-07-30",
    total: 750.5,
    estado: "Aprobado",
    items: [
        { producto: "Producto Y", cantidad: 30, precio: 25.01 },
    ]
  },
  {
    id: "PRE-003",
    pedidoId: "PED-003",
    proveedor: "Proveedor C",
    fecha: "2024-07-29",
    total: 195.0,
    estado: "Rechazado",
    items: [
        { producto: "Producto Z", cantidad: 4, precio: 48.75 },
    ]
  },
];

export default function PresupuestosProveedorPage() {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>(initialPresupuestos);
  const [selectedPresupuesto, setSelectedPresupuesto] = useState<Presupuesto | null>(null);
  const [openDetails, setOpenDetails] = useState(false);
  const { toast } = useToast();

  const getStatusVariant = (status: string): "secondary" | "default" | "destructive" | "outline" => {
    switch (status) {
      case "Recibido":
        return "secondary";
      case "Aprobado":
        return "default";
      case "Rechazado":
        return "destructive";
      default:
        return "outline";
    }
  };

  const handleOpenDetails = (presupuesto: Presupuesto) => {
    setSelectedPresupuesto(presupuesto);
    setOpenDetails(true);
  }

  const handleUpdateStatus = (presupuestoId: string, newStatus: "Aprobado" | "Rechazado") => {
     setPresupuestos(presupuestos.map(p => 
        p.id === presupuestoId ? { ...p, estado: newStatus } : p
    ));
    toast({
        title: `Presupuesto ${newStatus}`,
        description: `El presupuesto ${presupuestoId} ha sido marcado como ${newStatus.toLowerCase()}.`,
        variant: newStatus === 'Rechazado' ? 'destructive' : 'default',
    });
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Presupuestos de Proveedores</h1>
        <Button disabled>Registrar Presupuesto</Button>
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
                  <TableCell className="font-medium">{presupuesto.id}</TableCell>
                  <TableCell>{presupuesto.pedidoId}</TableCell>
                  <TableCell>{presupuesto.proveedor}</TableCell>
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
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={presupuesto.estado !== 'Recibido'} className="text-red-500">Rechazar</DropdownMenuItem>
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
                    <div className="flex justify-between">
                        <div>
                            <p className="font-semibold">Proveedor:</p>
                            <p>{selectedPresupuesto.proveedor}</p>
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
                            <p className="font-semibold">Estado:</p>
                            <p><Badge variant={getStatusVariant(selectedPresupuesto.estado)}>{selectedPresupuesto.estado}</Badge></p>
                        </div>
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
                                            <TableCell>{item.producto}</TableCell>
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
