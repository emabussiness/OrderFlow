
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";

type Categoria = { id: string; nombre: string; };
type UnidadMedida = { id: string; nombre: string; simbolo: string; };

type Producto = {
  id: string;
  nombre: string;
  descripcion?: string;
  categoria_id: string;
  unidad_medida_id: string;
  precio_referencia: number;
  codigo_interno?: string;
  codigo_barra?: string;
  iva_tipo: number; // 5, 10 o 0 para exento
  costo_promedio?: number;
  fecha_creacion?: any;
};

const initialProductoState: Omit<Producto, 'id' | 'fecha_creacion'> = {
    nombre: "",
    descripcion: "",
    categoria_id: "",
    unidad_medida_id: "",
    precio_referencia: 0,
    codigo_interno: "",
    codigo_barra: "",
    iva_tipo: 10,
    costo_promedio: 0,
};

// Formateador de moneda para Guaraníes
const currencyFormatter = new Intl.NumberFormat('es-PY', {
  style: 'currency',
  currency: 'PYG',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});


export default function ProductosPage() {
  const { toast } = useToast();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [unidadesMedida, setUnidadesMedida] = useState<UnidadMedida[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for Create/Edit Dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProducto, setCurrentProducto] = useState<Omit<Producto, 'id' | 'fecha_creacion'>>(initialProductoState);
  const [currentProductoId, setCurrentProductoId] = useState<string | null>(null);

  // State for Details Dialog
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Producto | null>(null);


  const fetchData = async () => {
    setLoading(true);
    try {
      const productosCollection = collection(db, 'productos');
      const qProductos = query(productosCollection, orderBy("nombre", "asc"));
      const productosSnapshot = await getDocs(qProductos);
      const productosList = productosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Producto));
      setProductos(productosList);

      const categoriasCollection = collection(db, 'categorias_productos');
      const qCategorias = query(categoriasCollection, orderBy("nombre", "asc"));
      const categoriasSnapshot = await getDocs(qCategorias);
      const categoriasList = categoriasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Categoria));
      setCategorias(categoriasList);

      const unidadesCollection = collection(db, 'unidades_medida');
      const qUnidades = query(unidadesCollection, orderBy("nombre", "asc"));
      const unidadesSnapshot = await getDocs(qUnidades);
      const unidadesList = unidadesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UnidadMedida));
      setUnidadesMedida(unidadesList);

    } catch (error) {
      console.error("Error fetching data: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDialog = (producto: Producto | null = null) => {
    if (producto) {
      setIsEditing(true);
      setCurrentProductoId(producto.id);
      setCurrentProducto({
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        categoria_id: producto.categoria_id,
        unidad_medida_id: producto.unidad_medida_id,
        precio_referencia: producto.precio_referencia,
        codigo_interno: producto.codigo_interno,
        codigo_barra: producto.codigo_barra,
        iva_tipo: producto.iva_tipo,
        costo_promedio: producto.costo_promedio,
      });
    } else {
      setIsEditing(false);
      setCurrentProducto(initialProductoState);
      setCurrentProductoId(null);
    }
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setIsEditing(false);
    setCurrentProducto(initialProductoState);
    setCurrentProductoId(null);
  }
  
  const handleOpenDetailsDialog = (producto: Producto) => {
    setSelectedProductForDetails(producto);
    setOpenDetailsDialog(true);
  };

  const handleInputChange = (field: keyof Omit<Producto, 'id'| 'fecha_creacion'>, value: any) => {
      setCurrentProducto(prev => ({...prev, [field]: value}));
  }

  const handleSubmit = async () => {
    const trimmedName = currentProducto.nombre.trim();
    const trimmedCode = currentProducto.codigo_interno?.trim();

    if (!trimmedName || !currentProducto.categoria_id || !currentProducto.unidad_medida_id || !trimmedCode) {
        toast({ variant: 'destructive', title: 'Error de validación', description: 'Nombre, categoría, unidad de medida y código interno son requeridos.'});
        return;
    }
    
    if (currentProducto.precio_referencia < (currentProducto.costo_promedio || 0)) {
        toast({ variant: 'destructive', title: 'Error de validación', description: 'El precio de referencia no puede ser menor al costo promedio.'});
        return;
    }
    
    // Check for duplicates
    const checkDuplicate = async (field: 'codigo_interno' | 'nombre', value: string, message: string) => {
        const q = query(collection(db, 'productos'), where(field, "==", value));
        const snapshot = await getDocs(q);
        if(!snapshot.empty) {
            if (isEditing && currentProductoId) {
                if (snapshot.docs[0].id !== currentProductoId) {
                    toast({ variant: 'destructive', title: 'Producto duplicado', description: message});
                    return true;
                }
            } else {
                toast({ variant: 'destructive', title: 'Producto duplicado', description: message});
                return true;
            }
        }
        return false;
    }
    
    if (await checkDuplicate('codigo_interno', trimmedCode, `Ya existe un producto con el código interno ${trimmedCode}.`)) return;
    if (await checkDuplicate('nombre', trimmedName, `Ya existe un producto con el nombre ${trimmedName}.`)) return;


    try {
        const productData = {
            ...currentProducto,
            nombre: trimmedName,
            codigo_interno: trimmedCode
        };

        if(isEditing && currentProductoId) {
            const productoRef = doc(db, 'productos', currentProductoId);
            await updateDoc(productoRef, productData);
            toast({ title: 'Producto Actualizado', description: 'El producto ha sido actualizado exitosamente.'});
        } else {
            await addDoc(collection(db, 'productos'), { ...productData, fecha_creacion: serverTimestamp() });
            toast({ title: 'Producto Creado', description: 'El nuevo producto ha sido creado exitosamente.'});
        }
        await fetchData();
        handleCloseDialog();
    } catch (error) {
        console.error("Error saving producto: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el producto.'});
    }
  }

  const handleDelete = async (productoId: string) => {
      try {
          await deleteDoc(doc(db, 'productos', productoId));
          toast({ title: 'Producto Eliminado', description: 'El producto ha sido eliminado.', variant: 'destructive' });
          await fetchData();
      } catch (error) {
          console.error("Error deleting producto: ", error);
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el producto.'});
      }
  }

  if (loading) return <p>Cargando productos...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Productos</h1>
        <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4"/>Crear Producto</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Código Interno</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Precio Ref.</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productos.map((producto) => (
                <TableRow key={producto.id}>
                  <TableCell className="font-medium">{producto.nombre}</TableCell>
                  <TableCell>{producto.codigo_interno || 'N/A'}</TableCell>
                  <TableCell>{categorias.find(c => c.id === producto.categoria_id)?.nombre || 'Desconocida'}</TableCell>
                  <TableCell className="text-right">{currencyFormatter.format(producto.precio_referencia || 0)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDetailsDialog(producto)}><Eye className="mr-2 h-4 w-4" />Ver Detalles</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenDialog(producto)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 hover:text-red-500 focus:text-red-500"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente el producto de la base de datos.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(producto.id)} className="bg-destructive hover:bg-destructive/90">Confirmar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           {productos.length === 0 && <p className="text-center text-muted-foreground mt-4">No hay productos registrados.</p>}
        </CardContent>
      </Card>
      
      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Producto' : 'Crear Nuevo Producto'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Actualice los detalles del producto.' : 'Complete los detalles para crear un nuevo producto.'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-grow pr-6 -mr-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 py-4 pr-1">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="nombre">Nombre del Producto</Label>
                <Input id="nombre" value={currentProducto.nombre} onChange={e => handleInputChange('nombre', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoria_id">Categoría</Label>
                <Combobox
                  options={categorias.map(c => ({ value: c.id, label: c.nombre }))}
                  value={currentProducto.categoria_id}
                  onChange={(value) => handleInputChange('categoria_id', value)}
                  placeholder="Seleccione una categoría"
                  searchPlaceholder="Buscar categoría..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unidad_medida_id">Unidad de Medida</Label>
                <Combobox
                  options={unidadesMedida.map(u => ({ value: u.id, label: `${u.nombre} (${u.simbolo})` }))}
                  value={currentProducto.unidad_medida_id}
                  onChange={(value) => handleInputChange('unidad_medida_id', value)}
                  placeholder="Seleccione una unidad"
                  searchPlaceholder="Buscar unidad..."
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea id="descripcion" value={currentProducto.descripcion} onChange={e => handleInputChange('descripcion', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codigo_interno">Código Interno</Label>
                <Input id="codigo_interno" value={currentProducto.codigo_interno} onChange={e => handleInputChange('codigo_interno', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codigo_barra">Código de Barras</Label>
                <Input id="codigo_barra" value={currentProducto.codigo_barra} onChange={e => handleInputChange('codigo_barra', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="costo_promedio">Costo Promedio</Label>
                <Input id="costo_promedio" type="number" value={currentProducto.costo_promedio} onChange={e => handleInputChange('costo_promedio', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="precio_referencia">Precio de Referencia</Label>
                <Input id="precio_referencia" type="number" value={currentProducto.precio_referencia} onChange={e => handleInputChange('precio_referencia', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="iva_tipo">Tipo de IVA (%)</Label>
                <Combobox
                  options={[{ value: "10", label: '10%' }, { value: "5", label: '5%' }, { value: "0", label: 'Exento' }]}
                  value={String(currentProducto.iva_tipo)}
                  onChange={(value) => handleInputChange('iva_tipo', parseInt(value))}
                  placeholder="Seleccione tipo de IVA"
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
            <Button onClick={handleSubmit}>{isEditing ? 'Guardar Cambios' : 'Crear Producto'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Details Dialog */}
      <Dialog open={openDetailsDialog} onOpenChange={setOpenDetailsDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Detalles del Producto</DialogTitle>
            <DialogDescription>{selectedProductForDetails?.nombre}</DialogDescription>
          </DialogHeader>
          {selectedProductForDetails && (
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 py-4 text-sm">
              <div>
                <Label className="font-semibold">Descripción</Label>
                <p className="text-muted-foreground">{selectedProductForDetails.descripcion || 'N/A'}</p>
              </div>
              <div>
                <Label className="font-semibold">Categoría</Label>
                <p className="text-muted-foreground">{categorias.find(c => c.id === selectedProductForDetails.categoria_id)?.nombre || 'N/A'}</p>
              </div>
              <div>
                <Label className="font-semibold">Unidad de Medida</Label>
                <p className="text-muted-foreground">{unidadesMedida.find(u => u.id === selectedProductForDetails.unidad_medida_id)?.nombre || 'N/A'}</p>
              </div>
              <div>
                <Label className="font-semibold">Tipo de IVA</Label>
                <p className="text-muted-foreground">{selectedProductForDetails.iva_tipo}%</p>
              </div>
              <div>
                <Label className="font-semibold">Código Interno</Label>
                <p className="text-muted-foreground">{selectedProductForDetails.codigo_interno || 'N/A'}</p>
              </div>
              <div>
                <Label className="font-semibold">Código de Barras</Label>
                <p className="text-muted-foreground">{selectedProductForDetails.codigo_barra || 'N/A'}</p>
              </div>
              <div className="p-4 bg-secondary/50 rounded-md">
                <Label className="font-semibold">Costo Promedio</Label>
                <p className="text-lg font-bold">{currencyFormatter.format(selectedProductForDetails.costo_promedio || 0)}</p>
              </div>
              <div className="p-4 bg-secondary/50 rounded-md">
                <Label className="font-semibold">Precio de Referencia</Label>
                <p className="text-lg font-bold">{currencyFormatter.format(selectedProductForDetails.precio_referencia || 0)}</p>
              </div>
              <div className="col-span-2">
                 <Label className="font-semibold">Fecha de Creación</Label>
                 <p className="text-muted-foreground">{selectedProductForDetails.fecha_creacion?.toDate().toLocaleString() || 'N/A'}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDetailsDialog(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

    