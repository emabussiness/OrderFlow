
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function FacturacionPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Módulo de Facturación</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Emisión y seguimiento de facturas de venta.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
