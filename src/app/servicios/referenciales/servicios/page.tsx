
"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle, Trash2, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription as DialogDescriptionComponent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/command";

type Servicio = {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  iva_tipo: number;
};

const initialServicioState: Omit<Servicio, 'id'> = {
    nombre: "",
    descripcion: "",
    precio: 0,
    iva_tipo: 10,
};

const currencyFormatter = new Intl.NumberFormat('es-PY', {
  style: 'currency',
  currency: 'PYG',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});


export default function ServiciosPage() {
  const { toast } = useToast();
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentServicio, setCurrentServicio] = useState<Omit<Servicio, 'id'>>(initialServicioState);
  const [currentServicioId, setCurrentServicioId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchServicios = async () => {
    setLoading(true);
    try {
      const serviciosCollection = collection(db, 'servicios');
      const q = query(serviciosCollection, orderBy("nombre", "asc"));
      const serviciosSnapshot = await getDocs(q);
      const serviciosList = serviciosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Servicio));
      setServicios(serviciosList);
    } catch (error) {
      console.error("Error fetching servicios: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los servicios." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServicios();
  }, [toast]);
  
  const filteredServicios = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return servicios.filter(servicio =>
      servicio.nombre.toLowerCase().includes(term)
    );
  }, [servicios, searchTerm]);


  const handleOpenDialog = (servicio: Servicio | null = null) => {
    if (servicio) {
      setIsEditing(true);
      setCurrentServicioId(servicio.id);
      setCurrentServicio({ 
          nombre: servicio.nombre,
          descripcion: servicio.descripcion,
          precio: servicio.precio,
          iva_tipo: servicio.iva_tipo,
       });
    } else {
      setIsEditing(false);
      setCurrentServicio(initialServicioState);
      setCurrentServicioId(null);
    }
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setIsEditing(false);
    setCurrentServicio(initialServicioState);
    setCurrentServicioId(null);
  }

  const handleInputChange = (field: keyof Omit<Servicio, 'id'>, value: string | number) => {
      setCurrentServicio(prev => ({...prev, [field]: value}));
  }

  const handleSubmit = async () => {
    const trimmedName = currentServicio.nombre.trim();
    if (!trimmedName || currentServicio.precio <= 0) {
        toast({ variant: 'destructive', title: 'Error de validación', description: 'Nombre y un precio mayor a cero son requeridos.'});
        return;
    }

    // Case-insensitive duplicate check for name
    const isDuplicate = servicios.some(s => 
        s.nombre.toLowerCase() === trimmedName.toLowerCase() && s.id !== currentServicioId
    );

    if (isDuplicate) {
        toast({ variant: 'destructive', title: 'Servicio duplicado', description: `Ya existe un servicio con el nombre "${trimmedName}".`});
        return;
    }

    try {
        const servicioData = {
            ...currentServicio,
            nombre: trimmedName,
        };

        if(isEditing && currentServicioId) {
            const servicioRef = doc(db, 'servicios', currentServicioId);
            await updateDoc(servicioRef, servicioData);
            toast({ title: 'Servicio Actualizado', description: 'El servicio ha sido actualizado exitosamente.'});
        } else {
            await addDoc(collection(db, 'servicios'), servicioData);
            toast({ title: 'Servicio Creado', description: 'El nuevo servicio ha sido creado exitosamente.'});
        }
        await fetchServicios();
        handleCloseDialog();
    } catch (error) {
        console.error("Error saving servicio: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el servicio.'});
    }
  }

  const handleDelete = async (servicioId: string) => {
      try {
          await deleteDoc(doc(db, 'servicios', servicioId));
          toast({ title: 'Servicio Eliminado', description: 'El servicio ha sido eliminado.', variant: 'destructive' });
          await fetchServicios();
      } catch (error) {
          console.error("Error deleting servicio: ", error);
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el servicio.'});
      }
  }

  if (loading) return <p>Cargando servicios...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Servicios (Mano de Obra)</h1>
        <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4"/>Crear Servicio</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo de Servicios</CardTitle>
          <CardDescription>
            <Input 
                placeholder="Buscar por nombre de servicio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-2"
            />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>IVA</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServicios.map((servicio) => (
                <TableRow key={servicio.id}>
                  <TableCell className="font-medium">{servicio.nombre}</TableCell>
                   <TableCell>{servicio.descripcion || 'N/A'}</TableCell>
                   <TableCell>{servicio.iva_tipo}%</TableCell>
                  <TableCell className="text-right font-medium">{currencyFormatter.format(servicio.precio)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(servicio)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 hover:text-red-500 focus:text-red-500"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente el servicio.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(servicio.id)} className="bg-destructive hover:bg-destructive/90">Confirmar</AlertDialogAction>
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
           {filteredServicios.length === 0 && <p className="text-center text-muted-foreground mt-4">No se encontraron servicios.</p>}
        </CardContent>
      </Card>
      
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>{isEditing ? 'Editar Servicio' : 'Crear Nuevo Servicio'}</DialogTitle>
                 <DialogDescriptionComponent>
                    {isEditing ? 'Actualice los detalles del servicio.' : 'Complete los detalles para crear un nuevo servicio.'}
                </DialogDescriptionComponent>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre del Servicio</Label>
                    <Input id="nombre" value={currentServicio.nombre} onChange={e => handleInputChange('nombre', e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripción (Opcional)</Label>
                    <Textarea id="descripcion" value={currentServicio.descripcion} onChange={e => handleInputChange('descripcion', e.target.value)} />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="precio">Precio</Label>
                        <Input id="precio" type="number" value={currentServicio.precio} onChange={e => handleInputChange('precio', Number(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="iva_tipo">Tipo de IVA (%)</Label>
                        <Combobox
                        options={[{ value: "10", label: '10%' }, { value: "5", label: '5%' }, { value: "0", label: 'Exento' }]}
                        value={String(currentServicio.iva_tipo)}
                        onChange={(value) => handleInputChange('iva_tipo', parseInt(value))}
                        placeholder="Seleccione tipo de IVA"
                        />
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
                <Button onClick={handleSubmit}>{isEditing ? 'Guardar Cambios' : 'Crear Servicio'}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

