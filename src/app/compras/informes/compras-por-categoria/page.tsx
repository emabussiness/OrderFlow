
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";


// Types
type CompraItem = {
    producto_id: string;
    cantidad_recibida: number;
    precio_unitario: number;
};
type Compra = {
  id: string;
  fecha_compra: string; // "yyyy-MM-dd"
  items: CompraItem[];
};
type Producto = {
    id: string;
    categoria_id: string;
};
type Categoria = {
    id: string;
    nombre: string;
};
type ReportData = {
  categoria: string;
  total: number;
};

// Formatters
const currencyFormatter = new Intl.NumberFormat('es-PY', {
  style: 'currency',
  currency: 'PYG',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const formatYAxis = (tick: number) => {
    if (tick >= 1_000_000_000) return `${(tick / 1_000_000_000).toFixed(1)}G`;
    if (tick >= 1_000_000) return `${(tick / 1_000_000).toFixed(1)}M`;
    if (tick >= 1_000) return `${(tick / 1_000).toFixed(0)}K`;
    return currencyFormatter.format(tick);
};

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid grid-cols-1 gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">Categoría</span>
              <span className="font-bold text-foreground">{label}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">Total Comprado</span>
              <span className="font-bold text-primary">{currencyFormatter.format(payload[0].value)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
};

export default function ComprasPorCategoriaPage() {
  const { toast } = useToast();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData[]>([]);

  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -29),
    to: new Date(),
  });
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>([]);


  // Data Fetching
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [comprasSnap, productosSnap, categoriasSnap] = await Promise.all([
          getDocs(query(collection(db, 'compras'), orderBy("fecha_compra", "desc"))),
          getDocs(collection(db, 'productos')),
          getDocs(collection(db, 'categorias_productos'), orderBy("nombre"))
        ]);
        
        setCompras(comprasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Compra)));
        setProductos(productosSnap.docs.map(doc => ({ id: doc.id, categoria_id: doc.data().categoria_id } as Producto)));
        setCategorias(categoriasSnap.docs.map(doc => ({ id: doc.id, nombre: doc.data().nombre } as Categoria)));

      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos necesarios para el informe.' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  // Data Processing
  const processedData = useMemo(() => {
    if (!compras.length || !productos.length || !categorias.length || !date?.from) return [];

    const productosMap = new Map(productos.map(p => [p.id, p.categoria_id]));
    const categoriasMap = new Map(categorias.map(c => [c.id, c.nombre]));

    const filteredCompras = compras.filter(compra => {
      const fechaCompra = new Date(compra.fecha_compra + "T00:00:00"); 
      const from = date.from!;
      const to = date.to ?? from;
      return fechaCompra >= from && fechaCompra <= to;
    });

    const dataByCategory = filteredCompras.reduce((acc, compra) => {
        compra.items.forEach(item => {
            const categoriaId = productosMap.get(item.producto_id);
            if (categoriaId) {
                if (selectedCategorias.length === 0 || selectedCategorias.includes(categoriaId)) {
                    if (!acc[categoriaId]) {
                        acc[categoriaId] = 0;
                    }
                    acc[categoriaId] += item.cantidad_recibida * item.precio_unitario;
                }
            }
        });
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(dataByCategory)
      .map(([categoriaId, total]) => ({
         categoria: categoriasMap.get(categoriaId) || 'Sin Categoría',
         total 
       }))
      .sort((a, b) => b.total - a.total);

  }, [compras, productos, categorias, date, selectedCategorias]);

  useEffect(() => {
    setReportData(processedData);
  }, [processedData]);
  
  const handleCategorySelection = (categoryId: string) => {
      setSelectedCategorias(prev => 
        prev.includes(categoryId) 
            ? prev.filter(id => id !== categoryId)
            : [...prev, categoryId]
      );
  }

  if (loading) return <p>Generando informe...</p>;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (date.to ? (<>{format(date.from, "LLL dd, y", { locale: es })} - {format(date.to, "LLL dd, y", { locale: es })}</>) : (format(date.from, "LLL dd, y", { locale: es }))) : (<span>Seleccione un rango</span>)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar initialFocus mode="range" selected={date} onSelect={setDate} numberOfMonths={2} locale={es}/>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        Filtrar por Categoría
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>Categorías de Productos</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {categorias.map(categoria => (
                        <DropdownMenuCheckboxItem
                            key={categoria.id}
                            checked={selectedCategorias.includes(categoria.id)}
                            onCheckedChange={() => handleCategorySelection(categoria.id)}
                        >
                            {categoria.nombre}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total de Compras por Categoría de Producto</CardTitle>
            <CardDescription>
              Este gráfico muestra el monto total comprado para cada categoría en el período seleccionado.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            {reportData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <XAxis dataKey="categoria" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={100} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatYAxis} domain={[0, 'dataMax + 1000']} width={80}/>
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--secondary))" }} />
                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                    <p>No hay datos disponibles para el período o filtros seleccionados.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
