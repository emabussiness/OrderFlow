
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function RankingProductosPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Informe de Ranking de Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Este informe se encuentra en construcción.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
