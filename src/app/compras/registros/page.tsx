"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, PlusCircle, Calendar as CalendarIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Combobox } from "@/components/ui/command";


type Item = {
  productoId: string;
  nombre: string;
  cantidad: number;
  precio: number;
  cantidadRecibida: number;
};

type Compra = {
  id: string;
  ordenCompraId: string;
  proveedor: string;
  fechaFactura: string;
  numeroFactura: string;
  total: number;
  items: Item[];
  usuario: string;
  fechaCreacion: string;
};

type OrdenCompra = {
  id: string;
  proveedor: string;
  proveedorId: string;
  fechaOrden: string;
  estado: "Pendiente de Recepción" | "Recibido Parcial" | "Recibido Completo" | "Cancelada";
  total: number;
  items: (Omit<Item, 'cantidadRecibida'>)[];
};


const initialCompras: Compra[] = [];

export default function ComprasPage() {
  const { toast } = useToast();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);

  const [openCreate, setOpenCreate] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState<Compra | null>(null);

  // Form state
  const [selectedOCId, setSelectedOCId] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [fechaFactura, setFechaFactura] = useState<Date | undefined>(new Date());
  const [items, setItems] = useState<Item[]>([]);
  
  const ordenesPendientes = ordenes.filter(oc => oc.estado === 'Pendiente de Recepción' || oc.estado === 'Recibido Parcial');
  const selectedOC = ordenes.find(oc => oc.id === selectedOCId);

  useEffect(() => {
    const storedCompras = localStorage.getItem("compras");
    setCompras(storedCompras ? JSON.parse(storedCompras) : initialCompras);
    
    const storedOrdenes = localStorage.getItem("ordenes_compra");
    setOrdenes(storedOrdenes ? JSON.parse(storedOrdenes) : []);

     const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'compras') {
            const stored = localStorage.getItem("compras");
            setCompras(stored ? JSON.parse(stored) : initialCompras);
        }
        if (e.key === 'ordenes_compra') {
            const storedOC = localStorage.getItem("ordenes_compra");
            setOrdenes(storedOC ? JSON.parse(storedOC) : []);
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (compras.length > 0 || localStorage.getItem("compras")) {
      localStorage.setItem("compras", JSON.stringify(compras));
    }
  }, [compras]);


  useEffect(() => {
    if (selectedOC) {
        setItems(selectedOC.items.map(item => ({...item, cantidadRecibida: item.cantidad})));
    } else {
        setItems([]);
    }
  }, [selectedOCId, selectedOC]);
  
  const handleItemChange = (index: number, value: string) => {
    const newItems = [...items];
    const originalQty = selectedOC?.items[index].cantidad || 0;
    let receivedQty = Number(value);
    
    if (receivedQty < 0) receivedQty = 0;
    if (receivedQty > originalQty) {
        toast({ variant: 'destructive', title: 'Cantidad inválida', description: `No puede recibir más de lo solicitado (${originalQty}).`})
        receivedQty = originalQty;
    }

    newItems[index].cantidadRecibida = receivedQty;
    setItems(newItems);
  }

  const calcularTotal = () => {
     return items.reduce((total, item) => total + (item.cantidadRecibida * item.precio), 0).toFixed(2);
  }

  const resetForm = () => {
    setSelectedOCId('');
    setNumeroFactura('');
    setFechaFactura(new Date());
    setItems([]);
  }

  const handleCreateCompra = () => {
    if (!selectedOCId || !numeroFactura || !fechaFactura) {
        toast({ variant: 'destructive', title: 'Error de validación', description: 'Complete todos los campos de la factura.'});
        return;
    }

    const totalRecibido = items.reduce((sum, item) => sum + item.cantidadRecibida, 0);
    if (totalRecibido === 0) {
        toast({ variant: 'destructive', title: 'Error', description: 'Debe recibir al menos un producto.'});
        return;
    }

    const nuevaCompra: Compra = {
        id: `COM-${String(compras.length + 1).padStart(3, '0')}`,
        ordenCompraId: selectedOCId,
        proveedor: selectedOC?.proveedor || 'N/A',
        fechaFactura: format(fechaFactura, "yyyy-MM-dd"),
        numeroFactura,
        total: parseFloat(calcularTotal()),
        items,
        usuario: 'Usuario',
        fechaCreacion: new Date().toISOString()
    }

    setCompras([nuevaCompra, ...compras]);

    // Update OC status
    const totalOriginal = selectedOC?.items.reduce((sum, item) => sum + item.cantidad, 0) || 0;
    const nuevoEstado = totalRecibido < totalOriginal ? 'Recibido Parcial' : 'Recibido Completo';
    
    const updatedOrdenes = ordenes.map(oc => 
        oc.id === selectedOCId ? {...oc, estado: nuevoEstado} : oc
    );
    localStorage.setItem('ordenes_compra', JSON.stringify(updatedOrdenes));
    window.dispatchEvent(new StorageEvent('storage', { key: 'ordenes_compra' }));

    toast({ title: 'Compra Registrada', description: `La compra ${nuevaCompra.id} ha sido registrada.`});
    setOpenCreate(false);
  }

  useEffect(() => {
    if(!openCreate) resetForm();
  }, [openCreate]);


  const handleOpenDetails = (compra: Compra) => {
    setSelectedCompra(compra);
    setOpenDetails(true);
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Registro de Compras</h1>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4"/>Registrar Compra</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Registrar Nueva Compra</DialogTitle>
                    <DialogDescription>Seleccione una OC y registre los datos de la factura.</DialogDescription>
                </DialogHeader>
                 <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="oc" className="text-right">Orden de Compra</Label>
                        <div className="col-span-3">
                            <Combobox
                                options={ordenesPendientes.map(oc => ({ value: oc.id, label: `${oc.id} - ${oc.proveedor}` }))}
                                value={selectedOCId}
                                onChange={setSelectedOCId}
                                placeholder="Seleccione una OC pendiente"
                                searchPlaceholder="Buscar OC..."
                            />
                        </div>
                    </div>

                    {selectedOC && (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="factura-num" className="text-right">Nro. Factura</Label>
                                <Input id="factura-num" value={numeroFactura} onChange={e => setNumeroFactura(e.target.value)} className="col-span-3" />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="factura-fecha" className="text-right">Fecha Factura</Label>
                                 <Popover>
                                    <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                        "col-span-3 justify-start text-left font-normal",
                                        !fechaFactura && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {fechaFactura ? format(fechaFactura, "PPP") : <span>Seleccione una fecha</span>}
                                    </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={fechaFactura}
                                        onSelect={setFechaFactura}
                                        initialFocus
                                    />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <Card className="col-span-4">
                                <CardHeader><CardTitle>Productos a Recibir</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Producto</TableHead>
                                                <TableHead className="w-[150px]">Cant. Pedida</TableHead>
                                                <TableHead className="w-[150px]">Cant. Recibida</TableHead>
                                                <TableHead className="w-[150px]">Precio Unit.</TableHead>
                                                <TableHead className="text-right">Subtotal</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{item.nombre}</TableCell>
                                                    <TableCell>{item.cantidad}</TableCell>
                                                    <TableCell><Input type="number" value={item.cantidadRecibida} onChange={e => handleItemChange(index, e.target.value)} min="0"/></TableCell>
                                                    <TableCell>${item.precio.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right">${(item.cantidadRecibida * item.precio).toFixed(2)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <div className="text-right font-bold text-lg mt-4">Total Factura: ${calcularTotal()}</div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                 </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
                    <Button onClick={handleCreateCompra} disabled={!selectedOCId}>Confirmar Recepción</Button>
                </DialogFooter>
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
                <TableHead>ID Orden</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Nro. Factura</TableHead>
                <TableHead>Fecha Factura</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compras.map((compra) => (
                <TableRow key={compra.id}>
                  <TableCell className="font-medium">{compra.id}</TableCell>
                  <TableCell>{compra.ordenCompraId}</TableCell>
                  <TableCell>{compra.proveedor}</TableCell>
                  <TableCell>{compra.numeroFactura}</TableCell>
                   <TableCell>{compra.fechaFactura}</TableCell>
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
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Detalles de la Compra: {selectedCompra?.id}</DialogTitle>
                <DialogDescription>
                    Información detallada de la compra y factura asociada.
                </DialogDescription>
            </DialogHeader>
            {selectedCompra && (
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p className="font-semibold">Proveedor:</p>
                            <p>{selectedCompra.proveedor}</p>
                        </div>
                         <div>
                            <p className="font-semibold">Orden de Compra:</p>
                            <p>{selectedCompra.ordenCompraId}</p>
                        </div>
                        <div>
                            <p className="font-semibold">Número de Factura:</p>
                            <p>{selectedCompra.numeroFactura}</p>
                        </div>
                         <div>
                            <p className="font-semibold">Fecha de Factura:</p>
                            <p>{selectedCompra.fechaFactura}</p>
                        </div>
                        <div>
                            <p className="font-semibold">Registrado por:</p>
                            <p>{selectedCompra.usuario}</p>
                        </div>
                         <div>
                            <p className="font-semibold">Fecha de Registro:</p>
                            <p>{new Date(selectedCompra.fechaCreacion).toLocaleString()}</p>
                        </div>
                    </div>

                    <Card>
                        <CardHeader><CardTitle>Productos Recibidos</CardTitle></CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Producto</TableHead>
                                        <TableHead>Cantidad Recibida</TableHead>
                                        <TableHead>Precio Unit.</TableHead>
                                        <TableHead className="text-right">Subtotal</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedCompra.items.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{item.nombre}</TableCell>
                                            <TableCell>{item.cantidadRecibida}</TableCell>
                                            <TableCell>${item.precio.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">${(item.cantidadRecibida * item.precio).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                     <div className="text-right font-bold text-xl mt-4">
                        Total Facturado: ${selectedCompra.total.toFixed(2)}
                    </div>
                </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={() => setOpenDetails(false)}>Cerrar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
