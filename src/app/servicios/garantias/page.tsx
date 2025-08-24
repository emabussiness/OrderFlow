
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// --- Types ---
type Garantia = {
  id: string;
  equipo_id: string;
  cliente_nombre: string;
  equipo_info: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'Activa' | 'Vencida' | 'Utilizada';
};

const getStatusVariant = (status: Garantia['estado']): "default" | "secondary" | "destructive" => {
    const hoy = new Date().toISOString().split('T')[0];
    if (status === 'Activa') return 'default';
    if (status === 'Vencida') return 'secondary';
    if (status === 'Utilizada') return 'destructive';
    return 'default';
};

export default function GarantiasPage() {
  const { toast } = useToast();
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'garantias_servicio'), orderBy("fecha_inicio", "desc"));
        const snapshot = await getDocs(q);
        const dataList = snapshot.docs.map(doc => {
            const data = doc.data() as Omit<Garantia, 'id'>;
            const hoy = new Date().toISOString().split('T')[0];
            let estado = data.estado;
            if (estado === 'Activa' && data.fecha_fin < hoy) {
                estado = 'Vencida';
            }
            return { id: doc.id, ...data, estado };
        });
        setGarantias(dataList);
      } catch (error) {
        console.error("Error fetching warranties:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las garantías.' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);
  
  const filteredGarantias = garantias.filter(g => 
      g.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.equipo_info.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <p>Cargando garantías...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Garantías de Servicio</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Garantías</CardTitle>
          <CardDescription>
            Listado de todas las garantías generadas por los servicios finalizados.
            <Input
              placeholder="Buscar por cliente o equipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-2"
            />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead>Inicio Garantía</TableHead>
                <TableHead>Fin Garantía</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGarantias.map((garantia) => (
                <TableRow key={garantia.id}>
                  <TableCell className="font-medium">{garantia.cliente_nombre}</TableCell>
                  <TableCell>{garantia.equipo_info}</TableCell>
                  <TableCell>{garantia.fecha_inicio}</TableCell>
                  <TableCell>{garantia.fecha_fin}</TableCell>
                  <TableCell>
                      <Badge variant={getStatusVariant(garantia.estado)}>
                          {garantia.estado}
                      </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           {filteredGarantias.length === 0 && <p className="text-center text-muted-foreground mt-4">No se encontraron garantías.</p>}
        </CardContent>
      </Card>
    </>
  );
}
