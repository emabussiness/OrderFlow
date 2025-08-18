
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

type Stock = {
  id: string;
  producto_id: string;
  producto_nombre: string;
  deposito_id: string;
  deposito_nombre: string;
  cantidad: number;
  fecha_actualizacion: any;
};

export default function StockActualPage() {
  const { toast } = useToast();
  const [stock, setStock] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchStock = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'stock'), orderBy("producto_nombre", "asc"));
        const snapshot = await getDocs(q);
        const dataList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stock));
        setStock(dataList);
      } catch (error) {
        console.error("Error fetching stock:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el stock.' });
      } finally {
        setLoading(false);
      }
    };
    fetchStock();
  }, [toast]);

  const filteredStock = stock.filter(item =>
    item.producto_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.deposito_nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <p>Cargando stock...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Stock Actual</h1>
        <div className="w-1/3">
          <Input 
            placeholder="Buscar por producto o depósito..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventario por Depósito</CardTitle>
          <CardDescription>Vista en tiempo real de las cantidades de productos en cada depósito.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Depósito</TableHead>
                <TableHead className="text-right">Cantidad Disponible</TableHead>
                <TableHead>Última Actualización</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStock.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.producto_nombre}</TableCell>
                  <TableCell>{item.deposito_nombre}</TableCell>
                  <TableCell className="text-right font-bold text-lg">{item.cantidad}</TableCell>
                  <TableCell>{item.fecha_actualizacion?.toDate().toLocaleString() ?? 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredStock.length === 0 && (
            <p className="text-center text-muted-foreground mt-4">
                {stock.length > 0 ? "No se encontraron coincidencias." : "No hay registros de stock."}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

    