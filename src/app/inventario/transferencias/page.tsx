
"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { collection, getDocs, addDoc, doc, serverTimestamp, query, orderBy, writeBatch, where, increment, getDoc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter as DialogFooterComponent, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/command";

// --- Types ---
type Deposito = { id: string; nombre: string; };
type Producto = { id: string; nombre: string; };
type Stock = { id: string; producto_id: string; deposito_id: string; cantidad: number; };

type TransferenciaStock = {
  id: string;
  fecha_transferencia: string;
  deposito_origen_id: string;
  deposito_origen_nombre: string;
  deposito_destino_id: string;
  deposito_destino_nombre: string;
  producto_id: string;
  producto_nombre: string;
  cantidad: number;
  motivo: string;
  usuario_id: string;
  fecha_creacion: any;
};

// --- Main Component ---
export default function TransferenciasStockPage() {
  const { toast } = useToast();
  const [transferencias, setTransferencias] = useState<TransferenciaStock[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [stockList, setStockList] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [openCreate, setOpenCreate] = useState(false);
  const [selectedOrigenId, setSelectedOrigenId] = useState('');
  const [selectedDestinoId, setSelectedDestinoId] = useState('');
  const [selectedProductoId, setSelectedProductoId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState('');
  const [currentStock, setCurrentStock] = useState<number | null>(null);

  const [filteredProducts, setFilteredProducts] = useState<Producto[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [transferenciasSnap, productosSnap, depositosSnap, stockSnap] = await Promise.all([
        getDocs(query(collection(db, 'transferencias_stock'), orderBy("fecha_creacion", "desc"))),
        getDocs(query(collection(db, 'productos'), orderBy("nombre"))),
        getDocs(query(collection(db, 'depositos'), orderBy("nombre"))),
        getDocs(collection(db, 'stock'))
      ]);

      setTransferencias(transferenciasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TransferenciaStock)));
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
  }, [toast]);

  useEffect(() => {
      if (selectedOrigenId) {
          const productIdsInStock = stockList
              .filter(stock => stock.deposito_id === selectedOrigenId && stock.cantidad > 0)
              .map(stock => stock.producto_id);
          setFilteredProducts(productos.filter(p => productIdsInStock.includes(p.id)));
      } else {
          setFilteredProducts([]);
      }
      setSelectedProductoId('');
      setCurrentStock(null);
  }, [selectedOrigenId, stockList, productos]);

  useEffect(() => {
    if (selectedOrigenId && selectedProductoId) {
      const stockItem = stockList.find(
        (s) => s.deposito_id === selectedOrigenId && s.producto_id === selectedProductoId
      );
      setCurrentStock(stockItem?.cantidad ?? 0);
    } else {
      setCurrentStock(null);
    }
  }, [selectedProductoId, selectedOrigenId, stockList]);


  const resetForm = () => {
    setSelectedOrigenId('');
    setSelectedDestinoId('');
    setSelectedProductoId('');
    setCantidad(1);
    setMotivo('');
    setCurrentStock(null);
  }

  useEffect(() => {
    if (!openCreate) {
      resetForm();
    }
  }, [openCreate]);


  const handleCreateTransferencia = async () => {
    if (!selectedOrigenId || !selectedDestinoId || !selectedProductoId || cantidad <= 0 || !motivo) {
        toast({ variant: 'destructive', title: 'Error de Validación', description: 'Todos los campos son requeridos.' });
        return;
    }

    if (selectedOrigenId === selectedDestinoId) {
        toast({ variant: 'destructive', title: 'Error de Validación', description: 'El depósito de origen y destino no pueden ser el mismo.' });
        return;
    }
    
    if (currentStock === null || cantidad > currentStock) {
        toast({ variant: 'destructive', title: 'Cantidad Inválida', description: `La cantidad a transferir no puede ser mayor al stock disponible (${currentStock ?? 0}).` });
        return;
    }

    const producto = productos.find(p => p.id === selectedProductoId);
    const depositoOrigen = depositos.find(d => d.id === selectedOrigenId);
    const depositoDestino = depositos.find(d => d.id === selectedDestinoId);
    
    if (!producto || !depositoOrigen || !depositoDestino) {
        toast({ variant: 'destructive', title: 'Error de Datos', description: 'El producto o depósitos seleccionados no son válidos.' });
        return;
    }

    try {
        await runTransaction(db, async (transaction) => {
            // 1. Get stock documents within transaction
            const stockOrigenQuery = query(collection(db, 'stock'), where('producto_id', '==', selectedProductoId), where('deposito_id', '==', selectedOrigenId));
            const stockOrigenSnap = await getDocs(stockOrigenQuery);
            if (stockOrigenSnap.empty) throw new Error("El producto no tiene stock en el depósito de origen.");
            const stockOrigenDoc = stockOrigenSnap.docs[0];

            if (stockOrigenDoc.data().cantidad < cantidad) {
                throw new Error(`Stock insuficiente. Disponible: ${stockOrigenDoc.data().cantidad}.`);
            }

            // 2. Decrement stock from origin
            transaction.update(stockOrigenDoc.ref, { 
                cantidad: increment(-cantidad),
                fecha_actualizacion: serverTimestamp()
            });

            // 3. Increment stock in destination
            const stockDestinoQuery = query(collection(db, 'stock'), where('producto_id', '==', selectedProductoId), where('deposito_id', '==', selectedDestinoId));
            const stockDestinoSnap = await getDocs(stockDestinoQuery);

            if (stockDestinoSnap.empty) {
                // Create new stock record if it doesn't exist
                const newStockDestinoRef = doc(collection(db, 'stock'));
                transaction.set(newStockDestinoRef, {
                    producto_id: selectedProductoId,
                    producto_nombre: producto.nombre,
                    deposito_id: selectedDestinoId,
                    deposito_nombre: depositoDestino.nombre,
                    cantidad: cantidad,
                    fecha_actualizacion: serverTimestamp()
                });
            } else {
                const stockDestinoDoc = stockDestinoSnap.docs[0];
                transaction.update(stockDestinoDoc.ref, {
                    cantidad: increment(cantidad),
                    fecha_actualizacion: serverTimestamp()
                });
            }

            // 4. Create transfer record
            const transferenciaRef = doc(collection(db, "transferencias_stock"));
            transaction.set(transferenciaRef, {
                fecha_transferencia: format(new Date(), "yyyy-MM-dd"),
                deposito_origen_id: selectedOrigenId,
                deposito_origen_nombre: depositoOrigen.nombre,
                deposito_destino_id: selectedDestinoId,
                deposito_destino_nombre: depositoDestino.nombre,
                producto_id: selectedProductoId,
                producto_nombre: producto.nombre,
                cantidad: cantidad,
                motivo: motivo,
                usuario_id: "user-demo",
                fecha_creacion: serverTimestamp()
            });
        });

        toast({ title: 'Transferencia Registrada', description: `El stock ha sido actualizado en ambos depósitos.` });
        setOpenCreate(false);
        await fetchData();

    } catch(e: any) {
        console.error("Error al crear transferencia:", e);
        toast({ variant: 'destructive', title: 'Error en Transacción', description: e.message || 'No se pudo registrar la transferencia.' });
    }
  }


  if (loading) return <p>Cargando transferencias...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Transferencias entre Depósitos</h1>
         <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4"/>Registrar Transferencia</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Registrar Nueva Transferencia</DialogTitle>
                    <CardDescription>Mueva stock de un depósito a otro.</CardDescription>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto pr-4 -mr-4">
                  <div className="grid gap-6 py-4">
                      <div className="space-y-2">
                          <Label htmlFor="deposito-origen">Depósito Origen</Label>
                          <Combobox
                              options={depositos.map(d => ({ value: d.id, label: d.nombre }))}
                              value={selectedOrigenId}
                              onChange={setSelectedOrigenId}
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
                              disabled={!selectedOrigenId}
                          />
                          {currentStock !== null && (
                            <p className="text-sm text-muted-foreground mt-1">
                                Stock Origen: <span className="font-bold text-foreground">{currentStock}</span>
                            </p>
                          )}
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="cantidad">Cantidad a Transferir</Label>
                          <Input id="cantidad" type="number" value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} min="1" />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="deposito-destino">Depósito Destino</Label>
                          <Combobox
                              options={depositos.filter(d => d.id !== selectedOrigenId).map(d => ({ value: d.id, label: d.nombre }))}
                              value={selectedDestinoId}
                              onChange={setSelectedDestinoId}
                              placeholder="Seleccione un depósito"
                              searchPlaceholder="Buscar depósito..."
                               disabled={!selectedOrigenId}
                          />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="motivo">Motivo de la Transferencia</Label>
                          <Textarea id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: Reabastecimiento de sucursal, movimiento para venta, etc."/>
                      </div>
                  </div>
                </div>
                <DialogFooterComponent className="border-t pt-4">
                    <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
                    <Button onClick={handleCreateTransferencia}>Confirmar Transferencia</Button>
                </DialogFooterComponent>
            </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Transferencias</CardTitle>
          <CardDescription>Registro de todos los movimientos de stock entre depósitos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transferencias.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.fecha_transferencia}</TableCell>
                  <TableCell className="font-medium">{t.producto_nombre}</TableCell>
                  <TableCell>{t.deposito_origen_nombre}</TableCell>
                  <TableCell>{t.deposito_destino_nombre}</TableCell>
                  <TableCell>{t.usuario_id}</TableCell>
                  <TableCell className="text-right font-bold">{t.cantidad}</TableCell>
                  <TableCell>{t.motivo}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {transferencias.length === 0 && <p className="text-center text-muted-foreground mt-4">No hay transferencias registradas.</p>}
        </CardContent>
      </Card>
    </>
  );
}
