
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function TecnicosPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Técnicos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aquí se administrará al personal técnico.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
