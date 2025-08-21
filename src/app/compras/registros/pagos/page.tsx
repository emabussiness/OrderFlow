
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/command";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type FacturaAfectada = { 
  id: string; 
  numero_factura: string; 
  monto_aplicado: number;
};

type PagoProveedor = {
  id: string;
  proveedor_nombre: string;
  fecha_pago: string;
  monto_total: number;
  forma_pago_id: string;
  forma_pago_nombre: string;
  banco_id?: string;
  banco_nombre?: string;
  numero_referencia?: string;
  cheque_info?: {
    tipo: string;
    numero: string;
    fecha_emision: string;
    fecha_pago: string;
  };
  facturas_afectadas: FacturaAfectada[];
  usuario_id: string;
};

type FormaPago = { id: string; nombre: string; };

const currencyFormatter = new Intl.NumberFormat('es-PY', {
  style: 'currency',
  currency: 'PYG',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export default function PagosProveedoresPage() {
  const { toast } = useToast();
  const [pagos, setPagos] = useState<PagoProveedor[]>([]);
  const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
  const [loading, setLoading] = useState(true);

  // State for details dialog
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedPago, setSelectedPago] = useState<PagoProveedor | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [formaPagoFilter, setFormaPagoFilter] = useState("");

  useEffect(() => {
    const fetchPagos = async () => {
      setLoading(true);
      try {
        const [pagosSnap, formasPagoSnap] = await Promise.all([
            getDocs(query(collection(db, 'pagos_proveedores'), orderBy("fecha_pago", "desc"))),
            getDocs(query(collection(db, 'formas_pago'), orderBy("nombre")))
        ]);

        const dataList = pagosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PagoProveedor));
        setPagos(dataList);
        
        const formasPagoList = formasPagoSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FormaPago));
        setFormasPago(formasPagoList);

      } catch (error) {
        console.error("Error fetching payments:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los pagos.' });
      } finally {
        setLoading(false);
      }
    };
    fetchPagos();
  }, [toast]);

  const filteredPagos = pagos.filter(pago => {
      const matchTerm = searchTerm === '' || pago.proveedor_nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchFormaPago = formaPagoFilter === '' || pago.forma_pago_id === formaPagoFilter;
      return matchTerm && matchFormaPago;
  })
  
  const handleOpenDetails = (pago: PagoProveedor) => {
    setSelectedPago(pago);
    setOpenDetails(true);
  }

  if (loading) return <p>Cargando pagos...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Pagos a Proveedores</h1>
        <div className="flex gap-2 w-full max-w-md">
             <Input 
                placeholder="Buscar por proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Combobox 
                options={[{value: '', label: 'Todas las formas de pago'}, ...formasPago.map(fp => ({ value: fp.id, label: fp.nombre }))]}
                value={formaPagoFilter}
                onChange={setFormaPagoFilter}
                placeholder="Filtrar por forma de pago"
                searchPlaceholder="Buscar forma de pago..."
            />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos Realizados</CardTitle>
          <CardDescription>Registro de todos los pagos emitidos a proveedores.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha Pago</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Forma de Pago</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead className="text-right">Monto Pagado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPagos.map((pago) => (
                <TableRow key={pago.id}>
                  <TableCell>{pago.fecha_pago}</TableCell>
                  <TableCell className="font-medium">{pago.proveedor_nombre}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{pago.forma_pago_nombre}</Badge>
                  </TableCell>
                  <TableCell>{pago.banco_nombre || 'N/A'}</TableCell>
                  <TableCell>{pago.numero_referencia || pago.cheque_info?.numero ||'N/A'}</TableCell>
                  <TableCell className="text-right font-bold">{currencyFormatter.format(pago.monto_total)}</TableCell>
                  <TableCell>
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDetails(pago)}>Ver Detalles</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredPagos.length === 0 && <p className="text-center text-muted-foreground mt-4">No se encontraron pagos que coincidan con los filtros.</p>}
        </CardContent>
      </Card>
      
      <Dialog open={openDetails} onOpenChange={setOpenDetails}>
          <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                  <DialogTitle>Detalles del Pago a {selectedPago?.proveedor_nombre}</DialogTitle>
              </DialogHeader>
              {selectedPago && (
                  <div className="py-4 space-y-6">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                          <div><Label>Fecha de Pago</Label><p>{selectedPago.fecha_pago}</p></div>
                          <div><Label>Forma de Pago</Label><p>{selectedPago.forma_pago_nombre}</p></div>
                          <div><Label>Banco</Label><p>{selectedPago.banco_nombre || 'N/A'}</p></div>
                          <div><Label>Referencia</Label><p>{selectedPago.numero_referencia || selectedPago.cheque_info?.numero ||'N/A'}</p></div>
                          {selectedPago.cheque_info && (
                              <>
                                <div><Label>Tipo Cheque</Label><p>{selectedPago.cheque_info.tipo}</p></div>
                                <div><Label>Emisión Cheque</Label><p>{selectedPago.cheque_info.fecha_emision}</p></div>
                                {selectedPago.cheque_info.tipo === 'Diferido' && <div><Label>Pago Cheque</Label><p>{selectedPago.cheque_info.fecha_pago}</p></div>}
                              </>
                          )}
                          <div><Label>Registrado por</Label><p>{selectedPago.usuario_id}</p></div>
                      </div>
                      
                      <div>
                          <Label className="font-semibold">Facturas Canceladas con este Pago</Label>
                          <Table className="mt-2">
                              <TableHeader>
                                  <TableRow>
                                      <TableHead>Número de Factura</TableHead>
                                      <TableHead className="text-right">Monto Aplicado</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {selectedPago.facturas_afectadas.map(factura => (
                                      <TableRow key={factura.id}>
                                          <TableCell>{factura.numero_factura}</TableCell>
                                          <TableCell className="text-right">{currencyFormatter.format(factura.monto_aplicado)}</TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                      </div>

                  </div>
              )}
              <DialogFooter className="border-t pt-4 flex justify-between items-center w-full">
                  <div className="font-bold text-lg">Total Pagado: {currencyFormatter.format(selectedPago?.monto_total || 0)}</div>
                  <Button variant="outline" onClick={() => setOpenDetails(false)}>Cerrar</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}

