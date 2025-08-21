
"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
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

type Sucursal = {
  id: string;
  nombre: string;
  direccion?: string;
};

const initialSucursalState: Omit<Sucursal, 'id'> = {
    nombre: "",
    direccion: "",
};

export default function SucursalesPage() {
  const { toast } = useToast();
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSucursal, setCurrentSucursal] = useState<Omit<Sucursal, 'id'>>(initialSucursalState);
  const [currentSucursalId, setCurrentSucursalId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchSucursales = async () => {
    setLoading(true);
    try {
      const sucursalesCollection = collection(db, 'sucursales');
      const q = query(sucursalesCollection, orderBy("nombre", "asc"));
      const sucursalesSnapshot = await getDocs(q);
      const sucursalesList = sucursalesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sucursal));
      setSucursales(sucursalesList);
    } catch (error) {
      console.error("Error fetching sucursales: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las sucursales." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSucursales();
  }, [toast]);
  
  const filteredSucursales = useMemo(() => {
    return sucursales.filter(sucursal =>
      sucursal.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sucursal.direccion && sucursal.direccion.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [sucursales, searchTerm]);

  const handleOpenDialog = (sucursal: Sucursal | null = null) => {
    if (sucursal) {
      setIsEditing(true);
      setCurrentSucursalId(sucursal.id);
      setCurrentSucursal({ 
          nombre: sucursal.nombre,
          direccion: sucursal.direccion,
       });
    } else {
      setIsEditing(false);
      setCurrentSucursal(initialSucursalState);
      setCurrentSucursalId(null);
    }
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setIsEditing(false);
    setCurrentSucursal(initialSucursalState);
    setCurrentSucursalId(null);
  }

  const handleInputChange = (field: keyof Omit<Sucursal, 'id'>, value: string) => {
      setCurrentSucursal(prev => ({...prev, [field]: value}));
  }

  const handleSubmit = async () => {
    const trimmedName = currentSucursal.nombre.trim();
    if (!trimmedName) {
        toast({ variant: 'destructive', title: 'Error de validación', description: 'El nombre es requerido.'});
        return;
    }

    const isDuplicate = sucursales.some(s => 
        s.nombre.toLowerCase() === trimmedName.toLowerCase() && s.id !== currentSucursalId
    );

    if (isDuplicate) {
        toast({ variant: 'destructive', title: 'Sucursal duplicada', description: `Ya existe una sucursal con el nombre "${trimmedName}".`});
        return;
    }

    try {
        const sucursalData = {
            ...currentSucursal,
            nombre: trimmedName,
        };
        if(isEditing && currentSucursalId) {
            const sucursalRef = doc(db, 'sucursales', currentSucursalId);
            await updateDoc(sucursalRef, sucursalData);
            toast({ title: 'Sucursal Actualizada', description: 'La sucursal ha sido actualizada exitosamente.'});
        } else {
            await addDoc(collection(db, 'sucursales'), sucursalData);
            toast({ title: 'Sucursal Creada', description: 'La nueva sucursal ha sido creada exitosamente.'});
        }
        await fetchSucursales();
        handleCloseDialog();
    } catch (error) {
        console.error("Error saving sucursal: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la sucursal.'});
    }
  }

  const handleDelete = async (sucursalId: string) => {
      try {
          await deleteDoc(doc(db, 'sucursales', sucursalId));
          toast({ title: 'Sucursal Eliminada', description: 'La sucursal ha sido eliminada.', variant: 'destructive' });
          await fetchSucursales();
      } catch (error) {
          console.error("Error deleting sucursal: ", error);
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la sucursal.'});
      }
  }

  if (loading) return <p>Cargando sucursales...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Sucursales</h1>
        <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4"/>Crear Sucursal</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Sucursales</CardTitle>
          <CardDescription>
            <Input 
              placeholder="Buscar por nombre o dirección..."
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
                <TableHead>Dirección</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSucursales.map((sucursal) => (
                <TableRow key={sucursal.id}>
                  <TableCell className="font-medium">{sucursal.nombre}</TableCell>
                   <TableCell>{sucursal.direccion || 'N/A'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(sucursal)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 hover:text-red-500 focus:text-red-500"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente la sucursal.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(sucursal.id)} className="bg-destructive hover:bg-destructive/90">Confirmar</AlertDialogAction>
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
           {filteredSucursales.length === 0 && <p className="text-center text-muted-foreground mt-4">No hay sucursales registradas.</p>}
        </CardContent>
      </Card>
      
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>{isEditing ? 'Editar Sucursal' : 'Crear Nueva Sucursal'}</DialogTitle>
                 <DialogDescriptionComponent>
                    {isEditing ? 'Actualice los detalles de la sucursal.' : 'Complete los detalles para crear una nueva sucursal.'}
                </DialogDescriptionComponent>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input id="nombre" value={currentSucursal.nombre} onChange={e => handleInputChange('nombre', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="direccion">Dirección</Label>
                    <Textarea id="direccion" value={currentSucursal.direccion} onChange={e => handleInputChange('direccion', e.target.value)} />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
                <Button onClick={handleSubmit}>{isEditing ? 'Guardar Cambios' : 'Crear Sucursal'}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
