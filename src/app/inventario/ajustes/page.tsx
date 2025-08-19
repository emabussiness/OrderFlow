
"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { collection, getDocs, addDoc, doc, serverTimestamp, query, orderBy, writeBatch, where, increment } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter as DialogFooterComponent, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/command";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// --- Types ---
type Deposito = { id: string; nombre: string; };
type Producto = { id: string; nombre: string; };
type Stock = { id: string; producto_id: string; deposito_id: string; cantidad: number; };

type AjusteStock = {
  id: string;
  fecha_ajuste: string;
  tipo_ajuste: "Entrada" | "Salida";
  deposito_id: string;
  deposito_nombre: string;
  producto_id: string;
  producto_nombre: string;
  cantidad: number;
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


export default function AjustesStockPage() {
  const { toast } = useToast();
  const [ajustes, setAjustes] = useState<AjusteStock[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [stockList, setStockList] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [openCreate, setOpenCreate] = useState(false);
  const [tipoAjuste, setTipoAjuste] = useState<"Entrada" | "Salida">("Salida");
  const [selectedDepositoId, setSelectedDepositoId] = useState('');
  const [selectedProductoId, setSelectedProductoId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState('');

  const [filteredProducts, setFilteredProducts] = useState<Producto[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ajustesSnap, productosSnap, depositosSnap, stockSnap] = await Promise.all([
        getDocs(query(collection(db, 'ajustes_stock'), orderBy("fecha_creacion", "desc"))),
        getDocs(query(collection(db, 'productos'), orderBy("nombre"))),
        getDocs(query(collection(db, 'depositos'), orderBy("nombre"))),
        getDocs(collection(db, 'stock'))
      ]);

      setAjustes(ajustesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AjusteStock)));
      const allProductos = productosSnap.docs.map(doc => ({ id: doc.id, nombre: doc.data().nombre } as Producto));
      setProductos(allProductos);
      setDepositos(depositosSnap.docs.map(doc => ({ id: doc.id, nombre: doc.data().nombre } as Deposito)));
      setStockList(stockSnap.docs.map(doc => doc.data() as Stock));
      
      setFilteredProducts(allProductos); // Initially show all products

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
      if (selectedDepositoId) {
          const productIdsInStock = stockList
              .filter(stock => stock.deposito_id === selectedDepositoId)
              .map(stock => stock.producto_id);
          
          if (tipoAjuste === 'Salida') {
            setFilteredProducts(productos.filter(p => productIdsInStock.includes(p.id)));
          } else {
            setFilteredProducts(productos);
          }
      } else {
          setFilteredProducts(productos);
      }
      setSelectedProductoId(''); // Reset product selection when depot changes
  }, [selectedDepositoId, stockList, productos, tipoAjuste]);


  const resetForm = () => {
    setTipoAjuste("Salida");
    setSelectedDepositoId('');
    setSelectedProductoId('');
    setCantidad(1);
    setMotivo('');
  }

  useEffect(() => {
    if (!openCreate) {
      resetForm();
    }
  }, [openCreate]);


  const handleCreateAjuste = async () => {
    if (!selectedDepositoId || !selectedProductoId || cantidad <= 0 || !motivo) {
        toast({ variant: 'destructive', title: 'Error de Validación', description: 'Todos los campos son requeridos.' });
        return;
    }
    
    const producto = productos.find(p => p.id === selectedProductoId);
    const deposito = depositos.find(d => d.id === selectedDepositoId);
    
    if (!producto || !deposito) {
        toast({ variant: 'destructive', title: 'Error de Datos', description: 'El producto o depósito seleccionado no es válido.' });
        return;
    }

    try {
        const batch = writeBatch(db);

        // 1. Create the adjustment record
        const ajusteRef = doc(collection(db, "ajustes_stock"));
        batch.set(ajusteRef, {
            fecha_ajuste: format(new Date(), "yyyy-MM-dd"),
            tipo_ajuste: tipoAjuste,
            deposito_id: selectedDepositoId,
            deposito_nombre: deposito.nombre,
            producto_id: selectedProductoId,
            producto_nombre: producto.nombre,
            cantidad: cantidad,
            motivo: motivo,
            usuario_id: "user-demo",
            fecha_creacion: serverTimestamp()
        });

        // 2. Update the stock
        const qStock = query(
            collection(db, 'stock'),
            where('producto_id', '==', selectedProductoId),
            where('deposito_id', '==', selectedDepositoId)
        );
        const stockSnapshot = await getDocs(qStock);
        const cantidadAjuste = tipoAjuste === 'Entrada' ? cantidad : -cantidad;
        
        if (stockSnapshot.empty) {
            if (tipoAjuste === 'Salida') {
                toast({ variant: 'destructive', title: 'Error de Stock', description: 'No se puede realizar un ajuste de salida para un producto sin stock en este depósito.'});
                return;
            }
            // Create new stock record if it doesn't exist (only for entradas)
            const stockRef = doc(collection(db, 'stock'));
            batch.set(stockRef, {
                producto_id: selectedProductoId,
                producto_nombre: producto.nombre,
                deposito_id: selectedDepositoId,
                deposito_nombre: deposito.nombre,
                cantidad: cantidadAjuste,
                fecha_actualizacion: serverTimestamp()
            });
        } else {
            const stockDoc = stockSnapshot.docs[0];
            if (tipoAjuste === 'Salida' && stockDoc.data().cantidad < cantidad) {
                toast({ variant: 'destructive', title: 'Stock Insuficiente', description: `No hay suficiente stock para este ajuste. Disponible: ${stockDoc.data().cantidad}.`});
                return;
            }
            batch.update(stockDoc.ref, {
                cantidad: increment(cantidadAjuste),
                fecha_actualizacion: serverTimestamp()
            });
        }
        
        await batch.commit();

        toast({ title: 'Ajuste de Stock Registrado', description: `El stock ha sido actualizado correctamente.` });
        setOpenCreate(false);
        await fetchData();
    } catch(e) {
        console.error("Error creating stock adjustment:", e);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo registrar el ajuste.' });
    }
  }


  if (loading) return <p>Cargando ajustes...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Ajustes de Stock</h1>
         <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4"/>Registrar Ajuste</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Registrar Ajuste Manual de Stock</DialogTitle>
                    <CardDescription>Use este formulario para registrar mermas, roturas, sobrantes u otras diferencias de inventario.</CardDescription>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto pr-4 -mr-4">
                  <div className="grid gap-6 py-4">
                      <div className="space-y-2">
                          <Label>Tipo de Ajuste</Label>
                          <RadioGroup value={tipoAjuste} onValueChange={(v) => setTipoAjuste(v as any)} className="grid grid-cols-2 gap-4">
                              <div>
                                  <RadioGroupItem value="Entrada" id="r-entrada" className="peer sr-only" />
                                  <Label htmlFor="r-entrada" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                      Entrada (+)
                                  </Label>
                              </div>
                              <div>
                                  <RadioGroupItem value="Salida" id="r-salida" className="peer sr-only" />
                                  <Label htmlFor="r-salida" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-destructive [&:has([data-state=checked])]:border-destructive">
                                      Salida (-)
                                  </Label>
                              </div>
                          </RadioGroup>
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="deposito">Depósito</Label>
                          <Combobox
                              options={depositos.map(d => ({ value: d.id, label: d.nombre }))}
                              value={selectedDepositoId}
                              onChange={setSelectedDepositoId}
                              placeholder="Seleccione un depósito"
                              searchPlaceholder="Buscar depósito..."
                          />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="producto">Producto</Label>
                          <Combobox
                              options={filteredProducts.map(p => ({ value: p.id, label: p.nombre }))}
                              value={selectedProductoId}
                              onChange={setSelectedProductoId}
                              placeholder="Seleccione un producto"
                              searchPlaceholder="Buscar producto..."
                              disabled={!selectedDepositoId}
                          />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="cantidad">Cantidad</Label>
                          <Input id="cantidad" type="number" value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} min="1" />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="motivo">Motivo del Ajuste</Label>
                          <Textarea id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: Rotura por mal manejo, Diferencia de inventario, etc."/>
                      </div>
                  </div>
                </div>
                <DialogFooterComponent className="border-t pt-4">
                    <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
                    <Button onClick={handleCreateAjuste}>Confirmar Ajuste</Button>
                </DialogFooterComponent>
            </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Ajustes</CardTitle>
          <CardDescription>Registro de todos los ajustes de stock manuales realizados.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Depósito</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Usuario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ajustes.map((ajuste) => (
                <TableRow key={ajuste.id}>
                  <TableCell>{ajuste.fecha_ajuste}</TableCell>
                  <TableCell className="font-medium">{ajuste.producto_nombre}</TableCell>
                  <TableCell>{ajuste.deposito_nombre}</TableCell>
                  <TableCell>
                    <Badge variant={ajuste.tipo_ajuste === 'Entrada' ? 'default' : 'destructive'}>{ajuste.tipo_ajuste}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold">{ajuste.cantidad}</TableCell>
                  <TableCell>{ajuste.motivo}</TableCell>
                  <TableCell>{ajuste.usuario_id}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {ajustes.length === 0 && <p className="text-center text-muted-foreground mt-4">No hay ajustes registrados.</p>}
        </CardContent>
      </Card>
    </>
  );
}
