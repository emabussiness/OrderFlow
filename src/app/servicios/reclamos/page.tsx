
"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, orderBy, where, writeBatch, doc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileWarning, PlusCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";


// --- Types ---
type GarantiaActiva = {
  id: string;
  equipo_id: string;
  cliente_id: string;
  cliente_nombre: string;
  equipo_info: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'Activa';
  recepcion_id: string;
};

type EquipoOriginal = {
    id: string;
    cliente_id: string;
    tipo_equipo_id: string;
    tipo_equipo_nombre: string;
    marca_id: string;
    marca_nombre: string;
    modelo: string;
    numero_serie?: string;
    accesorios?: string;
}

export default function ReclamosServicioPage() {
    const { toast } = useToast();
    const [garantias, setGarantias] = useState<GarantiaActiva[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    
    // Dialog State
    const [openReclamo, setOpenReclamo] = useState(false);
    const [selectedGarantia, setSelectedGarantia] = useState<GarantiaActiva | null>(null);
    const [problemaReclamo, setProblemaReclamo] = useState("");
    const [accesoriosReclamo, setAccesoriosReclamo] = useState("");
    const [equipoOriginal, setEquipoOriginal] = useState<EquipoOriginal | null>(null);


    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, 'garantias_servicio'), 
                where("estado", "==", "Activa")
            );
            const snapshot = await getDocs(q);
            const dataList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GarantiaActiva));
            
            dataList.sort((a, b) => new Date(a.fecha_fin).getTime() - new Date(b.fecha_fin).getTime());
            
            setGarantias(dataList);
        } catch (error) {
            console.error("Error fetching active warranties:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las garantías activas.' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const filteredGarantias = garantias.filter(g => {
      const term = searchTerm.toLowerCase();
      return !term ||
          g.cliente_nombre.toLowerCase().includes(term) ||
          g.equipo_info.toLowerCase().includes(term);
    });
    
    const handleOpenReclamo = async (garantia: GarantiaActiva) => {
        setSelectedGarantia(garantia);
        const equipoRef = doc(db, "equipos_en_servicio", garantia.equipo_id);
        const equipoSnap = await getDoc(equipoRef);
        if (equipoSnap.exists()) {
            const equipoData = equipoSnap.data();
            setEquipoOriginal({
                id: equipoSnap.id, 
                cliente_id: garantia.cliente_id,
                tipo_equipo_id: equipoData.tipo_equipo_id,
                tipo_equipo_nombre: equipoData.tipo_equipo_nombre,
                marca_id: equipoData.marca_id,
                marca_nombre: equipoData.marca_nombre,
                modelo: equipoData.modelo,
                numero_serie: equipoData.numero_serie,
                accesorios: equipoData.accesorios
            } as EquipoOriginal);
            setAccesoriosReclamo(equipoData.accesorios || "");
        }
        setOpenReclamo(true);
    };

    const handleCloseReclamo = () => {
        setOpenReclamo(false);
        setSelectedGarantia(null);
        setProblemaReclamo("");
        setAccesoriosReclamo("");
        setEquipoOriginal(null);
    };
    
    const handleSubmitReclamo = async () => {
        if (!selectedGarantia || !equipoOriginal || !problemaReclamo.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'El problema manifestado es obligatorio.' });
            return;
        }

        try {
            const batch = writeBatch(db);

            // 1. Mark original warranty as "Utilizada"
            const garantiaRef = doc(db, "garantias_servicio", selectedGarantia.id);
            batch.update(garantiaRef, { estado: "Utilizada" });

            // 2. Create a new reception record for the claim
            const nuevaRecepcionRef = doc(collection(db, "recepciones"));
            
            // 3. Create new equipment_en_servicio record for the claim
            const nuevoEquipoRef = doc(collection(db, "equipos_en_servicio"));
            batch.set(nuevoEquipoRef, {
                // Copy only essential, non-status fields from the original equipment
                tipo_equipo_id: equipoOriginal.tipo_equipo_id,
                tipo_equipo_nombre: equipoOriginal.tipo_equipo_nombre,
                marca_id: equipoOriginal.marca_id,
                marca_nombre: equipoOriginal.marca_nombre,
                modelo: equipoOriginal.modelo,
                numero_serie: equipoOriginal.numero_serie || null,
                
                // Add new claim information
                recepcion_id: nuevaRecepcionRef.id,
                cliente_id: selectedGarantia.cliente_id,
                cliente_nombre: selectedGarantia.cliente_nombre,
                problema_manifestado: problemaReclamo,
                accesorios: accesoriosReclamo,
                origen_garantia_id: selectedGarantia.id, // Link to the warranty
                
                // Set initial status for the new service cycle
                estado: "Recibido",
                fecha_recepcion: new Date().toISOString().split('T')[0],
                fecha_creacion: serverTimestamp(),
                usuario_id: "user-demo",
                
                // Ensure diagnostic fields are null/undefined
                diagnostico_tecnico: null,
                trabajos_a_realizar: null,
                tecnico_id: null,
                tecnico_nombre: null,
                fecha_diagnostico: null
            });
            
            // 4. Set the reception data, now that we have the new equipment ID
            batch.set(nuevaRecepcionRef, {
                cliente_id: selectedGarantia.cliente_id,
                cliente_nombre: selectedGarantia.cliente_nombre,
                fecha_recepcion: new Date().toISOString().split('T')[0],
                usuario_id: 'user-demo',
                fecha_creacion: serverTimestamp(),
                origen_reclamo_id: selectedGarantia.id,
                equipos: [{ id: nuevoEquipoRef.id, problema_manifestado: problemaReclamo }]
            });


            await batch.commit();

            toast({ title: "Reclamo Iniciado", description: "Se ha creado un nuevo ciclo de servicio para la garantía." });
            handleCloseReclamo();
            await fetchData();

        } catch (error) {
            console.error("Error creating claim:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo iniciar el reclamo de garantía.' });
        }
    };


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
                        <Button size="sm" onClick={() => handleOpenReclamo(garantia)}>
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
        
        <Dialog open={openReclamo} onOpenChange={handleCloseReclamo}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Iniciar Reclamo de Garantía</DialogTitle>
                    <DialogDescription>
                        Registrar una nueva recepción de servicio para la garantía seleccionada.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <Card className="bg-secondary/50">
                        <CardHeader className="pb-2">
                           <CardTitle className="text-lg">Información del Equipo</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <p><strong>Cliente:</strong> {selectedGarantia?.cliente_nombre}</p>
                             <p><strong>Equipo:</strong> {selectedGarantia?.equipo_info}</p>
                             <p><strong>Garantía válida hasta:</strong> {selectedGarantia?.fecha_fin}</p>
                        </CardContent>
                    </Card>
                    <div className="space-y-2">
                        <Label htmlFor="problema-reclamo">Problema Manifestado (Actual)</Label>
                        <Textarea 
                            id="problema-reclamo" 
                            value={problemaReclamo} 
                            onChange={(e) => setProblemaReclamo(e.target.value)}
                            placeholder="Describa el nuevo problema o la recurrencia del problema anterior."
                            rows={4}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="accesorios-reclamo">Accesorios Entregados (Actual)</Label>
                        <Input 
                            id="accesorios-reclamo" 
                            value={accesoriosReclamo} 
                            onChange={(e) => setAccesoriosReclamo(e.target.value)}
                            placeholder="Ej: Cargador, cable, etc. (los mismos de la vez anterior si aplica)"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleCloseReclamo}>Cancelar</Button>
                    <Button onClick={handleSubmitReclamo}>Confirmar e Iniciar Reclamo</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        </div>
    );
}
