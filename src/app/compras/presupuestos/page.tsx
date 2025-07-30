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

type Presupuesto = {
  id: string;
  pedidoId: string;
  proveedor: string;
  fecha: string;
  total: number;
  estado: "Recibido" | "Aprobado" | "Rechazado";
};

const initialPresupuestos: Presupuesto[] = [
  {
    id: "PRE-001",
    pedidoId: "PED-001",
    proveedor: "Proveedor A",
    fecha: "2024-07-31",
    total: 1480.0,
    estado: "Recibido",
  },
  {
    id: "PRE-002",
    pedidoId: "PED-002",
    proveedor: "Proveedor B",
    fecha: "2024-07-30",
    total: 750.5,
    estado: "Aprobado",
  },
  {
    id: "PRE-003",
    pedidoId: "PED-003",
    proveedor: "Proveedor C",
    fecha: "2024-07-29",
    total: 200.0,
    estado: "Rechazado",
  },
];

export default function PresupuestosProveedorPage() {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>(initialPresupuestos);

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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Presupuestos de Proveedores</h1>
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
                        <DropdownMenuItem>Ver Detalles</DropdownMenuItem>
                        <DropdownMenuItem>Aprobar</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500">Rechazar</DropdownMenuItem>
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