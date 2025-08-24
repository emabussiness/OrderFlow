
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { collection, getDocs, query, where, orderBy, doc, getDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { CheckCheck } from "lucide-react";
import { addDays } from 'date-fns';

// --- Types ---
type EquipoParaRetiro = {
  id: string;
  cliente_nombre: string;
  recepcion_id: string;
  tipo_equipo_nombre: string;
  marca_nombre: string;
  modelo: string;
  estado: "Reparado" | "Diagnosticado" | "Presupuestado"; // Estado del equipo
  motivo_retiro: 'Reparación Finalizada' | 'Presupuesto Rechazado';
  presupuesto_id: string; 
};

type PresupuestoServicio = {
    id: string;
    total: number;
    estado: 'Aprobado' | 'Rechazado';
}

type GroupedEquipos = {
  [key: string]: {
    cliente_nombre: string;
    equipos: EquipoParaRetiro[];
  }
}

const currencyFormatter = new Intl.NumberFormat('es-PY', {
  style: 'currency',
  currency: 'PYG',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});


// --- Main Component ---
export default function RetiroEquiposPage() {
  const { toast } = useToast();
  const [equipos, setEquipos] = useState<EquipoParaRetiro[]>([]);
  const [presupuestos, setPresupuestos] = useState<Map<string, PresupuestoServicio>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog state
  const [openRetiro, setOpenRetiro] = useState(false);
  const [selectedEquipo, setSelectedEquipo] = useState<EquipoParaRetiro | null>(null);
  const [nombreRetira, setNombreRetira] = useState("");
  const [ciRetira, setCiRetira] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch all equipment that is either repaired or has a rejected budget
      const equiposReparadosQuery = query(collection(db, 'equipos_en_servicio'), where("estado", "==", "Reparado"));
      
      // We need to fetch equipos whose budget is rejected. The equipment state remains 'Presupuestado'.
      const presupuestosRechazadosQuery = query(collection(db, 'presupuestos_servicio'), where("estado", "==", "Rechazado"));

      const [equiposReparadosSnap, presupuestosRechazadosSnap] = await Promise.all([
          getDocs(equiposReparadosQuery),
          getDocs(presupuestosRechazadosQuery)
      ]);

      const equiposParaRetiro: EquipoParaRetiro[] = [];
      const presupuestoIds = new Set<string>();

      // Add repaired equipment to the list
      for (const equipoDoc of equiposReparadosSnap.docs) {
          const equipoData = { id: equipoDoc.id, ...equipoDoc.data() } as any;
          const presupuestoId = await findPresupuestoId(equipoData.id);
          if (presupuestoId) {
            equipoData.presupuesto_id = presupuestoId;
            equipoData.motivo_retiro = 'Reparación Finalizada';
            presupuestoIds.add(presupuestoId);
            equiposParaRetiro.push(equipoData);
          }
      }
      
      // Add equipment with rejected budgets to the list
      const equiposRechazadosIds = presupuestosRechazadosSnap.docs.map(doc => doc.data().equipo_id);
      if(equiposRechazadosIds.length > 0) {
        const equiposRechazadosQuery = query(collection(db, 'equipos_en_servicio'), where('__name__', 'in', equiposRechazadosIds));
        const equiposRechazadosSnap = await getDocs(equiposRechazadosQuery);

        for (const equipoDoc of equiposRechazadosSnap.docs) {
           const presupuestoRechazado = presupuestosRechazadosSnap.docs.find(p => p.data().equipo_id === equipoDoc.id);
           if(presupuestoRechazado) {
             const equipoData = { id: equipoDoc.id, ...equipoDoc.data(), motivo_retiro: 'Presupuesto Rechazado', presupuesto_id: presupuestoRechazado.id } as any;
             presupuestoIds.add(presupuestoRechazado.id);
             equiposParaRetiro.push(equipoData);
           }
        }
      }

      setEquipos(equiposParaRetiro);

      // Fetch all required budgets in one query
      if (presupuestoIds.size > 0) {
        const presupuestosQuery = query(collection(db, 'presupuestos_servicio'), where('__name__', 'in', [...presupuestoIds]));
        const presupuestosSnap = await getDocs(presupuestosQuery);
        const presupuestosMap = new Map<string, PresupuestoServicio>();
        presupuestosSnap.forEach(doc => {
            const data = doc.data() as PresupuestoServicio;
            presupuestosMap.set(doc.id, {id: doc.id, total: data.total, estado: data.estado});
        });
        setPresupuestos(presupuestosMap);
      }

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los equipos listos para retiro." });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  const findPresupuestoId = async (equipoId: string): Promise<string | undefined> => {
    const q = query(collection(db, 'presupuestos_servicio'), where('equipo_id', '==', equipoId), where('estado', '==', 'Aprobado'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }
    return undefined;
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const groupedAndFilteredEquipos = useMemo(() => {
    const grouped: GroupedEquipos = {};

    const filteredEquipos = equipos.filter(equipo => {
      const term = searchTerm.toLowerCase();
      return !term ||
        equipo.cliente_nombre.toLowerCase().includes(term) ||
        equipo.recepcion_id?.toLowerCase().includes(term) ||
        equipo.tipo_equipo_nombre.toLowerCase().includes(term) ||
        equipo.marca_nombre.toLowerCase().includes(term) ||
        equipo.modelo.toLowerCase().includes(term);
    });

    filteredEquipos.forEach(equipo => {
      const key = equipo.recepcion_id || 'sin-recepcion';
      if (!grouped[key]) {
        grouped[key] = {
          cliente_nombre: equipo.cliente_nombre,
          equipos: []
        };
      }
      grouped[key].equipos.push(equipo);
    });

    return grouped;
  }, [equipos, searchTerm]);

  const handleOpenRetiro = (equipo: EquipoParaRetiro) => {
    setSelectedEquipo(equipo);
    setNombreRetira("");
    setCiRetira("");
    setOpenRetiro(true);
  };
  
  const handleRegistrarRetiro = async () => {
    if (!selectedEquipo || !nombreRetira.trim() || !ciRetira.trim()) {
        toast({ variant: 'destructive', title: 'Error de Validación', description: 'El nombre y CI de quien retira son obligatorios.' });
        return;
    }

    try {
        const batch = writeBatch(db);

        // 1. Update equipo status to "Retirado"
        const equipoRef = doc(db, 'equipos_en_servicio', selectedEquipo.id);
        batch.update(equipoRef, { estado: "Retirado" });
        
        const presupuestoAsociado = presupuestos.get(selectedEquipo.presupuesto_id);
        const montoCobrado = presupuestoAsociado?.estado === 'Aprobado' ? presupuestoAsociado.total : 0;

        // 2. Create a retiro record for audit purposes
        const retiroRef = doc(collection(db, 'retiros_equipo'));
        batch.set(retiroRef, {
            equipo_id: selectedEquipo.id,
            recepcion_id: selectedEquipo.recepcion_id,
            presupuesto_id: selectedEquipo.presupuesto_id,
            cliente_nombre: selectedEquipo.cliente_nombre,
            nombre_retira: nombreRetira.trim(),
            ci_retira: ciRetira.trim(),
            fecha_retiro: new Date().toISOString().split('T')[0],
            monto_cobrado: montoCobrado,
            usuario_id: "user-demo",
            fecha_creacion: serverTimestamp(),
        });

        // 3. Create a warranty record if the service was completed
        if (selectedEquipo.motivo_retiro === 'Reparación Finalizada') {
            const garantiaRef = doc(collection(db, 'garantias_servicio'));
            const hoy = new Date();
            batch.set(garantiaRef, {
                equipo_id: selectedEquipo.id,
                recepcion_id: selectedEquipo.recepcion_id,
                cliente_nombre: selectedEquipo.cliente_nombre,
                equipo_info: `${selectedEquipo.tipo_equipo_nombre} ${selectedEquipo.marca_nombre} ${selectedEquipo.modelo}`,
                fecha_inicio: new Date().toISOString().split('T')[0],
                fecha_fin: addDays(hoy, 90).toISOString().split('T')[0], // 90-day warranty
                estado: 'Activa',
            });
        }

        await batch.commit();
        
        toast({ title: "Retiro Registrado", description: "El equipo ha sido marcado como 'Retirado'."});
        setOpenRetiro(false);
        await fetchData();

    } catch (error) {
        console.error("Error registering pickup:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo registrar el retiro." });
    }
  };


  if (loading) return <p>Cargando equipos...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Retiro de Equipos</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Equipos Listos para Retiro</CardTitle>
          <CardDescription>
            Listado de equipos reparados o con presupuesto rechazado, pendientes de ser retirados por el cliente.
            <Input
              placeholder="Buscar por cliente, ID de recepción o equipo..."
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
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Equipo</TableHead>
                        <TableHead>Modelo</TableHead>
                        <TableHead>Motivo de Retiro</TableHead>
                        <TableHead className="text-right">Monto a Pagar</TableHead>
                        <TableHead className="w-[180px] text-center">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.equipos.map((equipo) => {
                        const presupuesto = presupuestos.get(equipo.presupuesto_id);
                        const montoAPagar = presupuesto?.estado === 'Aprobado' ? presupuesto.total : 0;
                        return (
                        <TableRow key={equipo.id}>
                          <TableCell className="font-medium">{`${equipo.tipo_equipo_nombre} ${equipo.marca_nombre}`}</TableCell>
                          <TableCell>{equipo.modelo}</TableCell>
                          <TableCell>
                            <Badge variant={equipo.motivo_retiro === 'Reparación Finalizada' ? 'default' : 'secondary'}>
                              {equipo.motivo_retiro}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{currencyFormatter.format(montoAPagar)}</TableCell>
                          <TableCell className="text-center">
                            <Button size="sm" onClick={() => handleOpenRetiro(equipo)}>
                               <CheckCheck className="mr-2 h-4 w-4"/> Registrar Retiro
                            </Button>
                          </TableCell>
                        </TableRow>
                      )})}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {Object.keys(groupedAndFilteredEquipos).length === 0 && (
            <p className="text-center text-muted-foreground py-10">
              No hay equipos pendientes de retiro.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={openRetiro} onOpenChange={setOpenRetiro}>
          <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                  <DialogTitle>Confirmar Retiro de Equipo</DialogTitle>
                  {selectedEquipo && (
                      <DialogDescription>
                        {`${selectedEquipo.tipo_equipo_nombre} ${selectedEquipo.marca_nombre} ${selectedEquipo.modelo}`}
                        <br/>
                        Cliente: <strong>{selectedEquipo.cliente_nombre}</strong>
                      </DialogDescription>
                  )}
              </DialogHeader>
              <div className="py-4 space-y-4">
                  <div className="p-4 rounded-lg bg-secondary">
                      <Label>Monto Final a Pagar</Label>
                      <p className="text-2xl font-bold">{currencyFormatter.format(presupuestos.get(selectedEquipo?.presupuesto_id || '')?.estado === 'Aprobado' ? presupuestos.get(selectedEquipo?.presupuesto_id || '')?.total || 0 : 0)}</p>
                      <p className="text-xs text-muted-foreground">Verifique que el pago se haya realizado o se realice en este momento.</p>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="nombre_retira">Nombre de quien retira</Label>
                      <Input id="nombre_retira" value={nombreRetira} onChange={e => setNombreRetira(e.target.value)} />
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor="ci_retira">Nº de Cédula de Identidad</Label>
                      <Input id="ci_retira" value={ciRetira} onChange={e => setCiRetira(e.target.value)} />
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenRetiro(false)}>Cancelar</Button>
                  <Button onClick={handleRegistrarRetiro}>Confirmar Entrega</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}
