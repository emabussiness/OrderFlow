
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, PlusCircle } from "lucide-react";

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

export default function PedidosPage() {
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Pedidos de Compra</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Crear Pedido
        </Button>
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
                        <DropdownMenuItem className="text-red-500">Cancelar</DropdownMenuItem>
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
