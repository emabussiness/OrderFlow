
"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default function ReclamosServicioPage() {
  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Reclamos y Garantías</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verificar Garantía de Equipo</CardTitle>
          <CardDescription>
            Busque por ID de recepción, número de serie del equipo o datos del cliente para iniciar un reclamo de garantía.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex w-full max-w-sm items-center space-x-2">
            <Input type="text" placeholder="Buscar equipo o recepción..." />
            <Button type="submit">
              <Search className="mr-2 h-4 w-4"/>
              Verificar
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Reclamos en Proceso</CardTitle>
          <CardDescription>
            Listado de equipos que ingresaron por un reclamo de garantía y están actualmente en el taller.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="h-48 flex items-center justify-center text-muted-foreground">
                <p>Aún no hay reclamos en proceso.</p>
            </div>
        </CardContent>
      </Card>

    </div>
  );
}
