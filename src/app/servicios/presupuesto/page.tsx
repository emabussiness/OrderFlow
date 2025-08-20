
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function PresupuestoServicioPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Presupuesto de Servicio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aquí se generarán los presupuestos para la reparación de equipos, que podrán ser aprobados o rechazados por el cliente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
