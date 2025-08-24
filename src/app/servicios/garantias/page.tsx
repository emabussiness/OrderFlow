
"use client";

import { useState, useEffect } from "react";
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
import { Calendar as CalendarIcon } from "lucide-react";


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
  const [statusFilter, setStatusFilter] = useState<Garantia['estado'] | ''>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();


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

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Garantías de Servicio</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Garantías</CardTitle>
          <CardDescription className="flex flex-col md:flex-row gap-4 mt-2">
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
