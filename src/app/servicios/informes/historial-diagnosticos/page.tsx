
"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Eye, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";


// --- Types ---
type Equipo = {
  id: string;
  cliente_nombre: string;
  recepcion_id: string;
  fecha_diagnostico?: string;
  tipo_equipo_nombre: string;
  marca_nombre: string;
  modelo: string;
  diagnostico_tecnico?: string;
  trabajos_a_realizar?: string;
  estado: "Recibido" | "Diagnosticado" | "Presupuestado" | "En Reparación" | "Reparado" | "Retirado";
};

const getStatusVariant = (status: string): "secondary" | "default" | "destructive" | "outline" => {
    switch (status) {
      case "Diagnosticado": return "default";
      case "Presupuestado": return "secondary";
      case "En Reparación": return "outline";
      case "Reparado": return "default";
      case "Retirado": return "secondary";
      default: return "destructive";
    }
  };

const ESTADOS_EQUIPO = [
    { value: "Diagnosticado", label: "Diagnosticado" },
    { value: "Presupuestado", label: "Presupuestado" },
    { value: "En Reparación", label: "En Reparación" },
    { value: "Reparado", label: "Reparado" },
    { value: "Retirado", label: "Retirado" },
];

// --- Main Component ---
export default function HistorialDiagnosticosPage() {
  const { toast } = useToast();
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'equipos_en_servicio'),
          where("diagnostico_tecnico", "!=", null)
        );
        const querySnapshot = await getDocs(q);
        const equiposList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipo));
        
        equiposList.sort((a, b) => 
            new Date(b.fecha_diagnostico || 0).getTime() - new Date(a.fecha_diagnostico || 0).getTime()
        );

        setEquipos(equiposList);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el historial de diagnósticos." });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const filteredEquipos = useMemo(() => {
    return equipos.filter(equipo => {
        const term = searchTerm.toLowerCase();
        
        const matchTerm = !term ||
            equipo.cliente_nombre.toLowerCase().includes(term) ||
            equipo.recepcion_id?.toLowerCase().includes(term) ||
            equipo.tipo_equipo_nombre.toLowerCase().includes(term) ||
            equipo.marca_nombre.toLowerCase().includes(term) ||
            equipo.modelo.toLowerCase().includes(term) ||
            (equipo.diagnostico_tecnico && equipo.diagnostico_tecnico.toLowerCase().includes(term));

        const matchStatus = !statusFilter || equipo.estado === statusFilter;

        let matchDate = true;
        if (dateRange?.from && equipo.fecha_diagnostico) {
          const fechaDiagnostico = new Date(equipo.fecha_diagnostico + "T00:00:00");
          const from = dateRange.from;
          const to = dateRange.to ?? from;
          matchDate = fechaDiagnostico >= from && fechaDiagnostico <= to;
        } else if(dateRange?.from && !equipo.fecha_diagnostico) {
            matchDate = false;
        }

        return matchTerm && matchStatus && matchDate;
    });

  }, [equipos, searchTerm, statusFilter, dateRange]);

  if (loading) return <p>Cargando historial...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Historial de Diagnósticos</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos los Diagnósticos Registrados</CardTitle>
          <CardDescription>
            Consulte el historial completo de diagnósticos técnicos realizados, aplicando filtros para refinar su búsqueda.
          </CardDescription>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <Input
                    placeholder="Buscar por cliente, ID, equipo o diagnóstico..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="md:col-span-1"
                />
                <Combobox
                    options={[{value: '', label: 'Todos los estados'}, ...ESTADOS_EQUIPO]}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    placeholder="Filtrar por estado"
                />
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })}</>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Filtrar por fecha de diagnóstico</span>)}
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
                <TableHead>Fecha Diag.</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead>ID Recepción</TableHead>
                <TableHead>Estado Actual</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEquipos.map((equipo) => (
                <TableRow key={equipo.id}>
                  <TableCell>{equipo.fecha_diagnostico || "N/A"}</TableCell>
                  <TableCell>{equipo.cliente_nombre}</TableCell>
                  <TableCell>{`${equipo.tipo_equipo_nombre} ${equipo.marca_nombre} ${equipo.modelo}`}</TableCell>
                  <TableCell>{equipo.recepcion_id?.substring(0, 7)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(equipo.estado)}>{equipo.estado}</Badge>
                  </TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-96">
                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <h4 className="font-medium leading-none">Diagnóstico Técnico</h4>
                            <p className="text-sm text-muted-foreground">
                              {equipo.diagnostico_tecnico}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-medium leading-none">Trabajos a Realizar</h4>
                            <p className="text-sm text-muted-foreground">
                              {equipo.trabajos_a_realizar}
                            </p>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredEquipos.length === 0 && (
            <p className="text-center text-muted-foreground py-10">
              No se encontraron diagnósticos que coincidan con la búsqueda.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
