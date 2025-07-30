"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Visión General</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Bienvenido a tu panel de control.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
