
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function OrdenDeTrabajoPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Orden de Trabajo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Gestión de las órdenes de trabajo para los servicios aprobados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
