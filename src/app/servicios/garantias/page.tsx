
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { DateRange } from "react-day-picker";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Package, Wrench, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";


// --- Types ---
type Garantia = {
  id: string;
  equipo_id: string;
  cliente_nombre: string;
  equipo_info: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'Activa' | 'Vencida' | 'Utilizada';
  usuario_id?: string;
  trabajo_realizado?: TrabajoRealizado; // Optional field to hold details
};

type ItemPresupuesto = {
  id: string;
  nombre: string;
  tipo: 'Repuesto' | 'Mano de Obra';
  cantidad: number;
  precio_unitario: number;
};

type TrabajoRealizado = {
  id: string;
  items_utilizados: ItemPresupuesto[];
  items_adicionales: ItemPresupuesto[];
  observaciones_tecnicas: string;
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
  const [statusFilter, setStatusFilter] = useState<Garantia['estado'] | ''>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();


  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
        const q = query(collection(db, 'garantias_servicio'), orderBy("fecha_inicio", "desc"));
        const snapshot = await getDocs(q);
        
        const garantiasList = snapshot.docs.map(doc => {
            const data = doc.data() as Omit<Garantia, 'id'| 'trabajo_realizado'>;
            const hoy = new Date().toISOString().split('T')[0];
            let estado = data.estado;
            if (estado === 'Activa' && data.fecha_fin < hoy) {
                estado = 'Vencida';
            }
            return { id: doc.id, ...data, estado };
        });

        // Fetch related trabajos realizados
        const equipoIds = garantiasList.map(g => g.equipo_id);
        if(equipoIds.length > 0) {
            const trabajosQuery = query(collection(db, 'trabajos_realizados'), where('equipo_id', 'in', equipoIds));
            const trabajosSnap = await getDocs(trabajosQuery);
            const trabajosMap = new Map<string, TrabajoRealizado>();
            trabajosSnap.forEach(doc => {
                const trabajoData = { id: doc.id, ...doc.data() } as TrabajoRealizado;
                const equipoId = doc.data().equipo_id;
                if(equipoId) {
                    trabajosMap.set(equipoId, trabajoData);
                }
            });
            
            garantiasList.forEach(g => {
                g.trabajo_realizado = trabajosMap.get(g.equipo_id);
            });
        }
        
        setGarantias(garantiasList);

    } catch (error) {
        console.error("Error fetching warranties:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las garantías.' });
    } finally {
        setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const filteredGarantias = garantias.filter(g => {
      const term = searchTerm.toLowerCase();
      const matchTerm = !term ||
          g.cliente_nombre.toLowerCase().includes(term) ||
          g.equipo_info.toLowerCase().includes(term);
      
      const matchStatus = !statusFilter || g.estado === statusFilter;

      let matchDate = true;
      if (dateRange?.from) {
          const fechaFin = new Date(g.fecha_fin + "T00:00:00");
          const from = dateRange.from;
          const to = dateRange.to ?? from;
          matchDate = fechaFin >= from && fechaFin <= to;
      }
      
      return matchTerm && matchStatus && matchDate;
  });

  if (loading) return <p>Cargando garantías...</p>;

  const renderStatusBadge = (garantia: Garantia) => {
    const badge = <Badge variant={getStatusVariant(garantia.estado)}>{garantia.estado}</Badge>;
    const trabajo = garantia.trabajo_realizado;

    if (garantia.estado === 'Activa' && trabajo) {
      return (
        <Popover>
          <PopoverTrigger asChild>
            <span className="relative">
              {badge}
              <Info className="h-3 w-3 absolute -top-1 -right-1 text-primary-foreground bg-primary rounded-full" />
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-96" align="end">
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="font-medium">Cobertura de Garantía</h4>
                <p className="text-sm text-muted-foreground">
                    Registrado por: {garantia.usuario_id || 'N/A'}
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <h5 className="font-semibold text-sm">Ítems Cubiertos</h5>
                <ScrollArea className="h-40">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Cant.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trabajo.items_utilizados.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>{item.nombre}</TableCell>
                          <TableCell><Badge variant={item.tipo === 'Repuesto' ? 'outline' : 'secondary'} className="text-xs">{item.tipo}</Badge></TableCell>
                          <TableCell className="text-right">{item.cantidad}</TableCell>
                        </TableRow>
                      ))}
                       {trabajo.items_adicionales.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>{item.nombre}</TableCell>
                          <TableCell><Badge variant={item.tipo === 'Repuesto' ? 'outline' : 'secondary'} className="text-xs">{item.tipo}</Badge></TableCell>
                          <TableCell className="text-right">{item.cantidad}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      );
    }
    return badge;
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Garantías de Servicio</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Garantías</CardTitle>
          <CardDescription>Consulte y filtre las garantías de servicio emitidas.</CardDescription>
          <div className="flex flex-col md:flex-row gap-4 pt-2">
            <Input
              placeholder="Buscar por cliente o equipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow"
            />
            <div className="flex items-center gap-2">
                <Button variant={statusFilter === '' ? 'secondary' : 'ghost'} size="sm" onClick={() => setStatusFilter('')}>Todos</Button>
                <Button variant={statusFilter === 'Activa' ? 'secondary' : 'ghost'} size="sm" onClick={() => setStatusFilter('Activa')}>Activas</Button>
                <Button variant={statusFilter === 'Vencida' ? 'secondary' : 'ghost'} size="sm" onClick={() => setStatusFilter('Vencida')}>Vencidas</Button>
                <Button variant={statusFilter === 'Utilizada' ? 'secondary' : 'ghost'} size="sm" onClick={() => setStatusFilter('Utilizada')}>Utilizadas</Button>
            </div>
             <Popover>
                <PopoverTrigger asChild>
                    <Button id="date" variant={"outline"} className={cn("w-full md:w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })}</>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Filtrar por fecha de Vencimiento</span>)}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar initialFocus mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es}/>
                </PopoverContent>
            </Popover>
          </div>
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
                      {renderStatusBadge(garantia)}
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
