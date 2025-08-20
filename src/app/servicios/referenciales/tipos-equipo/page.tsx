
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function TiposEquipoPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Tipos de Equipo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aquí se administrarán los tipos o categorías de equipos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
