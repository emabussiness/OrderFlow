
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ServiciosPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Servicios (Mano de Obra)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aquí se administrará el catálogo de servicios y mano de obra.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
