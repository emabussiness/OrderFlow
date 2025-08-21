
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

type Marca = {
  id: string;
  nombre: string;
};

const initialMarcaState: Omit<Marca, 'id'> = {
    nombre: "",
};

export default function MarcasPage() {
  const { toast } = useToast();
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentMarca, setCurrentMarca] = useState<Omit<Marca, 'id'>>(initialMarcaState);
  const [currentMarcaId, setCurrentMarcaId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchMarcas = async () => {
    setLoading(true);
    try {
      const marcasCollection = collection(db, 'marcas');
      const q = query(marcasCollection, orderBy("nombre", "asc"));
      const marcasSnapshot = await getDocs(q);
      const marcasList = marcasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Marca));
      setMarcas(marcasList);
    } catch (error) {
      console.error("Error fetching marcas: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las marcas." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarcas();
  }, [toast]);
  
  const filteredMarcas = useMemo(() => {
    return marcas.filter(marca =>
      marca.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [marcas, searchTerm]);


  const handleOpenDialog = (marca: Marca | null = null) => {
    if (marca) {
      setIsEditing(true);
      setCurrentMarcaId(marca.id);
      setCurrentMarca({ nombre: marca.nombre });
    } else {
      setIsEditing(false);
      setCurrentMarca(initialMarcaState);
      setCurrentMarcaId(null);
    }
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setIsEditing(false);
    setCurrentMarca(initialMarcaState);
    setCurrentMarcaId(null);
  }

  const handleSubmit = async () => {
    const trimmedName = currentMarca.nombre.trim();
    if (!trimmedName) {
        toast({ variant: 'destructive', title: 'Error de validación', description: 'El nombre es requerido.'});
        return;
    }

    // Case-insensitive duplicate check
    const isDuplicate = marcas.some(m => 
        m.nombre.toLowerCase() === trimmedName.toLowerCase() && m.id !== currentMarcaId
    );

    if (isDuplicate) {
        toast({ variant: 'destructive', title: 'Marca duplicada', description: `Ya existe una marca con el nombre "${trimmedName}".`});
        return;
    }

    try {
        if(isEditing && currentMarcaId) {
            const marcaRef = doc(db, 'marcas', currentMarcaId);
            await updateDoc(marcaRef, { nombre: trimmedName });
            toast({ title: 'Marca Actualizada', description: 'La marca ha sido actualizada exitosamente.'});
        } else {
            await addDoc(collection(db, 'marcas'), { nombre: trimmedName });
            toast({ title: 'Marca Creada', description: 'La nueva marca ha sido creada exitosamente.'});
        }
        await fetchMarcas();
        handleCloseDialog();
    } catch (error) {
        console.error("Error saving marca: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la marca.'});
    }
  }

  const handleDelete = async (marcaId: string) => {
      try {
          await deleteDoc(doc(db, 'marcas', marcaId));
          toast({ title: 'Marca Eliminada', description: 'La marca ha sido eliminada.', variant: 'destructive' });
          await fetchMarcas();
      } catch (error) {
          console.error("Error deleting marca: ", error);
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la marca.'});
      }
  }

  if (loading) return <p>Cargando marcas...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Marcas de Equipos</h1>
        <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4"/>Crear Marca</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Marcas</CardTitle>
          <CardDescription>
            <Input 
              placeholder="Buscar por nombre..."
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
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMarcas.map((marca) => (
                <TableRow key={marca.id}>
                  <TableCell className="font-medium">{marca.nombre}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(marca)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 hover:text-red-500 focus:text-red-500"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente la marca.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(marca.id)} className="bg-destructive hover:bg-destructive/90">Confirmar</AlertDialogAction>
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
           {filteredMarcas.length === 0 && <p className="text-center text-muted-foreground mt-4">No se encontraron marcas.</p>}
        </CardContent>
      </Card>
      
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{isEditing ? 'Editar Marca' : 'Crear Nueva Marca'}</DialogTitle>
                <DialogDescriptionComponent>
                  {isEditing ? 'Actualice el nombre de la marca.' : 'Añada una nueva marca al sistema.'}
                </DialogDescriptionComponent>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre de la Marca</Label>
                    <Input id="nombre" value={currentMarca.nombre} onChange={e => setCurrentMarca({ ...currentMarca, nombre: e.target.value })} />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
                <Button onClick={handleSubmit}>{isEditing ? 'Guardar Cambios' : 'Crear Marca'}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
