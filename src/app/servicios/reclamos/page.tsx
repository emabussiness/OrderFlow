
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ReclamosServicioPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Reclamos de Servicio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Módulo para la gestión y seguimiento de reclamos de clientes sobre los servicios prestados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
