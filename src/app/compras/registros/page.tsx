
"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { collection, getDocs, addDoc, doc, updateDoc, serverTimestamp, query, where, orderBy, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, PlusCircle, Calendar as CalendarIcon, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter as DialogFooterComponent, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// --- Types ---

type ItemOrden = {
  producto_id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
};

type ItemCompra = {
  producto_id: string;
  nombre: string;
  cantidad_ordenada: number;
  cantidad_recibida: number;
  precio_unitario: number;
  iva_tipo: number;
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
  items: ItemCompra[];
  usuario_id: string;
  fecha_creacion: any;
};

type OrdenCompra = {
  id: string;
  proveedor_id: string;
  proveedor_nombre: string;
  proveedor_ruc: string; 
  deposito_id: string;
  deposito_nombre: string;
  estado: "Pendiente de Recepción" | "Recibido Parcial" | "Recibido Completo" | "Cancelada";
  total: number;
  items: ItemOrden[];
};

type Producto = {
  id: string;
  nombre: string;
  iva_tipo: number;
};


// --- Helper Components ---

const OrdenSelectorDialog = ({ ordenes, onSelectOrden }: { ordenes: OrdenCompra[], onSelectOrden: (ordenId: string) => void }) => {
    const [open, setOpen] = useState(false);
    const [selectedOrdenPreview, setSelectedOrdenPreview] = useState<OrdenCompra | null>(null);

    const handleSelectAndClose = () => {
        if (selectedOrdenPreview) {
            onSelectOrden(selectedOrdenPreview.id);
            setOpen(false);
            setSelectedOrdenPreview(null);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline"><Search className="mr-2 h-4 w-4"/>Seleccionar Orden de Compra...</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Explorador de Órdenes de Compra</DialogTitle>
                    <DialogDescription>Selecciona una OC pendiente o parcial para registrar la recepción de mercadería.</DialogDescription>
                </DialogHeader>
                <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
                    <div className="flex flex-col gap-4 overflow-hidden">
                        <h3 className="text-lg font-medium">Listado de Órdenes</h3>
                        <ScrollArea className="flex-grow border rounded-md">
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Proveedor</TableHead>
                                        <TableHead>Estado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ordenes.map(oc => (
                                        <TableRow key={oc.id} onClick={() => setSelectedOrdenPreview(oc)} className="cursor-pointer hover:bg-muted/50">
                                            <TableCell>{oc.id.substring(0, 7)}</TableCell>
                                            <TableCell>{oc.proveedor_nombre}</TableCell>
                                            <TableCell><Badge variant={oc.estado === 'Recibido Parcial' ? 'outline' : 'secondary'}>{oc.estado}</Badge></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                    <Card className="flex-grow flex flex-col overflow-hidden">
                       {selectedOrdenPreview ? (
                        <>
                         <CardHeader className="flex-shrink-0">
                            <CardTitle>{`Orden: ${selectedOrdenPreview.id.substring(0,7)}`}</CardTitle>
                            <CardDescription>{`Proveedor: ${selectedOrdenPreview.proveedor_nombre}`}</CardDescription>
                         </CardHeader>
                         <CardContent className="flex-grow overflow-y-auto">
                            <div className="space-y-4">
                                <div><strong>Depósito:</strong> {selectedOrdenPreview.deposito_nombre}</div>
                                <Separator />
                                <h4 className="font-semibold">Items de la Orden</h4>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Cant.</TableHead><TableHead className="text-right">P. Unit.</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {selectedOrdenPreview.items.map(item => (
                                            <TableRow key={item.producto_id}>
                                                <TableCell>{item.nombre}</TableCell>
                                                <TableCell>{item.cantidad}</TableCell>
                                                <TableCell className="text-right">${item.precio_unitario.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                         </CardContent>
                         <CardFooter className="p-6 border-t flex-shrink-0">
                            <div className="w-full flex justify-between items-center">
                                <span className="font-bold text-lg">Total: ${selectedOrdenPreview.total.toFixed(2)}</span>
                                <Button onClick={handleSelectAndClose}>Confirmar Selección</Button>
                            </div>
                         </CardFooter>
                         </>
                       ) : (
                         <div className="h-full flex items-center justify-center text-muted-foreground">
                             <p>Seleccione una orden para ver los detalles</p>
                         </div>
                       )}
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// --- Main Component ---

export default function ComprasPage() {
  const { toast } = useToast();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  const [openCreate, setOpenCreate] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState<Compra | null>(null);

  // Form state
  const [selectedOCId, setSelectedOCId] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [fechaFactura, setFechaFactura] = useState<Date | undefined>(new Date());
  const [items, setItems] = useState<ItemCompra[]>([]);
  
  const selectedOC = ordenes.find(oc => oc.id === selectedOCId);

  const fetchData = async () => {
    setLoading(true);
    try {
      const comprasSnapshot = await getDocs(query(collection(db, 'compras'), orderBy("fecha_creacion", "desc")));
      setCompras(comprasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Compra)));

      const qOrdenes = query(collection(db, 'ordenes_compra'), where("estado", "in", ["Pendiente de Recepción", "Recibido Parcial"]));
      const ordenesSnapshot = await getDocs(qOrdenes);
      setOrdenes(ordenesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrdenCompra)));

      const productosSnapshot = await getDocs(collection(db, 'productos'));
      setProductos(productosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Producto)));

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
    if (selectedOC) {
      const productosMap = new Map(productos.map(p => [p.id, p]));
      setItems(selectedOC.items.map(item => ({
        ...item,
        cantidad_ordenada: item.cantidad,
        cantidad_recibida: item.cantidad,
        iva_tipo: productosMap.get(item.producto_id)?.iva_tipo ?? 0,
        nombre: productosMap.get(item.producto_id)?.nombre ?? 'Producto no encontrado',
      })));
    } else {
      setItems([]);
    }
  }, [selectedOCId, selectedOC, productos]);
  
  const handleItemChange = (index: number, value: string) => {
    const newItems = [...items];
    const originalQty = newItems[index].cantidad_ordenada;
    let receivedQty = Number(value);
    
    if (isNaN(receivedQty) || receivedQty < 0) receivedQty = 0;
    if (receivedQty > originalQty) {
        toast({ variant: 'destructive', title: 'Cantidad inválida', description: `No puede recibir más de lo solicitado (${originalQty}).`})
        receivedQty = originalQty;
    }

    newItems[index].cantidad_recibida = receivedQty;
    setItems(newItems);
  }

  const calcularTotales = () => {
    let totalFactura = 0;
    let totalIva10 = 0;
    let totalIva5 = 0;
  
    items.forEach(item => {
      const subtotal = item.cantidad_recibida * item.precio_unitario;
      totalFactura += subtotal;
      if (item.iva_tipo === 10) {
        totalIva10 += subtotal - (subtotal / 1.1);
      } else if (item.iva_tipo === 5) {
        totalIva5 += subtotal - (subtotal / 1.05);
      }
    });
  
    return {
      totalFactura,
      totalIva10,
      totalIva5,
      totalIva: totalIva10 + totalIva5,
    };
  };

  const totales = calcularTotales();


  const resetForm = () => {
    setSelectedOCId('');
    setNumeroFactura('');
    setFechaFactura(new Date());
    setItems([]);
  }

  const handleCreateCompra = async () => {
    if (!selectedOCId || !numeroFactura || !fechaFactura || !selectedOC) {
        toast({ variant: 'destructive', title: 'Error', description: 'Complete todos los campos.'});
        return;
    }

    const totalRecibido = items.reduce((sum, item) => sum + item.cantidad_recibida, 0);
    if (totalRecibido === 0) {
        toast({ variant: 'destructive', title: 'Error', description: 'Debe recibir al menos un producto.'});
        return;
    }
    
    let gravada10 = 0;
    let gravada5 = 0;
    let exenta = 0;

    items.forEach(item => {
        const subtotal = item.cantidad_recibida * item.precio_unitario;
        if (item.iva_tipo === 10) {
            gravada10 += subtotal / 1.1;
        } else if (item.iva_tipo === 5) {
            gravada5 += subtotal / 1.05;
        } else {
            exenta += subtotal;
        }
    });

    try {
        const batch = writeBatch(db);

        // 1. Create Compra document
        const compraRef = doc(collection(db, "compras"));
        batch.set(compraRef, {
            orden_compra_id: selectedOCId,
            proveedor_id: selectedOC.proveedor_id,
            proveedor_nombre: selectedOC.proveedor_nombre,
            proveedor_ruc: selectedOC.proveedor_ruc,
            deposito_id: selectedOC.deposito_id,
            deposito_nombre: selectedOC.deposito_nombre,
            fecha_compra: format(fechaFactura, "yyyy-MM-dd"),
            numero_factura: numeroFactura,
            total: totales.totalFactura,
            total_iva_10: totales.totalIva10,
            total_iva_5: totales.totalIva5,
            items: items.filter(i => i.cantidad_recibida > 0).map(i => ({
                producto_id: i.producto_id,
                nombre: i.nombre,
                cantidad_recibida: i.cantidad_recibida,
                precio_unitario: i.precio_unitario,
                iva_tipo: i.iva_tipo
            })),
            usuario_id: 'user-demo',
            fecha_creacion: serverTimestamp()
        });

        // 2. Create Libro IVA Compras entry
        const libroIvaRef = doc(collection(db, 'libro_iva_compras'));
        batch.set(libroIvaRef, {
            compra_id: compraRef.id,
            fecha_factura: format(fechaFactura, "yyyy-MM-dd"),
            proveedor_nombre: selectedOC.proveedor_nombre,
            proveedor_ruc: selectedOC.proveedor_ruc,
            numero_factura: numeroFactura,
            total_compra: totales.totalFactura,
            gravada_10: gravada10,
            iva_10: totales.totalIva10,
            gravada_5: gravada5,
            iva_5: totales.totalIva5,
            exenta: exenta,
        });
        
        // 3. Create Cuentas a Pagar entry
        const cuentaPagarRef = doc(collection(db, 'cuentas_a_pagar'));
        batch.set(cuentaPagarRef, {
           compra_id: compraRef.id,
           proveedor_id: selectedOC.proveedor_id,
           proveedor_nombre: selectedOC.proveedor_nombre,
           numero_factura: numeroFactura,
           fecha_emision: format(fechaFactura, "yyyy-MM-dd"),
           // Vencimiento a 30 días por defecto
           fecha_vencimiento: format(new Date(new Date(fechaFactura).setDate(fechaFactura.getDate() + 30)), "yyyy-MM-dd"),
           monto_total: totales.totalFactura,
           saldo_pendiente: totales.totalFactura,
           estado: 'Pendiente',
        });

        // 4. Update OC status
        const totalOrdenado = selectedOC.items.reduce((sum, item) => sum + item.cantidad, 0);
        // This needs to fetch previous receptions to be accurate, simplified for now
        const nuevoEstado = totalRecibido < totalOrdenado ? 'Recibido Parcial' : 'Recibido Completo';
        const ordenRef = doc(db, 'ordenes_compra', selectedOCId);
        batch.update(ordenRef, { estado: nuevoEstado });

        // TODO: 5. Update stock and product cost average

        await batch.commit();

        toast({ title: 'Compra Registrada', description: `La compra y los asientos relacionados han sido generados.`});
        setOpenCreate(false);
        await fetchData();
    } catch(e) {
        console.error("Error creating compra:", e);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo registrar la compra.'});
    }
  }

  useEffect(() => {
    if(!openCreate) resetForm();
  }, [openCreate]);


  const handleOpenDetails = (compra: Compra) => {
    setSelectedCompra(compra);
    setOpenDetails(true);
  }

  if(loading) return <p>Cargando compras...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Registro de Compras</h1>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4"/>Registrar Compra</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Registrar Nueva Compra en base a una OC</DialogTitle>
                </DialogHeader>
                <div className="flex-grow grid gap-4 py-4 overflow-y-auto pr-2 -mr-2">
                    <div className="space-y-2">
                        <Label htmlFor="oc">Orden de Compra</Label>
                        {selectedOC ? (
                             <div className="flex items-center gap-2">
                                <Input value={`OC ID: ${selectedOC.id.substring(0,7)} - ${selectedOC.proveedor_nombre}`} readOnly/>
                                <Button variant="secondary" onClick={() => setSelectedOCId('')}>Cambiar</Button>
                             </div>
                        ) : (
                            <OrdenSelectorDialog ordenes={ordenes} onSelectOrden={setSelectedOCId} />
                        )}
                    </div>

                    {selectedOC && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="factura-num">Número de Factura</Label>
                                    <Input id="factura-num" value={numeroFactura} onChange={e => setNumeroFactura(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="factura-fecha">Fecha de Factura</Label>
                                     <Popover>
                                        <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("w-full justify-start text-left font-normal", !fechaFactura && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {fechaFactura ? format(fechaFactura, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={fechaFactura}
                                            onSelect={setFechaFactura}
                                            initialFocus
                                            locale={es}
                                        />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <Card className="col-span-4">
                                <CardHeader><CardTitle>Productos a Recibir</CardTitle></CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[350px]">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Producto</TableHead>
                                                <TableHead className="w-[120px]">Cant. Pedida</TableHead>
                                                <TableHead className="w-[120px]">Cant. Recibida</TableHead>
                                                <TableHead className="w-[120px]">P. Unit.</TableHead>
                                                <TableHead className="w-[80px]">IVA %</TableHead>
                                                <TableHead className="text-right w-[150px]">Subtotal</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{item.nombre}</TableCell>
                                                    <TableCell>{item.cantidad_ordenada}</TableCell>
                                                    <TableCell><Input type="number" value={item.cantidad_recibida} onChange={e => handleItemChange(index, e.target.value)} min="0"/></TableCell>
                                                    <TableCell>${item.precio_unitario.toFixed(2)}</TableCell>
                                                    <TableCell>{item.iva_tipo}%</TableCell>
                                                    <TableCell className="text-right">${(item.cantidad_recibida * item.precio_unitario).toFixed(2)}</TableCell>
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
                        <div className="flex gap-4 text-right">
                           <div className="text-sm"><span className="font-semibold">IVA 5%:</span> ${totales.totalIva5.toFixed(2)}</div>
                           <div className="text-sm"><span className="font-semibold">IVA 10%:</span> ${totales.totalIva10.toFixed(2)}</div>
                           <div className="text-lg font-bold">Total Factura: ${totales.totalFactura.toFixed(2)}</div>
                        </div>
                        <div>
                            <Button variant="outline" onClick={() => setOpenCreate(false)} className="mr-2">Cancelar</Button>
                            <Button onClick={handleCreateCompra} disabled={!selectedOCId || !numeroFactura || !fechaFactura}>Confirmar Recepción</Button>
                        </div>
                    </div>
                </DialogFooterComponent>
            </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Compras</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Compra</TableHead>
                <TableHead>Nro. Factura</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Fecha Factura</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compras.map((compra) => (
                <TableRow key={compra.id}>
                  <TableCell className="font-medium">{compra.id.substring(0,7)}</TableCell>
                  <TableCell>{compra.numero_factura}</TableCell>
                  <TableCell>{compra.proveedor_nombre}</TableCell>
                   <TableCell>{compra.fecha_compra}</TableCell>
                  <TableCell className="text-right">
                    ${compra.total.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDetails(compra)}>Ver Detalles</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           {compras.length === 0 && <p className="text-center text-muted-foreground mt-4">No hay compras registradas.</p>}
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
