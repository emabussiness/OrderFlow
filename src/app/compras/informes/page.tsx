
"use client";

import React, { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";


type Compra = {
  id: string;
  fecha_compra: string; // "yyyy-MM-dd"
  proveedor_nombre: string;
  total: number;
};

type ReportData = {
  proveedor: string;
  total: number;
};

const currencyFormatter = new Intl.NumberFormat('es-PY', {
  style: 'currency',
  currency: 'PYG',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const formatYAxis = (tick: number) => {
    if (tick >= 1_000_000_000) {
        return `${(tick / 1_000_000_000).toFixed(1)}G`;
    }
    if (tick >= 1_000_000) {
        return `${(tick / 1_000_000).toFixed(1)}M`;
    }
    if (tick >= 1_000) {
        return `${(tick / 1_000).toFixed(0)}K`;
    }
    return currencyFormatter.format(tick);
};


export default function InformesComprasPage() {
  const { toast } = useToast();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData[]>([]);

  // State for the date range picker
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -29), // Default to last 30 days
    to: new Date(),
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const qCompras = query(collection(db, 'compras'), orderBy("fecha_compra", "desc"));
        const snapshotCompras = await getDocs(qCompras);
        const dataList = snapshotCompras.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            fecha_compra: data.fecha_compra,
            proveedor_nombre: data.proveedor_nombre,
            total: data.total,
          } as Compra;
        });
        setCompras(dataList);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos de compras.' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  useEffect(() => {
    if (!compras.length || !date || !date.from) return;

    const filteredCompras = compras.filter(compra => {
      const fechaCompra = new Date(compra.fecha_compra + "T00:00:00"); // Avoid timezone issues
      const from = date.from!;
      const to = date.to ?? from;
      return fechaCompra >= from && fechaCompra <= to;
    });

    const dataByProvider = filteredCompras.reduce((acc, compra) => {
      if (!acc[compra.proveedor_nombre]) {
        acc[compra.proveedor_nombre] = 0;
      }
      acc[compra.proveedor_nombre] += compra.total;
      return acc;
    }, {} as Record<string, number>);

    const formattedData = Object.entries(dataByProvider)
      .map(([proveedor, total]) => ({ proveedor, total }))
      .sort((a, b) => b.total - a.total); // Sort descending

    setReportData(formattedData);

  }, [compras, date]);
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid grid-cols-1 gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Proveedor
              </span>
              <span className="font-bold text-foreground">{label}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Total Compras
              </span>
              <span className="font-bold text-primary">
                 {currencyFormatter.format(payload[0].value)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) return <p>Generando informes...</p>;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Informes de Compras</h1>
        <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[300px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "LLL dd, y", { locale: es })} -{" "}
                        {format(date.to, "LLL dd, y", { locale: es })}
                      </>
                    ) : (
                      format(date.from, "LLL dd, y", { locale: es })
                    )
                  ) : (
                    <span>Seleccione un rango</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total de Compras por Proveedor</CardTitle>
            <CardDescription>
              Este gráfico muestra el monto total comprado a cada proveedor en el período seleccionado.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            {reportData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <XAxis
                            dataKey="proveedor"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            interval={0} 
                            angle={-45}
                            textAnchor="end"
                            height={80} 
                        />
                        <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={formatYAxis}
                            domain={[0, 'dataMax + 1000']}
                            width={80}
                        />
                         <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--secondary))" }} />
                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                    <p>No hay datos disponibles para el período seleccionado.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
