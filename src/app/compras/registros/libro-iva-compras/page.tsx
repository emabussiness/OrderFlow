"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

type LibroIvaCompra = {
  id: string;
  compra_id: string;
  fecha_factura: string;
  proveedor_nombre: string;
  proveedor_ruc: string;
  numero_factura: string;
  total_compra: number;
  gravada_10: number;
  iva_10: number;
  gravada_5: number;
  iva_5: number;
  exenta: number;
};

const currencyFormatter = new Intl.NumberFormat('es-PY', {
  style: 'currency',
  currency: 'PYG',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export default function LibroIvaComprasPage() {
  const { toast } = useToast();
  const [registros, setRegistros] = useState<LibroIvaCompra[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'libro_iva_compras'), orderBy("fecha_factura", "desc"));
        const snapshot = await getDocs(q);
        const dataList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LibroIvaCompra));
        setRegistros(dataList);
      } catch (error) {
        console.error("Error fetching libro iva compras:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los registros del libro IVA.' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  if (loading) return <p>Cargando registros...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Libro IVA Compras</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registros de IVA por Compra</CardTitle>
          <CardDescription>Detalle de los impuestos generados en cada factura de compra.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Factura Nro.</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>RUC</TableHead>
                  <TableHead className="text-right">Gravada 10%</TableHead>
                  <TableHead className="text-right">IVA 10%</TableHead>
                  <TableHead className="text-right">Gravada 5%</TableHead>
                  <TableHead className="text-right">IVA 5%</TableHead>
                  <TableHead className="text-right">Exenta</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registros.map((reg) => (
                  <TableRow key={reg.id}>
                    <TableCell>{reg.fecha_factura}</TableCell>
                    <TableCell>{reg.numero_factura}</TableCell>
                    <TableCell>{reg.proveedor_nombre}</TableCell>
                    <TableCell>{reg.proveedor_ruc}</TableCell>
                    <TableCell className="text-right">{currencyFormatter.format(reg.gravada_10)}</TableCell>
                    <TableCell className="text-right">{currencyFormatter.format(reg.iva_10)}</TableCell>
                    <TableCell className="text-right">{currencyFormatter.format(reg.gravada_5)}</TableCell>
                    <TableCell className="text-right">{currencyFormatter.format(reg.iva_5)}</TableCell>
                    <TableCell className="text-right">{currencyFormatter.format(reg.exenta)}</TableCell>
                    <TableCell className="text-right font-medium">{currencyFormatter.format(reg.total_compra)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
           {registros.length === 0 && <p className="text-center text-muted-foreground mt-4">No hay registros de IVA Compras.</p>}
        </CardContent>
      </Card>
    </>
  );
}
