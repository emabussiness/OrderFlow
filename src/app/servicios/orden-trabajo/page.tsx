
"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import Link from "next/link";


// --- Types ---
type PresupuestoAprobado = {
  id: string;
  equipo_id: string;
  cliente_nombre: string;
  recepcion_id: string;
  fecha_presupuesto: string;
  estado: 'Aprobado';
  total: number;
};

type Equipo = {
  id: string;
  tipo_equipo_nombre: string;
  marca_nombre: string;
  modelo: string;
  estado: "En Reparación" | "Reparado" | "Retirado";
};

type OrdenTrabajo = {
  id: string; // Presupuesto ID
  fecha_aprobacion: string;
  cliente_nombre: string;
  recepcion_id: string;
  equipo_info: string;
  equipo_estado: string;
  total: number;
};

const currencyFormatter = new Intl.NumberFormat('es-PY', {
  style: 'currency',
  currency: 'PYG',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});


// --- Main Component ---
export default function OrdenDeTrabajoPage() {
  const { toast } = useToast();
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const presupuestosQuery = query(
          collection(db, 'presupuestos_servicio'),
          where("estado", "==", "Aprobado")
        );
        const presupuestosSnap = await getDocs(presupuestosQuery);
        const presupuestosAprobados = presupuestosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PresupuestoAprobado));
        
        if (presupuestosAprobados.length === 0) {
          setOrdenes([]);
          setLoading(false);
          return;
        }
        
        const equipoIds = [...new Set(presupuestosAprobados.map(p => p.equipo_id))];
        const equiposQuery = query(collection(db, 'equipos_en_servicio'), where('__name__', 'in', equipoIds));
        const equiposSnap = await getDocs(equiposQuery);
        const equiposMap = new Map(equiposSnap.docs.map(doc => [doc.id, doc.data() as Equipo]));

        const ordenesDeTrabajo = presupuestosAprobados.map(presupuesto => {
          const equipo = equiposMap.get(presupuesto.equipo_id);
          return {
            id: presupuesto.id,
            fecha_aprobacion: presupuesto.fecha_presupuesto, // Assuming approval date is budget date for now
            cliente_nombre: presupuesto.cliente_nombre,
            recepcion_id: presupuesto.recepcion_id,
            equipo_info: equipo ? `${equipo.tipo_equipo_nombre} ${equipo.marca_nombre} ${equipo.modelo}` : "Info no disponible",
            equipo_estado: equipo?.estado || 'Desconocido',
            total: presupuesto.total,
          };
        }).sort((a,b) => new Date(b.fecha_aprobacion).getTime() - new Date(a.fecha_aprobacion).getTime());

        setOrdenes(ordenesDeTrabajo);

      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las órdenes de trabajo." });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);
  
  const getStatusVariant = (status: string): "secondary" | "default" | "outline" => {
    if (status === 'Reparado') return 'default';
    if (status === 'En Reparación') return 'secondary';
    return 'outline';
  }

  const filteredOrdenes = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return ordenes;
    return ordenes.filter(ot =>
      ot.cliente_nombre.toLowerCase().includes(term) ||
      ot.recepcion_id.toLowerCase().includes(term) ||
      ot.equipo_info.toLowerCase().includes(term)
    );
  }, [ordenes, searchTerm]);


  if (loading) return <p>Cargando órdenes de trabajo...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Órdenes de Trabajo</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Trabajo Activas</CardTitle>
          <CardDescription>
            Listado de todos los servicios aprobados por los clientes, pendientes de reparación o finalizados.
            <Input
              placeholder="Buscar por cliente, ID de recepción o equipo..."
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
                <TableHead>OT Nº (ID Presupuesto)</TableHead>
                <TableHead>Fecha Aprobación</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead>Estado del Equipo</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrdenes.map((ot) => (
                <TableRow key={ot.id}>
                  <TableCell className="font-medium">{ot.id.substring(0, 7)}</TableCell>
                  <TableCell>{ot.fecha_aprobacion}</TableCell>
                  <TableCell>{ot.cliente_nombre}</TableCell>
                  <TableCell>{ot.equipo_info}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(ot.equipo_estado)}>{ot.equipo_estado}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{currencyFormatter.format(ot.total)}</TableCell>
                  <TableCell>
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                           <Link href={`/servicios/trabajos-realizados?ot_id=${ot.id}`}>Registrar Trabajo</Link>
                        </DropdownMenuItem>
                         <DropdownMenuItem asChild>
                           <Link href={`/servicios/retiro-equipos?ot_id=${ot.id}`}>Registrar Retiro</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredOrdenes.length === 0 && (
            <p className="text-center text-muted-foreground py-10">
              No hay órdenes de trabajo activas.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
