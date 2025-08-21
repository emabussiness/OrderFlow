
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilePlus2 } from "lucide-react";

// --- Types ---
type EquipoDiagnosticado = {
  id: string;
  cliente_nombre: string;
  fecha_recepcion: string;
  fecha_diagnostico?: string;
  tipo_equipo_nombre: string;
  marca_nombre: string;
  modelo: string;
  problema_manifestado: string;
  diagnostico_tecnico?: string;
  estado: "Recibido" | "Diagnosticado" | "Presupuestado" | "En Reparación" | "Reparado" | "Retirado";
};

// --- Main Component ---
export default function PresupuestoServicioPage() {
  const { toast } = useToast();
  const [equipos, setEquipos] = useState<EquipoDiagnosticado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'equipos_en_servicio'),
          where("estado", "==", "Diagnosticado")
        );
        const querySnapshot = await getDocs(q);
        const equiposList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EquipoDiagnosticado));
        
        // Sort on the client side
        equiposList.sort((a, b) => {
            if (a.fecha_diagnostico && b.fecha_diagnostico) {
                return new Date(b.fecha_diagnostico).getTime() - new Date(a.fecha_diagnostico).getTime();
            }
            return 0;
        });

        setEquipos(equiposList);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los equipos diagnosticados." });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  if (loading) return <p>Cargando equipos diagnosticados...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Presupuestos de Servicio</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Equipos Pendientes de Presupuesto</CardTitle>
          <CardDescription>
            Estos equipos ya han sido diagnosticados y están listos para que se les genere un presupuesto de reparación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead>Fecha Diag.</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipos.map((equipo) => (
                <TableRow key={equipo.id}>
                  <TableCell className="font-medium">{equipo.cliente_nombre}</TableCell>
                  <TableCell>{`${equipo.tipo_equipo_nombre} ${equipo.marca_nombre} ${equipo.modelo}`}</TableCell>
                  <TableCell>{equipo.fecha_diagnostico}</TableCell>
                  <TableCell>
                      <Badge variant="secondary">{equipo.estado}</Badge>
                  </TableCell>
                  <TableCell>
                      <Button variant="outline" size="sm">
                          <FilePlus2 className="mr-2 h-4 w-4"/>
                          Presupuestar
                      </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {equipos.length === 0 && (
            <p className="text-center text-muted-foreground py-10">
              No hay equipos pendientes de presupuesto en este momento.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
