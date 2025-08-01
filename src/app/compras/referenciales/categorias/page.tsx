
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle, Trash2, Edit } from "lucide-react";
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

type Categoria = {
  id: string;
  nombre: string;
};

const initialCategoriaState: Omit<Categoria, 'id'> = {
    nombre: "",
};

export default function CategoriasPage() {
  const { toast } = useToast();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategoria, setCurrentCategoria] = useState<Omit<Categoria, 'id'>>(initialCategoriaState);
  const [currentCategoriaId, setCurrentCategoriaId] = useState<string | null>(null);

  const fetchCategorias = async () => {
    setLoading(true);
    try {
      const categoriasCollection = collection(db, 'categorias_productos');
      const q = query(categoriasCollection, orderBy("nombre", "asc"));
      const categoriasSnapshot = await getDocs(q);
      const categoriasList = categoriasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Categoria));
      setCategorias(categoriasList);
    } catch (error) {
      console.error("Error fetching categorias: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las categorías." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  const handleOpenDialog = (categoria: Categoria | null = null) => {
    if (categoria) {
      setIsEditing(true);
      setCurrentCategoriaId(categoria.id);
      setCurrentCategoria({ nombre: categoria.nombre });
    } else {
      setIsEditing(false);
      setCurrentCategoria(initialCategoriaState);
      setCurrentCategoriaId(null);
    }
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setIsEditing(false);
    setCurrentCategoria(initialCategoriaState);
    setCurrentCategoriaId(null);
  }

  const handleSubmit = async () => {
    if (!currentCategoria.nombre) {
        toast({ variant: 'destructive', title: 'Error de validación', description: 'El nombre es requerido.'});
        return;
    }

    try {
        if(isEditing && currentCategoriaId) {
            const categoriaRef = doc(db, 'categorias_productos', currentCategoriaId);
            await updateDoc(categoriaRef, currentCategoria);
            toast({ title: 'Categoría Actualizada', description: 'La categoría ha sido actualizada exitosamente.'});
        } else {
            await addDoc(collection(db, 'categorias_productos'), currentCategoria);
            toast({ title: 'Categoría Creada', description: 'La nueva categoría ha sido creada exitosamente.'});
        }
        await fetchCategorias();
        handleCloseDialog();
    } catch (error) {
        console.error("Error saving categoria: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la categoría.'});
    }
  }

  const handleDelete = async (categoriaId: string) => {
      try {
          await deleteDoc(doc(db, 'categorias_productos', categoriaId));
          toast({ title: 'Categoría Eliminada', description: 'La categoría ha sido eliminada.', variant: 'destructive' });
          await fetchCategorias();
      } catch (error) {
          console.error("Error deleting categoria: ", error);
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la categoría.'});
      }
  }

  if (loading) return <p>Cargando categorías...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Categorías</h1>
        <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4"/>Crear Categoría</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Categorías</CardTitle>
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
              {categorias.map((categoria) => (
                <TableRow key={categoria.id}>
                  <TableCell className="font-medium">{categoria.nombre}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(categoria)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 hover:text-red-500 focus:text-red-500"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente la categoría.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(categoria.id)} className="bg-destructive hover:bg-destructive/90">Confirmar</AlertDialogAction>
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
           {categorias.length === 0 && <p className="text-center text-muted-foreground mt-4">No hay categorías registradas.</p>}
        </CardContent>
      </Card>
      
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{isEditing ? 'Editar Categoría' : 'Crear Nueva Categoría'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre de la Categoría</Label>
                    <Input id="nombre" value={currentCategoria.nombre} onChange={e => setCurrentCategoria({ nombre: e.target.value })} />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
                <Button onClick={handleSubmit}>{isEditing ? 'Guardar Cambios' : 'Crear Categoría'}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
