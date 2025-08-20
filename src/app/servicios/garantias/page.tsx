
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function GarantiasPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Garantías de Servicio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Gestión de las garantías asociadas a los servicios realizados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
