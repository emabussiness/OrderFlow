
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where, orderBy } from "firebase/firestore";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Tecnico = {
  id: string;
  nombre_apellido: string;
  especialidad?: string;
  contacto?: string;
};

const initialTecnicoState: Omit<Tecnico, 'id'> = {
    nombre_apellido: "",
    especialidad: "",
    contacto: "",
};

export default function TecnicosPage() {
  const { toast } = useToast();
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTecnico, setCurrentTecnico] = useState<Omit<Tecnico, 'id'>>(initialTecnicoState);
  const [currentTecnicoId, setCurrentTecnicoId] = useState<string | null>(null);

  const fetchTecnicos = async () => {
    setLoading(true);
    try {
      const tecnicosCollection = collection(db, 'tecnicos');
      const q = query(tecnicosCollection, orderBy("nombre_apellido", "asc"));
      const tecnicosSnapshot = await getDocs(q);
      const tecnicosList = tecnicosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tecnico));
      setTecnicos(tecnicosList);
    } catch (error) {
      console.error("Error fetching tecnicos: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los técnicos." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTecnicos();
  }, [toast]);

  const handleOpenDialog = (tecnico: Tecnico | null = null) => {
    if (tecnico) {
      setIsEditing(true);
      setCurrentTecnicoId(tecnico.id);
      setCurrentTecnico({ 
          nombre_apellido: tecnico.nombre_apellido,
          especialidad: tecnico.especialidad,
          contacto: tecnico.contacto,
       });
    } else {
      setIsEditing(false);
      setCurrentTecnico(initialTecnicoState);
      setCurrentTecnicoId(null);
    }
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setIsEditing(false);
    setCurrentTecnico(initialTecnicoState);
    setCurrentTecnicoId(null);
  }

  const handleInputChange = (field: keyof Omit<Tecnico, 'id'>, value: string) => {
      setCurrentTecnico(prev => ({...prev, [field]: value}));
  }

  const handleSubmit = async () => {
    if (!currentTecnico.nombre_apellido) {
        toast({ variant: 'destructive', title: 'Error de validación', description: 'El nombre y apellido son requeridos.'});
        return;
    }
    
    // Check for duplicates
    const q = query(collection(db, 'tecnicos'), where("nombre_apellido", "==", currentTecnico.nombre_apellido));
    const snapshot = await getDocs(q);
    if(!snapshot.empty) {
        let isDuplicate = false;
        if (isEditing && currentTecnicoId) {
            if (snapshot.docs[0].id !== currentTecnicoId) {
                isDuplicate = true;
            }
        } else {
            isDuplicate = true;
        }

        if (isDuplicate) {
            toast({ variant: 'destructive', title: 'Técnico duplicado', description: `Ya existe un técnico con el nombre ${currentTecnico.nombre_apellido}.`});
            return;
        }
    }


    try {
        if(isEditing && currentTecnicoId) {
            const tecnicoRef = doc(db, 'tecnicos', currentTecnicoId);
            await updateDoc(tecnicoRef, currentTecnico);
            toast({ title: 'Técnico Actualizado', description: 'El técnico ha sido actualizado exitosamente.'});
        } else {
            await addDoc(collection(db, 'tecnicos'), currentTecnico);
            toast({ title: 'Técnico Creado', description: 'El nuevo técnico ha sido creado exitosamente.'});
        }
        await fetchTecnicos();
        handleCloseDialog();
    } catch (error) {
        console.error("Error saving tecnico: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el técnico.'});
    }
  }

  const handleDelete = async (tecnicoId: string) => {
      try {
          await deleteDoc(doc(db, 'tecnicos', tecnicoId));
          toast({ title: 'Técnico Eliminado', description: 'El técnico ha sido eliminado.', variant: 'destructive' });
          await fetchTecnicos();
      } catch (error) {
          console.error("Error deleting tecnico: ", error);
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el técnico.'});
      }
  }

  if (loading) return <p>Cargando técnicos...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Técnicos</h1>
        <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4"/>Crear Técnico</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Técnicos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre y Apellido</TableHead>
                <TableHead>Especialidad</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tecnicos.map((tecnico) => (
                <TableRow key={tecnico.id}>
                  <TableCell className="font-medium">{tecnico.nombre_apellido}</TableCell>
                   <TableCell>{tecnico.especialidad || 'N/A'}</TableCell>
                  <TableCell>{tecnico.contacto || 'N/A'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(tecnico)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 hover:text-red-500 focus:text-red-500"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente al técnico.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(tecnico.id)} className="bg-destructive hover:bg-destructive/90">Confirmar</AlertDialogAction>
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
           {tecnicos.length === 0 && <p className="text-center text-muted-foreground mt-4">No hay técnicos registrados.</p>}
        </CardContent>
      </Card>
      
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>{isEditing ? 'Editar Técnico' : 'Crear Nuevo Técnico'}</DialogTitle>
                 <DialogDescription>
                    {isEditing ? 'Actualice los detalles del técnico.' : 'Complete los detalles para crear un nuevo técnico.'}
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="nombre_apellido">Nombre y Apellido</Label>
                    <Input id="nombre_apellido" value={currentTecnico.nombre_apellido} onChange={e => handleInputChange('nombre_apellido', e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="especialidad">Especialidad</Label>
                    <Input id="especialidad" value={currentTecnico.especialidad} onChange={e => handleInputChange('especialidad', e.target.value)} placeholder="Ej: Hardware, Software, Redes..."/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="contacto">Contacto (Teléfono/Email)</Label>
                    <Input id="contacto" value={currentTecnico.contacto} onChange={e => handleInputChange('contacto', e.target.value)} />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
                <Button onClick={handleSubmit}>{isEditing ? 'Guardar Cambios' : 'Crear Técnico'}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
