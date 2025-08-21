
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

// --- Types ---

type ItemCompra = {
  producto_id: string;
  nombre: string;
  cantidad_recibida: number;
  precio_unitario: number;
  iva_tipo: number;
};

type Compra = {
  id: string;
  proveedor_id: string;
  proveedor_nombre: string;
  deposito_id: string;
  numero_factura: string;
  fecha_compra: string;
  items: ItemCompra[];
  total: number;
};

type ItemNotaCredito = {
  producto_id: string;
  nombre: string;
  cantidad_ajustada: number;
  precio_unitario: number;
  iva_tipo: number;
  cantidad_pendiente: number;
};

type NotaCreditoDebito = {
    id: string;
    compra_id: string;
    proveedor_id: string;
    proveedor_nombre: string;
    numero_factura_compra: string;
    numero_nota_credito: string;
    fecha_emision: string;
    total: number;
    motivo: string;
    items: ItemNotaCredito[];
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
                    <DialogDescription>Selecciona una factura de compra para aplicarle una nota de crédito.</DialogDescription>
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
                         <CardContent className="flex-grow overflow-y-auto">
                            <h4 className="font-semibold mb-2">Items de la Compra</h4>
                            <Table>
                                <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Cant.</TableHead><TableHead className="text-right">P. Unit.</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {selectedCompraPreview.items.map(item => (
                                        <TableRow key={item.producto_id}>
                                            <TableCell>{item.nombre}</TableCell>
                                            <TableCell>{item.cantidad_recibida}</TableCell>
                                            <TableCell className="text-right">{currencyFormatter.format(item.precio_unitario)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                         </CardContent>
                         <CardFooter className="p-6 border-t flex-shrink-0">
                            <div className="w-full flex justify-between items-center">
                                <span className="font-bold text-lg">Total: {currencyFormatter.format(selectedCompraPreview.total)}</span>
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

export default function NotasCreditoDebitoPage() {
  const { toast } = useToast();
  const [notas, setNotas] = useState<NotaCreditoDebito[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);

  const [openCreate, setOpenCreate] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedNota, setSelectedNota] = useState<NotaCreditoDebito | null>(null);
  
  // Form state
  const [selectedCompraId, setSelectedCompraId] = useState('');
  const [numeroNota, setNumeroNota] = useState('');
  const [fechaEmision, setFechaEmision] = useState<Date | undefined>(new Date());
  const [motivo, setMotivo] = useState('');
  const [items, setItems] = useState<ItemNotaCredito[]>([]);
  
  const selectedCompra = compras.find(c => c.id === selectedCompraId);

  const fetchData = async () => {
    setLoading(true);
    try {
      const notasSnapshot = await getDocs(query(collection(db, 'notas_credito_debito_compras'), orderBy("fecha_creacion", "desc")));
      setNotas(notasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotaCreditoDebito)));

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
  
  useEffect(() => {
    const calculatePendingItems = async () => {
        if (selectedCompra) {
            const q = query(collection(db, 'notas_credito_debito_compras'), where("compra_id", "==", selectedCompra.id));
            const prevNotasSnap = await getDocs(q);

            const returnedQuantities = new Map<string, number>();
            prevNotasSnap.forEach(doc => {
                const notaData = doc.data() as NotaCreditoDebito;
                notaData.items.forEach(item => {
                    returnedQuantities.set(item.producto_id, (returnedQuantities.get(item.producto_id) || 0) + item.cantidad_ajustada);
                });
            });

            const itemsWithPending = selectedCompra.items.map(item => {
                const totalReturned = returnedQuantities.get(item.producto_id) || 0;
                const pending = item.cantidad_recibida - totalReturned;
                return {
                    producto_id: item.producto_id,
                    nombre: item.nombre,
                    cantidad_ajustada: 0,
                    precio_unitario: item.precio_unitario,
                    iva_tipo: item.iva_tipo,
                    cantidad_pendiente: pending,
                };
            });
            setItems(itemsWithPending);
        } else {
            setItems([]);
        }
    };
    calculatePendingItems();
  }, [selectedCompraId, selectedCompra]);


  const handleItemChange = (index: number, value: string) => {
    const newItems = [...items];
    const itemToChange = newItems[index];
    const cantidadPendiente = itemToChange.cantidad_pendiente;
    
    let cantidadAjustada = Number(value);
    
    if (isNaN(cantidadAjustada) || cantidadAjustada < 0) cantidadAjustada = 0;
    if (cantidadAjustada > cantidadPendiente) {
        toast({ variant: 'destructive', title: 'Cantidad inválida', description: `No puede devolver más de lo pendiente (${cantidadPendiente}).`})
        cantidadAjustada = cantidadPendiente;
    }

    newItems[index].cantidad_ajustada = cantidadAjustada;
    setItems(newItems);
  }

  const calcularTotalNota = () => {
    return items.reduce((sum, item) => sum + (item.cantidad_ajustada * item.precio_unitario), 0);
  };
  
  const totalAjustado = items.reduce((sum, item) => sum + item.cantidad_ajustada, 0);
  const totalNota = calcularTotalNota();

  const resetForm = () => {
    setSelectedCompraId('');
    setNumeroNota('');
    setFechaEmision(new Date());
    setMotivo('');
    setItems([]);
  }

  const handleCreateNota = async () => {
    const trimmedNota = numeroNota.trim();
    if (!selectedCompraId || !trimmedNota || !fechaEmision || !motivo || !selectedCompra) {
        toast({ variant: 'destructive', title: 'Error', description: 'Complete todos los campos requeridos.'});
        return;
    }

    if (totalAjustado === 0) {
        toast({ variant: 'destructive', title: 'Error', description: 'Debe ajustar la cantidad de al menos un producto.'});
        return;
    }

    // Check for duplicate credit note number from the same provider
    const q = query(
        collection(db, 'notas_credito_debito_compras'), 
        where("proveedor_id", "==", selectedCompra.proveedor_id), 
        where("numero_nota_credito", "==", trimmedNota)
    );
    const duplicateCheck = await getDocs(q);
    if (!duplicateCheck.empty) {
        toast({ 
            variant: 'destructive', 
            title: 'Nota de Crédito Duplicada', 
            description: `Ya existe una nota de crédito con el número ${trimmedNota} para este proveedor.`
        });
        return;
    }


    try {
        const batch = writeBatch(db);

        // 1. Create Nota de Credito document
        const notaRef = doc(collection(db, "notas_credito_debito_compras"));
        batch.set(notaRef, {
            compra_id: selectedCompraId,
            proveedor_id: selectedCompra.proveedor_id,
            proveedor_nombre: selectedCompra.proveedor_nombre,
            numero_factura_compra: selectedCompra.numero_factura,
            numero_nota_credito: trimmedNota,
            fecha_emision: format(fechaEmision, "yyyy-MM-dd"),
            motivo,
            total: totalNota,
            items: items.filter(i => i.cantidad_ajustada > 0).map(i => ({
                producto_id: i.producto_id,
                nombre: i.nombre,
                cantidad_ajustada: i.cantidad_ajustada,
                precio_unitario: i.precio_unitario,
                iva_tipo: i.iva_tipo
            })),
            usuario_id: 'user-demo',
            fecha_creacion: serverTimestamp()
        });

        // 2. Adjust Cuentas a Pagar
        const qCuentas = query(collection(db, 'cuentas_a_pagar'), where("compra_id", "==", selectedCompraId));
        const cuentaSnapshot = await getDocs(qCuentas);
        if(!cuentaSnapshot.empty) {
            const cuentaDoc = cuentaSnapshot.docs[0];
            batch.update(cuentaDoc.ref, {
                saldo_pendiente: increment(-totalNota)
            });
        }

        // 3. Adjust Stock
        const itemsAjustados = items.filter(i => i.cantidad_ajustada > 0);
        for (const item of itemsAjustados) {
            const qStock = query(
                collection(db, 'stock'),
                where('producto_id', '==', item.producto_id),
                where('deposito_id', '==', selectedCompra.deposito_id)
            );
            const stockSnapshot = await getDocs(qStock);
            if (!stockSnapshot.empty) {
                const stockDoc = stockSnapshot.docs[0];
                batch.update(stockDoc.ref, { 
                    cantidad: increment(-item.cantidad_ajustada),
                    fecha_actualizacion: serverTimestamp()
                });
            }
        }
        
        await batch.commit();

        toast({ title: 'Nota de Crédito Registrada', description: `La nota, el stock y la cuenta a pagar han sido actualizados.`});
        setOpenCreate(false);
        await fetchData();
    } catch(e) {
        console.error("Error creating credit note:", e);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo registrar la nota de crédito.'});
    }
  }

  useEffect(() => {
    if(!openCreate) resetForm();
  }, [openCreate]);


  const handleOpenDetails = (nota: NotaCreditoDebito) => {
    setSelectedNota(nota);
    setOpenDetails(true);
  }

  if(loading) return <p>Cargando datos...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notas de Crédito de Compras</h1>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4"/>Registrar Nota de Crédito</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Registrar Nueva Nota de Crédito por Devolución o Ajuste</DialogTitle>
                    <DialogDescription>Este proceso ajustará la cuenta a pagar y el stock de los productos devueltos a un proveedor.</DialogDescription>
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
                                    <Label htmlFor="nota-num">Número de Nota de Crédito</Label>
                                    <Input id="nota-num" value={numeroNota} onChange={e => setNumeroNota(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="nota-fecha">Fecha de Emisión</Label>
                                     <Popover>
                                        <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("w-full justify-start text-left font-normal", !fechaEmision && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {fechaEmision ? format(fechaEmision, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={fechaEmision}
                                            onSelect={setFechaEmision}
                                            initialFocus
                                            locale={es}
                                        />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="motivo">Motivo del ajuste</Label>
                                <Textarea id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: Devolución de productos por falla"/>
                            </div>

                            <Card className="col-span-4">
                                <CardHeader><CardTitle>Productos a Devolver/Ajustar</CardTitle></CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[300px]">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Producto</TableHead>
                                                <TableHead className="w-[120px]">Cant. Comprada</TableHead>
                                                <TableHead className="w-[120px]">Cant. Pendiente</TableHead>
                                                <TableHead className="w-[120px]">Cant. a Devolver</TableHead>
                                                <TableHead className="w-[120px]">P. Unit.</TableHead>
                                                <TableHead className="text-right w-[150px]">Subtotal Ajuste</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{item.nombre}</TableCell>
                                                    <TableCell>{selectedCompra.items.find(i => i.producto_id === item.producto_id)?.cantidad_recibida || 0}</TableCell>
                                                    <TableCell>{item.cantidad_pendiente}</TableCell>
                                                    <TableCell><Input type="number" value={item.cantidad_ajustada} onChange={e => handleItemChange(index, e.target.value)} min="0" disabled={item.cantidad_pendiente === 0} /></TableCell>
                                                    <TableCell>{currencyFormatter.format(item.precio_unitario)}</TableCell>
                                                    <TableCell className="text-right">{currencyFormatter.format(item.cantidad_ajustada * item.precio_unitario)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </>
                    )}
                 </div>
                <DialogFooterComponent className="border-t pt-4">
                     <div className="flex w-full justify-between items-center">
                        <div className="text-lg font-bold">Total Nota de Crédito: {currencyFormatter.format(totalNota)}</div>
                        <div>
                            <Button variant="outline" onClick={() => setOpenCreate(false)} className="mr-2">Cancelar</Button>
                            <Button onClick={handleCreateNota} disabled={!selectedCompraId || !numeroNota || !fechaEmision || totalAjustado === 0}>Confirmar Registro</Button>
                        </div>
                    </div>
                </DialogFooterComponent>
            </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Notas de Crédito</CardTitle>
          <CardDescription>Ajustes por devolución realizados a las facturas de compra.</CardDescription>
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
                  <TableCell className="font-medium">{nota.numero_nota_credito}</TableCell>
                  <TableCell>{nota.numero_factura_compra}</TableCell>
                  <TableCell>{nota.proveedor_nombre}</TableCell>
                  <TableCell>{nota.fecha_emision}</TableCell>
                  <TableCell className="text-right">{currencyFormatter.format(nota.total)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
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
           {notas.length === 0 && <p className="text-center text-muted-foreground mt-4">No hay notas de crédito registradas.</p>}
        </CardContent>
      </Card>
      
      <Dialog open={openDetails} onOpenChange={setOpenDetails}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Detalles de la Nota de Crédito: {selectedNota?.numero_nota_credito}</DialogTitle>
            <DialogDescription>
              Información detallada de la nota de crédito y su impacto.
            </DialogDescription>
          </DialogHeader>
          {selectedNota && (
            <div className="flex-grow overflow-y-auto pr-6 -mr-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div><p className="font-semibold">Proveedor:</p><p>{selectedNota.proveedor_nombre}</p></div>
                  <div><p className="font-semibold">Factura de Compra:</p><p>{selectedNota.numero_factura_compra}</p></div>
                  <div><p className="font-semibold">Fecha de Emisión:</p><p>{selectedNota.fecha_emision}</p></div>
                  <div><p className="font-semibold">Registrado por:</p><p>{selectedNota.usuario_id}</p></div>
                </div>
                 <div className="space-y-1 mb-4">
                    <p className="font-semibold">Motivo:</p>
                    <p className="text-muted-foreground">{selectedNota.motivo}</p>
                </div>
                 <Card>
                    <CardHeader><CardTitle>Productos Ajustados</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Cant. Ajustada</TableHead>
                                    <TableHead className="text-right">P. Unit.</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedNota.items.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{item.nombre}</TableCell>
                                        <TableCell>{item.cantidad_ajustada}</TableCell>
                                        <TableCell className="text-right">{currencyFormatter.format(item.precio_unitario)}</TableCell>
                                        <TableCell className="text-right">{currencyFormatter.format(item.cantidad_ajustada * item.precio_unitario)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
          )}
          <DialogFooterComponent className="border-t pt-4">
             <div className="flex justify-between items-center w-full">
                <div className="text-right font-bold text-lg">
                  Total de la Nota: {currencyFormatter.format(selectedNota?.total || 0)}
                </div>
                <Button variant="outline" onClick={() => setOpenDetails(false)}>Cerrar</Button>
            </div>
          </DialogFooterComponent>
        </DialogContent>
      </Dialog>
    </>
  );
}

    