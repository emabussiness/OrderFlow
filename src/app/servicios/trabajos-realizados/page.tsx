
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TrabajosRealizadosPage() {
  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Trabajos Realizados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Aquí se registran los detalles de cada reparación. Para registrar un trabajo, por favor, vaya a la sección de Órdenes de Trabajo y seleccione la OT correspondiente.
          </p>
           <Button asChild>
            <Link href="/servicios/orden-trabajo">Ir a Órdenes de Trabajo</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
