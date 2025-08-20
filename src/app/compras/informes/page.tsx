
"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

const reports = [
  {
    title: "Compras por Proveedor",
    description: "Analice el total comprado a cada proveedor en un período de tiempo determinado.",
    href: "/compras/informes/compras-por-proveedor",
  },
  {
    title: "Ranking de Productos Comprados",
    description: "Vea los productos más comprados por cantidad o por monto total invertido.",
    href: "/compras/informes/ranking-productos",
  },
   {
    title: "Compras por Categoría",
    description: "Analice el total comprado para cada categoría de producto.",
    href: "/compras/informes/compras-por-categoria",
  },
];

export default function InformesPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {reports.map((report) => (
        <Link href={report.href} key={report.href}>
          <Card className="hover:border-primary transition-all duration-200 group h-full flex flex-col">
            <CardHeader>
              <CardTitle>{report.title}</CardTitle>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex justify-end items-end">
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transform-gpu transition-transform duration-200 group-hover:translate-x-1" />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
