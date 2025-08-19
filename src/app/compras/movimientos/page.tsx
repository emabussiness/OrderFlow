"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function MovimientosPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Movimientos de Compra</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aquí se gestionan los movimientos de compra.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
