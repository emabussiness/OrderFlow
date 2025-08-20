
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ClientesPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aquí se administrarán los clientes de la empresa.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
