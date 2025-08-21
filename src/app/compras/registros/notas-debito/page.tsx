
"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { collection, getDocs, addDoc, doc, serverTimestamp, query, where, orderBy, writeBatch, increment } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle, Calendar as CalendarIcon, Search } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter as DialogFooterComponent, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

// --- Types ---
type Compra = {
  id: string;
  proveedor_id: string;
  proveedor_nombre: string;
  proveedor_ruc: string;
  deposito_id: string;
  numero_factura: string;
  fecha_compra: string;
  items: any[];
  total: number;
};

type NotaDebito = {
    id: string;
    compra_id: string;
    proveedor_id: string;
    proveedor_nombre: string;
    proveedor_ruc: string;
    numero_factura_compra: string;
    numero_nota_debito: string;
    fecha_emision: string;
    total: number;
    gravada_10: number;
    iva_10: number;
    gravada_5: number;
    iva_5: number;
    exenta: number;
    motivo: string;
    usuario_id: string;
    fecha_creacion: any;
};

const currencyFormatter = new Intl.NumberFormat('es-PY', {
  style: 'currency',
  currency: 'PYG',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});


// --- Helper Components ---
const CompraSelectorDialog = ({ compras, onSelectCompra }: { compras: Compra[], onSelectCompra: (compraId: string) => void }) => {
    const [open, setOpen] = useState(false);
    const [selectedCompraPreview, setSelectedCompraPreview] = useState<Compra | null>(null);

    const handleSelectAndClose = () => {
        if (selectedCompraPreview) {
            onSelectCompra(selectedCompraPreview.id);
            setOpen(false);
            setSelectedCompraPreview(null);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline"><Search className="mr-2 h-4 w-4"/>Seleccionar Factura de Compra...</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Explorador de Compras Registradas</DialogTitle>
                    <DialogDescription>Selecciona una factura de compra para aplicarle una nota de débito.</DialogDescription>
                </DialogHeader>
                <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
                    <div className="flex flex-col gap-4 overflow-hidden">
                        <h3 className="text-lg font-medium">Listado de Compras</h3>
                        <ScrollArea className="flex-grow border rounded-md">
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Factura Nro.</TableHead>
                                        <TableHead>Proveedor</TableHead>
                                        <TableHead>Fecha</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {compras.map(c => (
                                        <TableRow key={c.id} onClick={() => setSelectedCompraPreview(c)} className="cursor-pointer hover:bg-muted/50">
                                            <TableCell>{c.numero_factura}</TableCell>
                                            <TableCell>{c.proveedor_nombre}</TableCell>
                                            <TableCell>{c.fecha_compra}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                    <Card className="flex-grow flex flex-col overflow-hidden">
                       {selectedCompraPreview ? (
                        <>
                         <CardHeader className="flex-shrink-0">
                            <CardTitle>{`Factura: ${selectedCompraPreview.numero_factura}`}</CardTitle>
                            <CardDescription>{`Proveedor: ${selectedCompraPreview.proveedor_nombre}`}</CardDescription>
                         </CardHeader>
                         <CardFooter className="p-6 border-t flex-shrink-0">
                            <div className="w-full flex justify-between items-center">
                                <span className="font-bold text-lg">Total Compra: {currencyFormatter.format(selectedCompraPreview.total)}</span>
                                <Button onClick={handleSelectAndClose}>Confirmar Selección</Button>
                            </div>
                         </CardFooter>
                         </>
                       ) : (
                         <div className="h-full flex items-center justify-center text-muted-foreground">
                             <p>Seleccione una compra para ver los detalles</p>
                         </div>
                       )}
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// --- Main Component ---
export default function NotasDebitoPage() {
    const { toast } = useToast();
    const [notas, setNotas] = useState<NotaDebito[]>([]);
    const [compras, setCompras] = useState<Compra[]>([]);
    const [loading, setLoading] = useState(true);

    const [openCreate, setOpenCreate] = useState(false);
    const [openDetails, setOpenDetails] = useState(false);
    const [selectedNota, setSelectedNota] = useState<NotaDebito | null>(null);

    // Form state
    const [selectedCompraId, setSelectedCompraId] = useState('');
    const [numeroNota, setNumeroNota] = useState('');
    const [fechaEmision, setFechaEmision] = useState<Date | undefined>(new Date());
    const [motivo, setMotivo] = useState('');
    const [gravada10, setGravada10] = useState(0);
    const [gravada5, setGravada5] = useState(0);
    const [exenta, setExenta] = useState(0);

    const selectedCompra = compras.find(c => c.id === selectedCompraId);

    const fetchData = async () => {
        setLoading(true);
        try {
            const notasSnapshot = await getDocs(query(collection(db, 'notas_debito_compras'), orderBy("fecha_creacion", "desc")));
            setNotas(notasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotaDebito)));

            const comprasSnapshot = await getDocs(query(collection(db, 'compras'), orderBy("fecha_creacion", "desc")));
            setCompras(comprasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Compra)));

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

    const iva10 = gravada10 / 11;
    const iva5 = gravada5 / 21;
    const totalNota = gravada10 + gravada5 + exenta;

    const resetForm = () => {
        setSelectedCompraId('');
        setNumeroNota('');
        setFechaEmision(new Date());
        setMotivo('');
        setGravada10(0);
        setGravada5(0);
        setExenta(0);
    }

    const handleCreateNota = async () => {
        const trimmedNota = numeroNota.trim();
        if (!selectedCompraId || !trimmedNota || !fechaEmision || !motivo || !selectedCompra || totalNota <= 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Complete todos los campos y asegúrese que el total sea mayor a cero.'});
            return;
        }

        // Check for duplicate debit note number for the same provider
        const q = query(
            collection(db, 'notas_debito_compras'),
            where("proveedor_id", "==", selectedCompra.proveedor_id),
            where("numero_nota_debito", "==", trimmedNota)
        );
        const duplicateCheck = await getDocs(q);
        if (!duplicateCheck.empty) {
            toast({ 
                variant: 'destructive', 
                title: 'Nota de Débito Duplicada', 
                description: `Ya existe una nota de débito con el número ${trimmedNota} para este proveedor.`
            });
            return;
        }


        try {
            const batch = writeBatch(db);

            // 1. Create Nota de Debito document
            const notaRef = doc(collection(db, "notas_debito_compras"));
            batch.set(notaRef, {
                compra_id: selectedCompraId,
                proveedor_id: selectedCompra.proveedor_id,
                proveedor_nombre: selectedCompra.proveedor_nombre,
                proveedor_ruc: selectedCompra.proveedor_ruc,
                numero_factura_compra: selectedCompra.numero_factura,
                numero_nota_debito: trimmedNota,
                fecha_emision: format(fechaEmision, "yyyy-MM-dd"),
                motivo,
                total: totalNota,
                gravada_10: gravada10,
                iva_10: iva10,
                gravada_5: gravada5,
                iva_5: iva5,
                exenta: exenta,
                usuario_id: 'user-demo',
                fecha_creacion: serverTimestamp()
            });

            // 2. Adjust Cuentas a Pagar
            const qCuentas = query(collection(db, 'cuentas_a_pagar'), where("compra_id", "==", selectedCompraId));
            const cuentaSnapshot = await getDocs(qCuentas);
            if(!cuentaSnapshot.empty) {
                const cuentaDoc = cuentaSnapshot.docs[0];
                batch.update(cuentaDoc.ref, {
                    monto_total: increment(totalNota),
                    saldo_pendiente: increment(totalNota)
                });
            }
            
            // 3. Create Libro IVA Compras entry for the debit note
            const libroIvaRef = doc(collection(db, 'libro_iva_compras'));
            batch.set(libroIvaRef, {
                compra_id: selectedCompraId, // Link to original purchase
                nota_debito_id: notaRef.id, // Link to the new debit note
                fecha_factura: format(fechaEmision, "yyyy-MM-dd"),
                proveedor_nombre: selectedCompra.proveedor_nombre,
                proveedor_ruc: selectedCompra.proveedor_ruc,
                numero_factura: trimmedNota, // The debit note number
                total_compra: totalNota,
                gravada_10: gravada10,
                iva_10: iva10,
                gravada_5: gravada5,
                iva_5: iva5,
                exenta: exenta,
            });

            await batch.commit();

            toast({ title: 'Nota de Débito Registrada', description: `La nota, la cuenta a pagar y el libro IVA han sido actualizados.`});
            setOpenCreate(false);
            await fetchData();
        } catch(e) {
            console.error("Error creating debit note:", e);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo registrar la nota de débito.'});
        }
    }

    useEffect(() => {
        if(!openCreate) resetForm();
    }, [openCreate]);

    const handleOpenDetails = (nota: NotaDebito) => {
        setSelectedNota(nota);
        setOpenDetails(true);
    }

    if(loading) return <p>Cargando datos...</p>;

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Notas de Débito de Compras</h1>
                <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                    <DialogTrigger asChild>
                        <Button><PlusCircle className="mr-2 h-4 w-4"/>Registrar Nota de Débito</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Registrar Nueva Nota de Débito</DialogTitle>
                            <DialogDescription>Ajusta una compra por cargos adicionales o correcciones de precio del proveedor.</DialogDescription>
                        </DialogHeader>
                        <div className="flex-grow grid gap-4 py-4 overflow-y-auto pr-2 -mr-2">
                             <div className="space-y-2">
                                <Label htmlFor="compra">Factura de Compra Afectada</Label>
                                {selectedCompra ? (
                                     <div className="flex items-center gap-2">
                                        <Input value={`Factura: ${selectedCompra.numero_factura} - ${selectedCompra.proveedor_nombre}`} readOnly/>
                                        <Button variant="secondary" onClick={() => setSelectedCompraId('')}>Cambiar</Button>
                                     </div>
                                ) : (
                                    <CompraSelectorDialog compras={compras} onSelectCompra={setSelectedCompraId} />
                                )}
                            </div>

                            {selectedCompra && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="nota-num">Número de Nota de Débito</Label>
                                            <Input id="nota-num" value={numeroNota} onChange={e => setNumeroNota(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="nota-fecha">Fecha de Emisión</Label>
                                             <Popover>
                                                <PopoverTrigger asChild>
                                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !fechaEmision && "text-muted-foreground")}>
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {fechaEmision ? format(fechaEmision, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                                                </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={fechaEmision} onSelect={setFechaEmision} initialFocus locale={es}/></PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="motivo">Motivo del ajuste</Label>
                                        <Textarea id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: Ajuste de precio, Cargo por flete omitido"/>
                                    </div>

                                    <Card>
                                        <CardHeader><CardTitle>Desglose de Montos (IVA Incluido)</CardTitle></CardHeader>
                                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="gravada10">Gravada 10%</Label>
                                                <Input id="gravada10" type="number" value={gravada10} onChange={e => setGravada10(Number(e.target.value))} />
                                                <p className="text-xs text-muted-foreground">IVA: {currencyFormatter.format(iva10)}</p>
                                            </div>
                                             <div className="space-y-2">
                                                <Label htmlFor="gravada5">Gravada 5%</Label>
                                                <Input id="gravada5" type="number" value={gravada5} onChange={e => setGravada5(Number(e.target.value))} />
                                                <p className="text-xs text-muted-foreground">IVA: {currencyFormatter.format(iva5)}</p>
                                            </div>
                                             <div className="space-y-2">
                                                <Label htmlFor="exenta">Exenta</Label>
                                                <Input id="exenta" type="number" value={exenta} onChange={e => setExenta(Number(e.target.value))} />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </>
                            )}
                        </div>
                        <DialogFooterComponent className="border-t pt-4">
                             <div className="flex w-full justify-between items-center">
                                <div className="text-lg font-bold">Total Nota de Débito: {currencyFormatter.format(totalNota)}</div>
                                <div>
                                    <Button variant="outline" onClick={() => setOpenCreate(false)} className="mr-2">Cancelar</Button>
                                    <Button onClick={handleCreateNota} disabled={!selectedCompraId || !numeroNota || !fechaEmision || totalNota <= 0}>Confirmar Registro</Button>
                                </div>
                            </div>
                        </DialogFooterComponent>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Historial de Notas de Débito</CardTitle>
                    <CardDescription>Ajustes que incrementan la deuda con proveedores.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nro. Nota</TableHead>
                                <TableHead>Factura Afectada</TableHead>
                                <TableHead>Proveedor</TableHead>
                                <TableHead>Fecha Emisión</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {notas.map((nota) => (
                                <TableRow key={nota.id}>
                                    <TableCell className="font-medium">{nota.numero_nota_debito}</TableCell>
                                    <TableCell>{nota.numero_factura_compra}</TableCell>
                                    <TableCell>{nota.proveedor_nombre}</TableCell>
                                    <TableCell>{nota.fecha_emision}</TableCell>
                                    <TableCell className="text-right">{currencyFormatter.format(nota.total)}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Abrir menú</span><MoreHorizontal className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleOpenDetails(nota)}>Ver Detalles</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {notas.length === 0 && <p className="text-center text-muted-foreground mt-4">No hay notas de débito registradas.</p>}
                </CardContent>
            </Card>

            <Dialog open={openDetails} onOpenChange={setOpenDetails}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Detalles de la Nota de Débito: {selectedNota?.numero_nota_debito}</DialogTitle>
                    </DialogHeader>
                    {selectedNota && (
                        <div className="flex-grow overflow-y-auto pr-6 -mr-6">
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><p className="font-semibold">Proveedor:</p><p>{selectedNota.proveedor_nombre}</p></div>
                                    <div><p className="font-semibold">Factura de Compra:</p><p>{selectedNota.numero_factura_compra}</p></div>
                                    <div><p className="font-semibold">Fecha de Emisión:</p><p>{selectedNota.fecha_emision}</p></div>
                                    <div><p className="font-semibold">RUC Proveedor:</p><p>{selectedNota.proveedor_ruc}</p></div>
                                </div>
                                <div className="space-y-1">
                                    <p className="font-semibold">Motivo:</p>
                                    <p className="text-muted-foreground">{selectedNota.motivo}</p>
                                </div>
                                <Card>
                                    <CardHeader><CardTitle>Resumen Financiero</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            <div className="flex justify-between"><span>Gravada 10% (IVA Incl.):</span><span>{currencyFormatter.format(selectedNota.gravada_10)}</span></div>
                                            <div className="flex justify-between text-sm text-muted-foreground"><span>IVA (10%):</span><span>{currencyFormatter.format(selectedNota.iva_10)}</span></div>
                                            <div className="flex justify-between"><span>Gravada 5% (IVA Incl.):</span><span>{currencyFormatter.format(selectedNota.gravada_5)}</span></div>
                                            <div className="flex justify-between text-sm text-muted-foreground"><span>IVA (5%):</span><span>{currencyFormatter.format(selectedNota.iva_5)}</span></div>
                                            <div className="flex justify-between"><span>Exenta:</span><span>{currencyFormatter.format(selectedNota.exenta)}</span></div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="font-bold text-lg flex justify-between">
                                        <span>Total Nota de Débito:</span>
                                        <span>{currencyFormatter.format(selectedNota.total)}</span>
                                    </CardFooter>
                                </Card>
                            </div>
                        </div>
                    )}
                    <DialogFooterComponent className="border-t pt-4">
                        <Button variant="outline" onClick={() => setOpenDetails(false)}>Cerrar</Button>
                    </DialogFooterComponent>
                </DialogContent>
            </Dialog>
        </>
    );

    
