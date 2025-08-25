
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function VentasPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Módulo de Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Gestión de clientes, pedidos de venta y cotizaciones.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
