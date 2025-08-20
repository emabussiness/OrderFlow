
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function DiagnosticoPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Diagnóstico de Equipos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            En esta sección, los técnicos registrarán el diagnóstico de los equipos recibidos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
