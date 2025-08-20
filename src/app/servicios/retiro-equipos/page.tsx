
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function RetiroEquiposPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Retiro de Equipos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Proceso para registrar la entrega de equipos reparados a los clientes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
