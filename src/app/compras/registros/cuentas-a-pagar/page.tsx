
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";


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

type FacturaParaPago = CuentaPagar & {
  monto_a_aplicar: number;
};

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

    // Cheque specific fields
    const [tipoCheque, setTipoCheque] = useState<'Al Día' | 'Diferido'>('Al Día');
    const [numeroCheque, setNumeroCheque] = useState('');
    const [fechaEmisionCheque, setFechaEmisionCheque] = useState<Date | undefined>(new Date());
    const [fechaPagoCheque, setFechaPagoCheque] = useState<Date | undefined>(new Date());
    
    const [selectedFacturas, setSelectedFacturas] = useState<Record<string, boolean>>({});
    const [facturasParaPago, setFacturasParaPago] = useState<FacturaParaPago[]>([]);
    
    const formaPagoSeleccionada = formasPago.find(f => f.id === formaPagoId);

    useEffect(() => {
        const facturasFiltradas = facturas.filter(f => selectedFacturas[f.id]);
        setFacturasParaPago(facturasFiltradas.map(f => ({
            ...f,
            monto_a_aplicar: f.saldo_pendiente // Default a aplicar el saldo completo
        })));
    }, [selectedFacturas, facturas]);

    const totalAPagar = facturasParaPago.reduce((sum, f) => sum + f.monto_a_aplicar, 0);

    const handleMontoAAplicarChange = (facturaId: string, monto: number) => {
        const facturaOriginal = facturas.find(f => f.id === facturaId);
        if (!facturaOriginal) return;

        let montoValidado = monto;
        if (monto < 0) montoValidado = 0;
        if (monto > facturaOriginal.saldo_pendiente) {
            toast({ variant: 'destructive', title: 'Monto inválido', description: `El monto a aplicar no puede ser mayor al saldo de ${currencyFormatter.format(facturaOriginal.saldo_pendiente)}.` });
            montoValidado = facturaOriginal.saldo_pendiente;
        }

        setFacturasParaPago(prev => prev.map(f => f.id === facturaId ? { ...f, monto_a_aplicar: montoValidado } : f));
    }


    const resetForm = () => {
        setFechaPago(new Date());
        setFormaPagoId('');
        setBancoId('');
        setNumeroReferencia('');
        setSelectedFacturas({});
        setFacturasParaPago([]);
        setTipoCheque('Al Día');
        setNumeroCheque('');
        setFechaEmisionCheque(new Date());
        setFechaPagoCheque(new Date());
    }

    useEffect(() => {
        if (!open) {
            resetForm();
        }
    }, [open]);

    const handlePago = async () => {
        if (!fechaPago || !formaPagoId || totalAPagar <= 0 || facturasParaPago.length === 0) {
            toast({ variant: 'destructive', title: 'Error de validación', description: 'Fecha, forma de pago, facturas y un monto mayor a cero son requeridos.' });
            return;
        }

        if (formaPagoSeleccionada?.nombre === 'Cheque' && (!numeroCheque || !fechaEmisionCheque || (tipoCheque === 'Diferido' && !fechaPagoCheque))) {
             toast({ variant: 'destructive', title: 'Datos del Cheque Incompletos', description: 'Por favor, complete todos los campos requeridos para el cheque.' });
            return;
        }

        try {
            const batch = writeBatch(db);
            const bancoSeleccionado = bancos.find(b => b.id === bancoId);

            const pagoData: any = {
                proveedor_id: proveedorId,
                proveedor_nombre: facturasParaPago[0].proveedor_nombre,
                fecha_pago: format(fechaPago, "yyyy-MM-dd"),
                monto_total: totalAPagar,
                forma_pago_id: formaPagoId,
                forma_pago_nombre: formaPagoSeleccionada?.nombre || 'N/A',
                banco_id: bancoId || null,
                banco_nombre: bancoSeleccionado?.nombre || null,
                numero_referencia: numeroReferencia || null,
                facturas_afectadas: facturasParaPago.map(f => ({ id: f.id, numero_factura: f.numero_factura, monto_aplicado: f.monto_a_aplicar })),
                usuario_id: 'user-demo',
                fecha_creacion: serverTimestamp(),
            };

            if (formaPagoSeleccionada?.nombre === 'Cheque') {
                pagoData.cheque_info = {
                    tipo: tipoCheque,
                    numero: numeroCheque,
                    fecha_emision: format(fechaEmisionCheque!, "yyyy-MM-dd"),
                    fecha_pago: tipoCheque === 'Diferido' ? format(fechaPagoCheque!, "yyyy-MM-dd") : format(fechaEmisionCheque!, "yyyy-MM-dd"),
                };
            }

            const pagoRef = doc(collection(db, 'pagos_proveedores'));
            batch.set(pagoRef, pagoData);

            const movimientoRef = doc(collection(db, 'movimientos_tesoreria'));
            batch.set(movimientoRef, {
                pago_id: pagoRef.id,
                tipo: 'Egreso',
                concepto: `Pago a proveedor: ${facturasParaPago[0].proveedor_nombre}`,
                fecha_movimiento: format(fechaPago, "yyyy-MM-dd"),
                monto: totalAPagar,
                forma_pago_nombre: formaPagoSeleccionada?.nombre || 'N/A',
                banco_nombre: bancoSeleccionado?.nombre || null,
                referencia: formaPagoSeleccionada?.nombre === 'Cheque' ? `Cheque Nro ${numeroCheque}` : numeroReferencia || null,
            });

            for (const factura of facturasParaPago) {
                if (factura.monto_a_aplicar <= 0) continue;

                const nuevoSaldo = factura.saldo_pendiente - factura.monto_a_aplicar;
                const nuevoEstado = nuevoSaldo <= 0.01 ? 'Pagado' : 'Pagado Parcial';
                
                const facturaRef = doc(db, 'cuentas_a_pagar', factura.id);
                batch.update(facturaRef, {
                    saldo_pendiente: increment(-factura.monto_a_aplicar),
                    estado: nuevoEstado,
                });
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
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Registrar Pago a {facturas[0]?.proveedor_nombre}</DialogTitle>
                    <CardDescription>Seleccione las facturas y defina el monto a aplicar en cada una.</CardDescription>
                </DialogHeader>
                <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 overflow-y-auto pr-4 -mr-4">
                    <div className="md:col-span-2">
                        <Label>Facturas Pendientes</Label>
                        <ScrollArea className="h-48 border rounded-md mt-2">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10"></TableHead>
                                        <TableHead>Factura Nro.</TableHead>
                                        <TableHead>Vencimiento</TableHead>
                                        <TableHead className="text-right">Saldo</TableHead>
                                        <TableHead className="text-right w-[150px]">Monto a Aplicar</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {facturas.map(f => (
                                        <TableRow key={f.id}>
                                            <TableCell><Checkbox checked={selectedFacturas[f.id]} onCheckedChange={(checked) => setSelectedFacturas(prev => ({...prev, [f.id]: !!checked}))} /></TableCell>
                                            <TableCell>{f.numero_factura}</TableCell>
                                            <TableCell>{f.fecha_vencimiento}</TableCell>
                                            <TableCell className="text-right">{currencyFormatter.format(f.saldo_pendiente)}</TableCell>
                                            <TableCell className="text-right">
                                                {selectedFacturas[f.id] && (
                                                    <Input 
                                                        type="number" 
                                                        className="text-right"
                                                        value={facturasParaPago.find(fp => fp.id === f.id)?.monto_a_aplicar || 0}
                                                        onChange={(e) => handleMontoAAplicarChange(f.id, Number(e.target.value))}
                                                    />
                                                )}
                                            </TableCell>
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
                        <Label htmlFor="forma-pago">Forma de Pago</Label>
                        <Combobox options={formasPago.map(f => ({ value: f.id, label: f.nombre }))} value={formaPagoId} onChange={setFormaPagoId} placeholder="Seleccione una forma de pago" />
                    </div>
                    
                    {formaPagoSeleccionada?.nombre === 'Cheque' ? (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="tipo-cheque">Tipo de Cheque</Label>
                                <Select value={tipoCheque} onValueChange={(v: 'Al Día' | 'Diferido') => setTipoCheque(v)}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Al Día">Al Día</SelectItem>
                                        <SelectItem value="Diferido">Diferido</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="numero-cheque">Número de Cheque</Label>
                                <Input id="numero-cheque" value={numeroCheque} onChange={e => setNumeroCheque(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Fecha de Emisión (Cheque)</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !fechaEmisionCheque && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {fechaEmisionCheque ? format(fechaEmisionCheque, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={fechaEmisionCheque} onSelect={setFechaEmisionCheque} initialFocus locale={es} /></PopoverContent>
                                </Popover>
                            </div>
                           {tipoCheque === 'Diferido' && (
                             <div className="space-y-2">
                                <Label>Fecha de Pago (Cheque)</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !fechaPagoCheque && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {fechaPagoCheque ? format(fechaPagoCheque, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={fechaPagoCheque} onSelect={setFechaPagoCheque} initialFocus locale={es} /></PopoverContent>
                                </Popover>
                            </div>
                           )}
                        </>
                    ) : (
                         <div className="space-y-2">
                            <Label htmlFor="referencia">Número de Referencia (Opcional)</Label>
                            <Input id="referencia" value={numeroReferencia} onChange={(e) => setNumeroReferencia(e.target.value)} placeholder="Ej: ID de transferencia..." />
                        </div>
                    )}
                     <div className="space-y-2">
                        <Label htmlFor="banco">Banco (Opcional)</Label>
                        <Combobox options={bancos.map(b => ({ value: b.id, label: b.nombre }))} value={bancoId} onChange={setBancoId} placeholder="Seleccione un banco" />
                    </div>
                </div>
                <DialogFooterComponent className="border-t pt-4">
                    <div className="flex w-full justify-between items-center">
                        <div className="font-bold text-lg">Total a Pagar: {currencyFormatter.format(totalAPagar)}</div>
                        <div>
                            <Button variant="outline" className="mr-2" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button onClick={handlePago} disabled={facturasParaPago.length === 0 || totalAPagar <= 0}>Confirmar Pago</Button>
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
      const qCuentas = query(collection(db, 'cuentas_a_pagar'), orderBy("fecha_vencimiento", "asc"));
      const snapshotCuentas = await getDocs(qCuentas);
      
      const dataListCuentas = snapshotCuentas.docs.map(doc => ({ id: doc.id, ...doc.data() } as CuentaPagar));
      
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

      {Object.entries(cuentasAgrupadas).map(([proveedorId, facturas]) => {
        const facturasPendientes = facturas.filter(f => f.estado === 'Pendiente' || f.estado === 'Pagado Parcial');
        const totalDeuda = facturasPendientes.reduce((sum, f) => sum + f.saldo_pendiente, 0);

        return (
            <Card key={proveedorId} className="mb-6">
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle>{facturas[0].proveedor_nombre}</CardTitle>
                        <CardDescription>
                            {facturasPendientes.length > 0 
                                ? `${facturasPendientes.length} factura(s) con saldo. Deuda total: ${currencyFormatter.format(totalDeuda)}`
                                : `No hay facturas pendientes de pago.`
                            }
                        </CardDescription>
                    </div>
                    <RegistrarPagoDialog 
                        proveedorId={proveedorId} 
                        facturas={facturasPendientes}
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
                        <TableRow key={cuenta.id} className={cn(cuenta.estado === 'Pagado' && 'text-muted-foreground bg-muted/30')}>
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
      )})}

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
