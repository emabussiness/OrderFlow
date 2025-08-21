
"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilePlus2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  recepcion_id: string;
};

type GroupedEquipos = {
  [key: string]: {
    cliente_nombre: string;
    fecha_recepcion: string;
    equipos: EquipoDiagnosticado[];
  }
}

// --- Main Component ---
export default function PresupuestoServicioPage() {
  const { toast } = useToast();
  const [equipos, setEquipos] = useState<EquipoDiagnosticado[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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
  
  const groupedAndFilteredEquipos = useMemo(() => {
    const grouped: GroupedEquipos = {};

    equipos.forEach(equipo => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = !term ||
        equipo.cliente_nombre.toLowerCase().includes(term) ||
        equipo.recepcion_id?.toLowerCase().includes(term) ||
        equipo.tipo_equipo_nombre.toLowerCase().includes(term) ||
        equipo.marca_nombre.toLowerCase().includes(term) ||
        equipo.modelo.toLowerCase().includes(term);

      if (matchesSearch && equipo.recepcion_id) {
        const key = equipo.recepcion_id;
        if (!grouped[key]) {
          grouped[key] = {
            cliente_nombre: equipo.cliente_nombre,
            fecha_recepcion: equipo.fecha_recepcion,
            equipos: []
          };
        }
        grouped[key].equipos.push(equipo);
      }
    });

    return Object.entries(grouped)
        .sort(([, valA], [, valB]) => new Date(valB.fecha_recepcion).getTime() - new Date(valA.fecha_recepcion).getTime())
        .reduce((acc, [key, val]) => ({...acc, [key]: val}), {});

  }, [equipos, searchTerm]);


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
            Equipos diagnosticados listos para generar un presupuesto de reparación.
            <Input
              placeholder="Buscar por cliente, ID de recepción, tipo, marca o modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-2"
            />
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Accordion type="single" collapsible className="w-full">
            {Object.entries(groupedAndFilteredEquipos).map(([recepcionId, data]) => (
              <AccordionItem value={recepcionId} key={recepcionId}>
                <AccordionTrigger>
                  <div className="flex justify-between w-full pr-4">
                    <span className="font-medium">Recepción ID: {recepcionId.substring(0, 7)}</span>
                    <span className="text-muted-foreground">Cliente: {data.cliente_nombre}</span>
                    <span className="text-muted-foreground">Fecha: {data.fecha_recepcion}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Equipo</TableHead>
                        <TableHead>Fecha Diag.</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.equipos.map((equipo) => (
                        <TableRow key={equipo.id}>
                           <TableCell>{`${equipo.tipo_equipo_nombre} ${equipo.marca_nombre} ${equipo.modelo}`}</TableCell>
                           <TableCell>{equipo.fecha_diagnostico}</TableCell>
                           <TableCell>
                                <Popover>
                                  <PopoverTrigger asChild>
                                      <Badge variant="secondary" className="cursor-pointer">{equipo.estado}</Badge>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80">
                                    <div className="grid gap-4">
                                      <div className="space-y-2">
                                        <h4 className="font-medium leading-none">Diagnóstico Técnico</h4>
                                        <p className="text-sm text-muted-foreground">
                                          {equipo.diagnostico_tecnico || "No se ha proporcionado un diagnóstico."}
                                        </p>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
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
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {Object.keys(groupedAndFilteredEquipos).length === 0 && (
            <p className="text-center text-muted-foreground py-10">
              No hay equipos pendientes de presupuesto en este momento.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
