
"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { collection, getDocs, query, orderBy, where, writeBatch, serverTimestamp, doc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MoreHorizontal, Banknote, Calendar as CalendarIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter as DialogFooterComponent, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Combobox } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";


type CuentaPagar = {
  id: string;
  compra_id: string;
  proveedor_id: string;
  proveedor_nombre: string;
  numero_factura: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  monto_total: number;
  saldo_pendiente: number;
  estado: "Pendiente" | "Pagado Parcial" | "Pagado";
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

type FormaPago = { id: string; nombre: string; };
type Banco = { id: string; nombre: string; };

const currencyFormatter = new Intl.NumberFormat('es-PY', {
  style: 'currency',
  currency: 'PYG',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const RegistrarPagoDialog = ({ proveedorId, facturas, formasPago, bancos, onSuccessfulPayment }: { proveedorId: string, facturas: CuentaPagar[], formasPago: FormaPago[], bancos: Banco[], onSuccessfulPayment: () => void }) => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    
    // Form state
    const [fechaPago, setFechaPago] = useState<Date | undefined>(new Date());
    const [formaPagoId, setFormaPagoId] = useState('');
    const [bancoId, setBancoId] = useState('');
    const [numeroReferencia, setNumeroReferencia] = useState('');
    const [montoPagado, setMontoPagado] = useState(0);
    const [selectedFacturas, setSelectedFacturas] = useState<Record<string, boolean>>({});

    const facturasSeleccionadasParaPago = facturas.filter(f => selectedFacturas[f.id]);
    const totalAPagar = facturasSeleccionadasParaPago.reduce((sum, f) => sum + f.saldo_pendiente, 0);

    useEffect(() => {
        setMontoPagado(totalAPagar);
    }, [totalAPagar]);

    const resetForm = () => {
        setFechaPago(new Date());
        setFormaPagoId('');
        setBancoId('');
        setNumeroReferencia('');
        setMontoPagado(0);
        setSelectedFacturas({});
    }

    useEffect(() => {
        if (!open) {
            resetForm();
        }
    }, [open]);

    const handlePago = async () => {
        if (!fechaPago || !formaPagoId || montoPagado <= 0 || facturasSeleccionadasParaPago.length === 0) {
            toast({ variant: 'destructive', title: 'Error de validación', description: 'Fecha, forma de pago, facturas y un monto mayor a cero son requeridos.' });
            return;
        }

        if (montoPagado > totalAPagar) {
            toast({ variant: 'destructive', title: 'Monto inválido', description: 'El monto pagado no puede ser mayor al saldo total de las facturas seleccionadas.' });
            return;
        }

        try {
            const batch = writeBatch(db);
            const formaPagoSeleccionada = formasPago.find(fp => fp.id === formaPagoId);
            const bancoSeleccionado = bancos.find(b => b.id === bancoId);

            // 1. Create payment record
            const pagoRef = doc(collection(db, 'pagos_proveedores'));
            batch.set(pagoRef, {
                proveedor_id: proveedorId,
                proveedor_nombre: facturasSeleccionadasParaPago[0].proveedor_nombre,
                fecha_pago: format(fechaPago, "yyyy-MM-dd"),
                monto_total: montoPagado,
                forma_pago_id: formaPagoId,
                forma_pago_nombre: formaPagoSeleccionada?.nombre || 'N/A',
                banco_id: bancoId || null,
                banco_nombre: bancoSeleccionado?.nombre || null,
                numero_referencia: numeroReferencia || null,
                facturas_afectadas: facturasSeleccionadasParaPago.map(f => ({ id: f.id, numero_factura: f.numero_factura })),
                usuario_id: 'user-demo',
                fecha_creacion: serverTimestamp(),
            });

            // 2. Create treasury movement (egreso)
            const movimientoRef = doc(collection(db, 'movimientos_tesoreria'));
            batch.set(movimientoRef, {
                pago_id: pagoRef.id,
                tipo: 'Egreso',
                concepto: `Pago a proveedor: ${facturasSeleccionadasParaPago[0].proveedor_nombre}`,
                fecha_movimiento: format(fechaPago, "yyyy-MM-dd"),
                monto: montoPagado,
                forma_pago_nombre: formaPagoSeleccionada?.nombre || 'N/A',
                banco_nombre: bancoSeleccionado?.nombre || null,
                referencia: numeroReferencia || null,
            });

            // 3. Update account payables
            let montoRestanteAplicar = montoPagado;
            for (const factura of facturasSeleccionadasParaPago) {
                if (montoRestanteAplicar <= 0) break;

                const montoAAplicar = Math.min(factura.saldo_pendiente, montoRestanteAplicar);
                const nuevoSaldo = factura.saldo_pendiente - montoAAplicar;
                const nuevoEstado = nuevoSaldo <= 0 ? 'Pagado' : 'Pagado Parcial';
                
                const facturaRef = doc(db, 'cuentas_a_pagar', factura.id);
                batch.update(facturaRef, {
                    saldo_pendiente: increment(-montoAAplicar),
                    estado: nuevoEstado,
                });

                montoRestanteAplicar -= montoAAplicar;
            }

            await batch.commit();
            toast({ title: 'Pago Registrado', description: 'El pago y los registros asociados han sido actualizados.' });
            setOpen(false);
            onSuccessfulPayment();
        } catch (error) {
            console.error("Error al registrar el pago:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo registrar el pago.' });
        }
    }
    
    return (
         <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button disabled={facturas.length === 0}><Banknote className="mr-2 h-4 w-4"/>Registrar Pago a Proveedor</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Registrar Pago a {facturas[0]?.proveedor_nombre}</DialogTitle>
                    <CardDescription>Seleccione las facturas y complete los detalles del pago.</CardDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 flex-grow overflow-y-auto pr-4 -mr-4">
                    <div className="col-span-2">
                        <Label>Facturas Pendientes</Label>
                        <ScrollArea className="h-48 border rounded-md mt-2">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10"></TableHead>
                                        <TableHead>Factura Nro.</TableHead>
                                        <TableHead>Vencimiento</TableHead>
                                        <TableHead className="text-right">Saldo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {facturas.map(f => (
                                        <TableRow key={f.id}>
                                            <TableCell><Checkbox checked={selectedFacturas[f.id]} onCheckedChange={(checked) => setSelectedFacturas(prev => ({...prev, [f.id]: !!checked}))} /></TableCell>
                                            <TableCell>{f.numero_factura}</TableCell>
                                            <TableCell>{f.fecha_vencimiento}</TableCell>
                                            <TableCell className="text-right">{currencyFormatter.format(f.saldo_pendiente)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="fecha-pago">Fecha de Pago</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !fechaPago && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {fechaPago ? format(fechaPago, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={fechaPago} onSelect={setFechaPago} initialFocus locale={es} /></PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="monto">Monto a Pagar</Label>
                        <Input id="monto" type="number" value={montoPagado} onChange={(e) => setMontoPagado(Number(e.target.value) || 0)} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="forma-pago">Forma de Pago</Label>
                        <Combobox options={formasPago.map(f => ({ value: f.id, label: f.nombre }))} value={formaPagoId} onChange={setFormaPagoId} placeholder="Seleccione una forma de pago" />
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="banco">Banco (Opcional)</Label>
                        <Combobox options={bancos.map(b => ({ value: b.id, label: b.nombre }))} value={bancoId} onChange={setBancoId} placeholder="Seleccione un banco" disabled={formasPago.find(f => f.id === formaPagoId)?.nombre === 'Efectivo'} />
                    </div>
                    
                    <div className="col-span-2 space-y-2">
                        <Label htmlFor="referencia">Número de Referencia (Opcional)</Label>
                        <Input id="referencia" value={numeroReferencia} onChange={(e) => setNumeroReferencia(e.target.value)} placeholder="Ej: Nro. de Cheque, ID de transferencia..." />
                    </div>
                </div>
                <DialogFooterComponent className="border-t pt-4">
                    <div className="flex w-full justify-between items-center">
                        <div className="font-bold text-lg">Total Seleccionado: {currencyFormatter.format(totalAPagar)}</div>
                        <div>
                            <Button variant="outline" className="mr-2" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button onClick={handlePago} disabled={facturasSeleccionadasParaPago.length === 0 || montoPagado <= 0}>Confirmar Pago</Button>
                        </div>
                    </div>
                </DialogFooterComponent>
            </DialogContent>
        </Dialog>
    )
}

export default function CuentasPagarPage() {
  const { toast } = useToast();
  const [cuentas, setCuentas] = useState<CuentaPagar[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
  const [bancos, setBancos] = useState<Banco[]>([]);

  const [loading, setLoading] = useState(true);
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState<Compra | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Simplificamos la consulta para evitar el error de índice
      const qCuentas = query(collection(db, 'cuentas_a_pagar'), orderBy("fecha_vencimiento", "asc"));
      const snapshotCuentas = await getDocs(qCuentas);
      
      // Filtramos en el cliente
      const dataListCuentas = snapshotCuentas.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as CuentaPagar))
        .filter(cuenta => cuenta.estado === "Pendiente" || cuenta.estado === "Pagado Parcial");
      
      setCuentas(dataListCuentas);

      const [comprasSnap, formasPagoSnap, bancosSnap] = await Promise.all([
        getDocs(query(collection(db, 'compras'), orderBy("fecha_creacion", "desc"))),
        getDocs(query(collection(db, 'formas_pago'), orderBy("nombre"))),
        getDocs(query(collection(db, 'bancos'), orderBy("nombre"))),
      ]);
      setCompras(comprasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Compra)));
      setFormasPago(formasPagoSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FormaPago)));
      setBancos(bancosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banco)));

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDetails = (cuenta: CuentaPagar) => {
    const compraAsociada = compras.find(c => c.id === cuenta.compra_id);
    if(compraAsociada) {
      setSelectedCompra(compraAsociada);
      setOpenDetails(true);
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró la compra asociada.' });
    }
  }
  
  const getStatusVariant = (status: string): "secondary" | "default" | "destructive" | "outline" => {
    switch (status) {
      case "Pendiente": return "destructive";
      case "Pagado": return "default";
      case "Pagado Parcial": return "secondary";
      default: return "outline";
    }
  };
  
  const cuentasAgrupadas = cuentas.reduce((acc, cuenta) => {
      (acc[cuenta.proveedor_id] = acc[cuenta.proveedor_id] || []).push(cuenta);
      return acc;
  }, {} as Record<string, CuentaPagar[]>);


  if (loading) return <p>Cargando cuentas a pagar...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Cuentas a Pagar</h1>
      </div>

      {Object.entries(cuentasAgrupadas).map(([proveedorId, facturas]) => (
        <Card key={proveedorId} className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{facturas[0].proveedor_nombre}</CardTitle>
                    <CardDescription>{facturas.length} factura(s) pendiente(s).</CardDescription>
                </div>
                <RegistrarPagoDialog 
                    proveedorId={proveedorId} 
                    facturas={facturas}
                    formasPago={formasPago}
                    bancos={bancos}
                    onSuccessfulPayment={fetchData}
                />
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Factura Nro.</TableHead>
                    <TableHead>Fecha Emisión</TableHead>
                    <TableHead>Fecha Venc.</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Monto Total</TableHead>
                    <TableHead className="text-right">Saldo Pendiente</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {facturas.map((cuenta) => (
                    <TableRow key={cuenta.id}>
                    <TableCell>{cuenta.numero_factura}</TableCell>
                    <TableCell>{cuenta.fecha_emision}</TableCell>
                    <TableCell>{cuenta.fecha_vencimiento}</TableCell>
                    <TableCell>
                        <Badge variant={getStatusVariant(cuenta.estado)}>{cuenta.estado}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{currencyFormatter.format(cuenta.monto_total)}</TableCell>
                    <TableCell className="text-right font-medium">{currencyFormatter.format(cuenta.saldo_pendiente)}</TableCell>
                    <TableCell>
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDetails(cuenta)}>Ver Compra Asociada</DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
      ))}

      {cuentas.length === 0 && (
        <Card>
            <CardContent className="pt-6">
                 <p className="text-center text-muted-foreground mt-4">No hay cuentas a pagar pendientes.</p>
            </CardContent>
        </Card>
      )}


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
                                            <TableCell>{currencyFormatter.format(item.precio_unitario)}</TableCell>
                                            <TableCell>{item.iva_tipo}%</TableCell>
                                            <TableCell className="text-right">{currencyFormatter.format(item.cantidad_recibida * item.precio_unitario)}</TableCell>
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
                                    <p className="font-bold text-lg">{currencyFormatter.format(selectedCompra.total_iva_10)}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-muted-foreground">IVA 5%</p>
                                    <p className="font-bold text-lg">{currencyFormatter.format(selectedCompra.total_iva_5)}</p>
                                </div>
                                 <div className="text-center">
                                    <p className="text-sm text-muted-foreground">Total IVA</p>
                                    <p className="font-bold text-lg">{currencyFormatter.format(selectedCompra.total_iva_10 + selectedCompra.total_iva_5)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
            </div>
            <DialogFooterComponent className="border-t pt-4">
                <div className="flex w-full justify-between items-center">
                    <div className="text-right font-bold text-xl">Total Facturado: {currencyFormatter.format(selectedCompra?.total || 0)}</div>
                    <Button variant="outline" onClick={() => setOpenDetails(false)}>Cerrar</Button>
                </div>
            </DialogFooterComponent>
        </DialogContent>
      </Dialog>
    </>
  );
}
