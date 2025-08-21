
"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query, where, orderBy } from "firebase/firestore";
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

type Proveedor = {
  id: string;
  nombre: string;
  ruc: string;
  direccion?: string;
  telefono?: string;
  email?: string;
};

const initialProveedorState: Omit<Proveedor, 'id'> = {
    nombre: "",
    ruc: "",
    direccion: "",
    telefono: "",
    email: "",
};

export default function ProveedoresPage() {
  const { toast } = useToast();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProveedor, setCurrentProveedor] = useState<Omit<Proveedor, 'id'>>(initialProveedorState);
  const [currentProveedorId, setCurrentProveedorId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchProveedores = async () => {
    setLoading(true);
    try {
      const proveedoresCollection = collection(db, 'proveedores');
      const q = query(proveedoresCollection, orderBy("nombre", "asc"));
      const proveedoresSnapshot = await getDocs(q);
      const proveedoresList = proveedoresSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Proveedor));
      setProveedores(proveedoresList);
    } catch (error) {
      console.error("Error fetching proveedores: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los proveedores." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProveedores();
  }, []);
  
  const filteredProveedores = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return proveedores.filter(proveedor => 
      proveedor.nombre.toLowerCase().includes(term) ||
      proveedor.ruc.toLowerCase().includes(term) ||
      (proveedor.telefono && proveedor.telefono.toLowerCase().includes(term))
    );
  }, [proveedores, searchTerm]);

  const handleOpenDialog = (proveedor: Proveedor | null = null) => {
    if (proveedor) {
      setIsEditing(true);
      setCurrentProveedorId(proveedor.id);
      setCurrentProveedor({ 
          nombre: proveedor.nombre,
          ruc: proveedor.ruc,
          direccion: proveedor.direccion,
          telefono: proveedor.telefono,
          email: proveedor.email
       });
    } else {
      setIsEditing(false);
      setCurrentProveedor(initialProveedorState);
      setCurrentProveedorId(null);
    }
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setIsEditing(false);
    setCurrentProveedor(initialProveedorState);
    setCurrentProveedorId(null);
  }

  const handleInputChange = (field: keyof Omit<Proveedor, 'id'>, value: string) => {
      setCurrentProveedor(prev => ({...prev, [field]: value}));
  }

  const handleSubmit = async () => {
    const trimmedNombre = currentProveedor.nombre.trim();
    const trimmedRuc = currentProveedor.ruc.trim();

    if (!trimmedNombre || !trimmedRuc) {
        toast({ variant: 'destructive', title: 'Error de validación', description: 'Nombre y RUC son requeridos.'});
        return;
    }

    // Case-insensitive duplicate check for both name and RUC
    const isNameDuplicate = proveedores.some(p => 
        p.nombre.toLowerCase() === trimmedNombre.toLowerCase() && p.id !== currentProveedorId
    );
    const isRucDuplicate = proveedores.some(p => 
        p.ruc.toLowerCase() === trimmedRuc.toLowerCase() && p.id !== currentProveedorId
    );

    if (isNameDuplicate) {
        toast({ variant: 'destructive', title: 'Proveedor duplicado', description: `Ya existe un proveedor con el nombre "${trimmedNombre}".`});
        return;
    }
    if (isRucDuplicate) {
        toast({ variant: 'destructive', title: 'Proveedor duplicado', description: `Ya existe un proveedor con el RUC ${trimmedRuc}.`});
        return;
    }


    try {
        const proveedorData = {
            ...currentProveedor,
            nombre: trimmedNombre,
            ruc: trimmedRuc,
        };

        if(isEditing && currentProveedorId) {
            const proveedorRef = doc(db, 'proveedores', currentProveedorId);
            await updateDoc(proveedorRef, proveedorData);
            toast({ title: 'Proveedor Actualizado', description: 'El proveedor ha sido actualizado exitosamente.'});
        } else {
            await addDoc(collection(db, 'proveedores'), proveedorData);
            toast({ title: 'Proveedor Creado', description: 'El nuevo proveedor ha sido creado exitosamente.'});
        }
        await fetchProveedores();
        handleCloseDialog();
    } catch (error) {
        console.error("Error saving proveedor: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el proveedor.'});
    }
  }

  const handleDelete = async (proveedorId: string) => {
      try {
          await deleteDoc(doc(db, 'proveedores', proveedorId));
          toast({ title: 'Proveedor Eliminado', description: 'El proveedor ha sido eliminado.', variant: 'destructive' });
          await fetchProveedores();
      } catch (error) {
          console.error("Error deleting proveedor: ", error);
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el proveedor.'});
      }
  }

  if (loading) return <p>Cargando proveedores...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Proveedores</h1>
        <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4"/>Crear Proveedor</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Proveedores</CardTitle>
          <CardDescription>
            <Input 
              placeholder="Buscar por nombre, RUC o teléfono..."
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
                <TableHead>RUC</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProveedores.map((proveedor) => (
                <TableRow key={proveedor.id}>
                  <TableCell className="font-medium">{proveedor.nombre}</TableCell>
                   <TableCell>{proveedor.ruc}</TableCell>
                  <TableCell>{proveedor.telefono || 'N/A'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(proveedor)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 hover:text-red-500 focus:text-red-500"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente al proveedor.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(proveedor.id)} className="bg-destructive hover:bg-destructive/90">Confirmar</AlertDialogAction>
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
           {filteredProveedores.length === 0 && <p className="text-center text-muted-foreground mt-4">No hay proveedores registrados.</p>}
        </CardContent>
      </Card>
      
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>{isEditing ? 'Editar Proveedor' : 'Crear Nuevo Proveedor'}</DialogTitle>
                 <DialogDescriptionComponent>
                    {isEditing ? 'Actualice los detalles del proveedor.' : 'Complete los detalles para crear un nuevo proveedor.'}
                </DialogDescriptionComponent>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="nombre">Nombre</Label>
                        <Input id="nombre" value={currentProveedor.nombre} onChange={e => handleInputChange('nombre', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="ruc">RUC</Label>
                        <Input id="ruc" value={currentProveedor.ruc} onChange={e => handleInputChange('ruc', e.target.value)} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="direccion">Dirección</Label>
                    <Textarea id="direccion" value={currentProveedor.direccion} onChange={e => handleInputChange('direccion', e.target.value)} />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="telefono">Teléfono</Label>
                        <Input id="telefono" value={currentProveedor.telefono} onChange={e => handleInputChange('telefono', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={currentProveedor.email} onChange={e => handleInputChange('email', e.target.value)} />
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
                <Button onClick={handleSubmit}>{isEditing ? 'Guardar Cambios' : 'Crear Proveedor'}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
