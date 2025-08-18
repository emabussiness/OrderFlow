"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter as DialogFooterComponent } from "@/components/ui/dialog";

type LibroIvaCompra = {
  id: string;
  compra_id: string;
  fecha_factura: string;
  proveedor_nombre: string;
  proveedor_ruc: string;
  numero_factura: string;
  total_compra: number;
  gravada_10: number;
  iva_10: number;
  gravada_5: number;
  iva_5: number;
  exenta: number;
};

type Compra = {
  id: string;
  orden_compra_id: string;
  proveedor_id: string;
  proveedor_nombre: string;
  proveedor_ruc: string;
  deposito_id: string;
  deposito_nombre: string;
  fecha_compra: string;
  numero_factura: string;
  total: number;
  total_iva_10: number;
  total_iva_5: number;
  items: any[];
  usuario_id: string;
  fecha_creacion: any;
};

const currencyFormatter = new Intl.NumberFormat('es-PY', {
  style: 'currency',
  currency: 'PYG',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export default function LibroIvaComprasPage() {
  const { toast } = useToast();
  const [registros, setRegistros] = useState<LibroIvaCompra[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState<Compra | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const qLibro = query(collection(db, 'libro_iva_compras'), orderBy("fecha_factura", "desc"));
        const snapshotLibro = await getDocs(qLibro);
        const dataListLibro = snapshotLibro.docs.map(doc => ({ id: doc.id, ...doc.data() } as LibroIvaCompra));
        setRegistros(dataListLibro);

        const qCompras = query(collection(db, 'compras'), orderBy("fecha_creacion", "desc"));
        const snapshotCompras = await getDocs(qCompras);
        const dataListCompras = snapshotCompras.docs.map(doc => ({ id: doc.id, ...doc.data() } as Compra));
        setCompras(dataListCompras);

      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [toast]);
  
  const handleOpenDetails = (registro: LibroIvaCompra) => {
    const compraAsociada = compras.find(c => c.id === registro.compra_id);
    if(compraAsociada) {
      setSelectedCompra(compraAsociada);
      setOpenDetails(true);
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró la compra asociada.' });
    }
  }

  if (loading) return <p>Cargando registros...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Libro IVA Compras</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registros de IVA por Compra</CardTitle>
          <CardDescription>Detalle de los impuestos generados en cada factura de compra.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Factura Nro.</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>RUC</TableHead>
                  <TableHead className="text-right">Gravada 10%</TableHead>
                  <TableHead className="text-right">IVA 10%</TableHead>
                  <TableHead className="text-right">Gravada 5%</TableHead>
                  <TableHead className="text-right">IVA 5%</TableHead>
                  <TableHead className="text-right">Exenta</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registros.map((reg) => (
                  <TableRow key={reg.id}>
                    <TableCell>{reg.fecha_factura}</TableCell>
                    <TableCell>{reg.numero_factura}</TableCell>
                    <TableCell>{reg.proveedor_nombre}</TableCell>
                    <TableCell>{reg.proveedor_ruc}</TableCell>
                    <TableCell className="text-right">{currencyFormatter.format(reg.gravada_10)}</TableCell>
                    <TableCell className="text-right">{currencyFormatter.format(reg.iva_10)}</TableCell>
                    <TableCell className="text-right">{currencyFormatter.format(reg.gravada_5)}</TableCell>
                    <TableCell className="text-right">{currencyFormatter.format(reg.iva_5)}</TableCell>
                    <TableCell className="text-right">{currencyFormatter.format(reg.exenta)}</TableCell>
                    <TableCell className="text-right font-medium">{currencyFormatter.format(reg.total_compra)}</TableCell>
                     <TableCell>
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDetails(reg)}>Ver Compra Asociada</DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
           {registros.length === 0 && <p className="text-center text-muted-foreground mt-4">No hay registros de IVA Compras.</p>}
        </CardContent>
      </Card>
      
      <Dialog open={openDetails} onOpenChange={setOpenDetails}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>Detalles de la Compra: {selectedCompra?.id.substring(0,7)}</DialogTitle>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto pr-6 -mr-6">
            {selectedCompra && (
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div><p className="font-semibold">Proveedor:</p><p>{selectedCompra.proveedor_nombre} (RUC: {selectedCompra.proveedor_ruc})</p></div>
                        <div><p className="font-semibold">Orden de Compra:</p><p>{selectedCompra.orden_compra_id.substring(0,7)}</p></div>
                        <div><p className="font-semibold">Depósito:</p><p>{selectedCompra.deposito_nombre}</p></div>
                        <div><p className="font-semibold">Número de Factura:</p><p>{selectedCompra.numero_factura}</p></div>
                        <div><p className="font-semibold">Fecha de Factura:</p><p>{selectedCompra.fecha_compra}</p></div>
                        <div><p className="font-semibold">Registrado por:</p><p>{selectedCompra.usuario_id}</p></div>
                        <div><p className="font-semibold">Fecha de Registro:</p><p>{selectedCompra.fecha_creacion?.toDate().toLocaleString()}</p></div>
                    </div>

                    <Card>
                        <CardHeader><CardTitle>Productos Recibidos</CardTitle></CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Producto</TableHead><TableHead>Cantidad</TableHead><TableHead>P. Unit.</TableHead><TableHead>%IVA</TableHead><TableHead className="text-right">Subtotal</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedCompra.items.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{item.nombre}</TableCell>
                                            <TableCell>{item.cantidad_recibida}</TableCell>
                                            <TableCell>${item.precio_unitario.toFixed(2)}</TableCell>
                                            <TableCell>{item.iva_tipo}%</TableCell>
                                            <TableCell className="text-right">${(item.cantidad_recibida * item.precio_unitario).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <Card className="mt-4">
                        <CardHeader><CardTitle>Resumen de Impuestos</CardTitle></CardHeader>
                        <CardContent>
                            <div className="flex justify-around">
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">IVA 10%</p>
                                    <p className="font-bold text-lg">${selectedCompra.total_iva_10.toFixed(2)}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">IVA 5%</p>
                                    <p className="font-bold text-lg">${selectedCompra.total_iva_5.toFixed(2)}</p>
                                </div>
                                 <div className="text-center">
                                    <p className="text-sm text-muted-foreground">Total IVA</p>
                                    <p className="font-bold text-lg">${(selectedCompra.total_iva_10 + selectedCompra.total_iva_5).toFixed(2)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
            </div>
            <DialogFooterComponent className="border-t pt-4">
                <div className="flex w-full justify-between items-center">
                    <div className="text-right font-bold text-xl">Total Facturado: ${selectedCompra?.total.toFixed(2)}</div>
                    <Button variant="outline" onClick={() => setOpenDetails(false)}>Cerrar</Button>
                </div>
            </DialogFooterComponent>
        </DialogContent>
      </Dialog>
    </>
  );
}
