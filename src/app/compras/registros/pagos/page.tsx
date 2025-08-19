
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

type PagoProveedor = {
  id: string;
  proveedor_nombre: string;
  fecha_pago: string;
  monto_total: number;
  forma_pago_nombre: string;
  banco_nombre?: string;
  numero_referencia?: string;
  facturas_afectadas: { id: string; numero_factura: string }[];
  usuario_id: string;
};

const currencyFormatter = new Intl.NumberFormat('es-PY', {
  style: 'currency',
  currency: 'PYG',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export default function PagosProveedoresPage() {
  const { toast } = useToast();
  const [pagos, setPagos] = useState<PagoProveedor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPagos = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'pagos_proveedores'), orderBy("fecha_pago", "desc"));
        const snapshot = await getDocs(q);
        const dataList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PagoProveedor));
        setPagos(dataList);
      } catch (error) {
        console.error("Error fetching payments:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los pagos.' });
      } finally {
        setLoading(false);
      }
    };
    fetchPagos();
  }, [toast]);

  if (loading) return <p>Cargando pagos...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pagos a Proveedores</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos Realizados</CardTitle>
          <CardDescription>Registro de todos los pagos emitidos a proveedores.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha Pago</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Forma de Pago</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead className="text-right">Monto Pagado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagos.map((pago) => (
                <TableRow key={pago.id}>
                  <TableCell>{pago.fecha_pago}</TableCell>
                  <TableCell className="font-medium">{pago.proveedor_nombre}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{pago.forma_pago_nombre}</Badge>
                  </TableCell>
                  <TableCell>{pago.banco_nombre || 'N/A'}</TableCell>
                  <TableCell>{pago.numero_referencia || 'N/A'}</TableCell>
                  <TableCell className="text-right font-bold">{currencyFormatter.format(pago.monto_total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {pagos.length === 0 && <p className="text-center text-muted-foreground mt-4">No hay pagos registrados.</p>}
        </CardContent>
      </Card>
    </>
  );
}
