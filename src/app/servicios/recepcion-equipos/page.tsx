
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function RecepcionEquiposPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Recepción de Equipos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aquí se registrará la entrada de equipos de clientes para servicio técnico.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
