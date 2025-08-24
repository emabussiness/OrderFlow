
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileWarning, PlusCircle } from "lucide-react";


// --- Types ---
type GarantiaActiva = {
  id: string;
  equipo_id: string;
  cliente_nombre: string;
  equipo_info: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'Activa';
};


export default function ReclamosServicioPage() {
    const { toast } = useToast();
    const [garantias, setGarantias] = useState<GarantiaActiva[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const q = query(
                    collection(db, 'garantias_servicio'), 
                    where("estado", "==", "Activa"),
                    orderBy("fecha_fin", "asc") // Prioritize warranties ending soon
                );
                const snapshot = await getDocs(q);
                const dataList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GarantiaActiva));
                setGarantias(dataList);
            } catch (error) {
                console.error("Error fetching active warranties:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las garantías activas.' });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [toast]);
    
    const filteredGarantias = garantias.filter(g => {
      const term = searchTerm.toLowerCase();
      return !term ||
          g.cliente_nombre.toLowerCase().includes(term) ||
          g.equipo_info.toLowerCase().includes(term);
    });

    const handleIniciarReclamo = (garantiaId: string) => {
        // TODO: Implement logic to start a new service cycle for the warranty claim
        toast({
            title: "Función en Desarrollo",
            description: `Se iniciaría un nuevo ciclo de servicio para la garantía ID: ${garantiaId.substring(0,7)}`,
        });
    }

    if (loading) return <p>Cargando garantías activas...</p>;

    return (
        <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Reclamos de Garantía</h1>
        </div>

        <Card>
            <CardHeader>
            <CardTitle>Garantías Activas</CardTitle>
            <CardDescription>
                Listado de todos los equipos actualmente bajo garantía. Desde aquí puede iniciar un reclamo de servicio.
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
                    <TableHead>Fin de Garantía</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right w-[150px]">Acción</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredGarantias.map((garantia) => (
                    <TableRow key={garantia.id}>
                    <TableCell className="font-medium">{garantia.cliente_nombre}</TableCell>
                    <TableCell>{garantia.equipo_info}</TableCell>
                    <TableCell>{garantia.fecha_fin}</TableCell>
                    <TableCell>
                        <Badge variant="default">{garantia.estado}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <Button size="sm" onClick={() => handleIniciarReclamo(garantia.id)}>
                            <FileWarning className="mr-2 h-4 w-4"/>
                            Iniciar Reclamo
                        </Button>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            {filteredGarantias.length === 0 && (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                    <p>No se encontraron garantías activas que coincidan con la búsqueda.</p>
                </div>
            )}
            </CardContent>
        </Card>
        </div>
    );
}
