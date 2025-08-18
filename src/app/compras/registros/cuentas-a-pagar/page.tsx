"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CuentaPagar = {
  id: string;
  compra_id: string;
  proveedor_id: string;
  proveedor_nombre: string;
  numero_factura: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  monto_total: number;
  saldo_pendiente: number;
  estado: "Pendiente" | "Pagado Parcial" | "Pagado";
};

const currencyFormatter = new Intl.NumberFormat('es-PY', {
  style: 'currency',
  currency: 'PYG',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export default function CuentasPagarPage() {
  const { toast } = useToast();
  const [cuentas, setCuentas] = useState<CuentaPagar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'cuentas_a_pagar'), orderBy("fecha_vencimiento", "asc"));
        const snapshot = await getDocs(q);
        const dataList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CuentaPagar));
        setCuentas(dataList);
      } catch (error) {
        console.error("Error fetching cuentas a pagar:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las cuentas a pagar.' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const getStatusVariant = (status: string): "secondary" | "default" | "destructive" | "outline" => {
    switch (status) {
      case "Pendiente": return "destructive";
      case "Pagado": return "default";
      case "Pagado Parcial": return "secondary";
      default: return "outline";
    }
  };

  if (loading) return <p>Cargando cuentas a pagar...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Cuentas a Pagar</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Cuentas Pendientes</CardTitle>
          <CardDescription>Facturas de compra pendientes de pago a proveedores.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Factura Nro.</TableHead>
                <TableHead>Fecha Emisión</TableHead>
                <TableHead>Fecha Venc.</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Monto Total</TableHead>
                <TableHead className="text-right">Saldo Pendiente</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cuentas.map((cuenta) => (
                <TableRow key={cuenta.id}>
                  <TableCell>{cuenta.proveedor_nombre}</TableCell>
                  <TableCell>{cuenta.numero_factura}</TableCell>
                  <TableCell>{cuenta.fecha_emision}</TableCell>
                  <TableCell>{cuenta.fecha_vencimiento}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(cuenta.estado)}>{cuenta.estado}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{currencyFormatter.format(cuenta.monto_total)}</TableCell>
                  <TableCell className="text-right font-medium">{currencyFormatter.format(cuenta.saldo_pendiente)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Registrar Pago</DropdownMenuItem>
                        <DropdownMenuItem>Ver Compra Asociada</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {cuentas.length === 0 && <p className="text-center text-muted-foreground mt-4">No hay cuentas a pagar pendientes.</p>}
        </CardContent>
      </Card>
    </>
  );
}
