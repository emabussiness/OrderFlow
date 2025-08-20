
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function TrabajosRealizadosPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Trabajos Realizados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Registro y seguimiento de las tareas y trabajos completados en cada orden de servicio.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
