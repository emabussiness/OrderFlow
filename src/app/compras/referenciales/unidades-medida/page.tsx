
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

type UnidadMedida = {
  id: string;
  nombre: string;
  simbolo: string;
};

const initialUnidadState: Omit<UnidadMedida, 'id'> = {
    nombre: "",
    simbolo: "",
};

export default function UnidadesMedidaPage() {
  const { toast } = useToast();
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUnidad, setCurrentUnidad] = useState<Omit<UnidadMedida, 'id'>>(initialUnidadState);
  const [currentUnidadId, setCurrentUnidadId] = useState<string | null>(null);

  const fetchUnidades = async () => {
    setLoading(true);
    try {
      const unidadesCollection = collection(db, 'unidades_medida');
      const q = query(unidadesCollection, orderBy("nombre", "asc"));
      const unidadesSnapshot = await getDocs(q);
      const unidadesList = unidadesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UnidadMedida));
      setUnidades(unidadesList);
    } catch (error) {
      console.error("Error fetching unidades: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las unidades de medida." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnidades();
  }, []);

  const handleOpenDialog = (unidad: UnidadMedida | null = null) => {
    if (unidad) {
      setIsEditing(true);
      setCurrentUnidadId(unidad.id);
      setCurrentUnidad({ nombre: unidad.nombre, simbolo: unidad.simbolo });
    } else {
      setIsEditing(false);
      setCurrentUnidad(initialUnidadState);
      setCurrentUnidadId(null);
    }
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setIsEditing(false);
    setCurrentUnidad(initialUnidadState);
    setCurrentUnidadId(null);
  }

  const handleInputChange = (field: keyof Omit<UnidadMedida, 'id'>, value: any) => {
      setCurrentUnidad(prev => ({...prev, [field]: value}));
  }

  const handleSubmit = async () => {
    if (!currentUnidad.nombre || !currentUnidad.simbolo) {
        toast({ variant: 'destructive', title: 'Error de validación', description: 'Nombre y símbolo son requeridos.'});
        return;
    }

    try {
        if(isEditing && currentUnidadId) {
            const unidadRef = doc(db, 'unidades_medida', currentUnidadId);
            await updateDoc(unidadRef, currentUnidad);
            toast({ title: 'Unidad Actualizada', description: 'La unidad de medida ha sido actualizada exitosamente.'});
        } else {
            await addDoc(collection(db, 'unidades_medida'), currentUnidad);
            toast({ title: 'Unidad Creada', description: 'La nueva unidad de medida ha sido creada exitosamente.'});
        }
        await fetchUnidades();
        handleCloseDialog();
    } catch (error) {
        console.error("Error saving unidad: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la unidad de medida.'});
    }
  }

  const handleDelete = async (unidadId: string) => {
      try {
          await deleteDoc(doc(db, 'unidades_medida', unidadId));
          toast({ title: 'Unidad Eliminada', description: 'La unidad de medida ha sido eliminada.', variant: 'destructive' });
          await fetchUnidades();
      } catch (error) {
          console.error("Error deleting unidad: ", error);
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la unidad de medida.'});
      }
  }

  if (loading) return <p>Cargando unidades de medida...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Unidades de Medida</h1>
        <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4"/>Crear Unidad</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Unidades de Medida</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Símbolo</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unidades.map((unidad) => (
                <TableRow key={unidad.id}>
                  <TableCell className="font-medium">{unidad.nombre}</TableCell>
                  <TableCell>{unidad.simbolo}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(unidad)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 hover:text-red-500 focus:text-red-500"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente la unidad de medida.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(unidad.id)} className="bg-destructive hover:bg-destructive/90">Confirmar</AlertDialogAction>
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
           {unidades.length === 0 && <p className="text-center text-muted-foreground mt-4">No hay unidades registradas.</p>}
        </CardContent>
      </Card>
      
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{isEditing ? 'Editar Unidad de Medida' : 'Crear Nueva Unidad de Medida'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre de la Unidad</Label>
                    <Input id="nombre" value={currentUnidad.nombre} onChange={e => handleInputChange('nombre', e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="simbolo">Símbolo</Label>
                    <Input id="simbolo" value={currentUnidad.simbolo} onChange={e => handleInputChange('simbolo', e.target.value)} />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
                <Button onClick={handleSubmit}>{isEditing ? 'Guardar Cambios' : 'Crear Unidad'}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
