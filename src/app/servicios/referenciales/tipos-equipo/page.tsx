
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

type TipoEquipo = {
  id: string;
  nombre: string;
  descripcion?: string;
};

const initialTipoEquipoState: Omit<TipoEquipo, 'id'> = {
    nombre: "",
    descripcion: "",
};

export default function TiposEquipoPage() {
  const { toast } = useToast();
  const [tiposEquipo, setTiposEquipo] = useState<TipoEquipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTipoEquipo, setCurrentTipoEquipo] = useState<Omit<TipoEquipo, 'id'>>(initialTipoEquipoState);
  const [currentTipoEquipoId, setCurrentTipoEquipoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchTiposEquipo = async () => {
    setLoading(true);
    try {
      const tiposEquipoCollection = collection(db, 'tipos_equipo');
      const q = query(tiposEquipoCollection, orderBy("nombre", "asc"));
      const tiposEquipoSnapshot = await getDocs(q);
      const tiposEquipoList = tiposEquipoSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TipoEquipo));
      setTiposEquipo(tiposEquipoList);
    } catch (error) {
      console.error("Error fetching tipos de equipo: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los tipos de equipo." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTiposEquipo();
  }, [toast]);
  
  const filteredTiposEquipo = useMemo(() => {
    return tiposEquipo.filter(tipo =>
      tipo.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tiposEquipo, searchTerm]);


  const handleOpenDialog = (tipo: TipoEquipo | null = null) => {
    if (tipo) {
      setIsEditing(true);
      setCurrentTipoEquipoId(tipo.id);
      setCurrentTipoEquipo({ nombre: tipo.nombre, descripcion: tipo.descripcion });
    } else {
      setIsEditing(false);
      setCurrentTipoEquipo(initialTipoEquipoState);
      setCurrentTipoEquipoId(null);
    }
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setIsEditing(false);
    setCurrentTipoEquipo(initialTipoEquipoState);
    setCurrentTipoEquipoId(null);
  }

  const handleInputChange = (field: keyof Omit<TipoEquipo, 'id'>, value: string) => {
    setCurrentTipoEquipo(prev => ({ ...prev, [field]: value }));
  }

  const handleSubmit = async () => {
    const trimmedName = currentTipoEquipo.nombre.trim();
    if (!trimmedName) {
        toast({ variant: 'destructive', title: 'Error de validación', description: 'El nombre es requerido.'});
        return;
    }

    // Case-insensitive duplicate check
    const isDuplicate = tiposEquipo.some(t => 
        t.nombre.toLowerCase() === trimmedName.toLowerCase() && t.id !== currentTipoEquipoId
    );

    if (isDuplicate) {
        toast({ variant: 'destructive', title: 'Tipo de Equipo duplicado', description: `Ya existe un tipo de equipo con el nombre "${trimmedName}".`});
        return;
    }

    try {
        const dataToSave = {
            ...currentTipoEquipo,
            nombre: trimmedName
        };

        if(isEditing && currentTipoEquipoId) {
            const tipoEquipoRef = doc(db, 'tipos_equipo', currentTipoEquipoId);
            await updateDoc(tipoEquipoRef, dataToSave);
            toast({ title: 'Tipo de Equipo Actualizado', description: 'El tipo de equipo ha sido actualizado exitosamente.'});
        } else {
            await addDoc(collection(db, 'tipos_equipo'), dataToSave);
            toast({ title: 'Tipo de Equipo Creado', description: 'El nuevo tipo de equipo ha sido creado exitosamente.'});
        }
        await fetchTiposEquipo();
        handleCloseDialog();
    } catch (error) {
        console.error("Error saving tipo de equipo: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el tipo de equipo.'});
    }
  }

  const handleDelete = async (tipoEquipoId: string) => {
      try {
          await deleteDoc(doc(db, 'tipos_equipo', tipoEquipoId));
          toast({ title: 'Tipo de Equipo Eliminado', description: 'El tipo de equipo ha sido eliminado.', variant: 'destructive' });
          await fetchTiposEquipo();
      } catch (error) {
          console.error("Error deleting tipo de equipo: ", error);
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el tipo de equipo.'});
      }
  }

  if (loading) return <p>Cargando tipos de equipo...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Tipos de Equipo</h1>
        <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4"/>Crear Tipo de Equipo</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Tipos de Equipo</CardTitle>
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
                <TableHead>Descripción</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTiposEquipo.map((tipo) => (
                <TableRow key={tipo.id}>
                  <TableCell className="font-medium">{tipo.nombre}</TableCell>
                  <TableCell>{tipo.descripcion || 'N/A'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(tipo)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 hover:text-red-500 focus:text-red-500"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente el tipo de equipo.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(tipo.id)} className="bg-destructive hover:bg-destructive/90">Confirmar</AlertDialogAction>
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
           {filteredTiposEquipo.length === 0 && <p className="text-center text-muted-foreground mt-4">No se encontraron tipos de equipo.</p>}
        </CardContent>
      </Card>
      
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>{isEditing ? 'Editar Tipo de Equipo' : 'Crear Nuevo Tipo de Equipo'}</DialogTitle>
                 <DialogDescriptionComponent>
                    {isEditing ? 'Actualice los detalles del tipo de equipo.' : 'Añada un nuevo tipo de equipo al sistema.'}
                </DialogDescriptionComponent>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input id="nombre" value={currentTipoEquipo.nombre} onChange={e => handleInputChange('nombre', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea id="descripcion" value={currentTipoEquipo.descripcion} onChange={e => handleInputChange('descripcion', e.target.value)} />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
                <Button onClick={handleSubmit}>{isEditing ? 'Guardar Cambios' : 'Crear'}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
