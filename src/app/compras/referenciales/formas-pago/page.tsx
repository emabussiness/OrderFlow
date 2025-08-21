
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
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
import { Textarea } from "@/components/ui/textarea";

type FormaPago = {
  id: string;
  nombre: string;
  descripcion?: string;
};

const initialFormaPagoState: Omit<FormaPago, 'id'> = {
    nombre: "",
    descripcion: "",
};

export default function FormasPagoPage() {
  const { toast } = useToast();
  const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentFormaPago, setCurrentFormaPago] = useState<Omit<FormaPago, 'id'>>(initialFormaPagoState);
  const [currentFormaPagoId, setCurrentFormaPagoId] = useState<string | null>(null);

  const fetchFormasPago = async () => {
    setLoading(true);
    try {
      const formasPagoCollection = collection(db, 'formas_pago');
      const q = query(formasPagoCollection, orderBy("nombre", "asc"));
      const formasPagoSnapshot = await getDocs(q);
      const formasPagoList = formasPagoSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FormaPago));
      setFormasPago(formasPagoList);
    } catch (error) {
      console.error("Error fetching payment methods: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las formas de pago." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormasPago();
  }, []);

  const handleOpenDialog = (formaPago: FormaPago | null = null) => {
    if (formaPago) {
      setIsEditing(true);
      setCurrentFormaPagoId(formaPago.id);
      setCurrentFormaPago({ nombre: formaPago.nombre, descripcion: formaPago.descripcion });
    } else {
      setIsEditing(false);
      setCurrentFormaPago(initialFormaPagoState);
      setCurrentFormaPagoId(null);
    }
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setIsEditing(false);
    setCurrentFormaPago(initialFormaPagoState);
    setCurrentFormaPagoId(null);
  }

  const handleInputChange = (field: keyof Omit<FormaPago, 'id'>, value: string) => {
    setCurrentFormaPago(prev => ({ ...prev, [field]: value }));
  }

  const handleSubmit = async () => {
    const trimmedName = currentFormaPago.nombre.trim();
    if (!trimmedName) {
        toast({ variant: 'destructive', title: 'Error de validación', description: 'El nombre es requerido.'});
        return;
    }
    
    // Case-insensitive duplicate check
    const isDuplicate = formasPago.some(fp => 
        fp.nombre.toLowerCase() === trimmedName.toLowerCase() && fp.id !== currentFormaPagoId
    );

    if (isDuplicate) {
        toast({ variant: 'destructive', title: 'Nombre duplicado', description: `Ya existe una forma de pago con el nombre "${trimmedName}".`});
        return;
    }

    try {
        const dataToSave = {
            ...currentFormaPago,
            nombre: trimmedName,
        };

        if(isEditing && currentFormaPagoId) {
            const formaPagoRef = doc(db, 'formas_pago', currentFormaPagoId);
            await updateDoc(formaPagoRef, dataToSave);
            toast({ title: 'Forma de Pago Actualizada', description: 'La forma de pago ha sido actualizada exitosamente.'});
        } else {
            await addDoc(collection(db, 'formas_pago'), dataToSave);
            toast({ title: 'Forma de Pago Creada', description: 'La nueva forma de pago ha sido creada exitosamente.'});
        }
        await fetchFormasPago();
        handleCloseDialog();
    } catch (error) {
        console.error("Error saving payment method: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la forma de pago.'});
    }
  }

  const handleDelete = async (formaPagoId: string) => {
      try {
          await deleteDoc(doc(db, 'formas_pago', formaPagoId));
          toast({ title: 'Forma de Pago Eliminada', description: 'La forma de pago ha sido eliminada.', variant: 'destructive' });
          await fetchFormasPago();
      } catch (error) {
          console.error("Error deleting payment method: ", error);
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la forma de pago.'});
      }
  }

  if (loading) return <p>Cargando formas de pago...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Formas de Pago</h1>
        <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4"/>Crear Forma de Pago</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Formas de Pago</CardTitle>
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
              {formasPago.map((forma) => (
                <TableRow key={forma.id}>
                  <TableCell className="font-medium">{forma.nombre}</TableCell>
                  <TableCell>{forma.descripcion || 'N/A'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(forma)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 hover:text-red-500 focus:text-red-500"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente la forma de pago.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(forma.id)} className="bg-destructive hover:bg-destructive/90">Confirmar</AlertDialogAction>
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
           {formasPago.length === 0 && <p className="text-center text-muted-foreground mt-4">No hay formas de pago registradas.</p>}
        </CardContent>
      </Card>
      
      <Dialog open={openDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>{isEditing ? 'Editar Forma de Pago' : 'Crear Nueva Forma de Pago'}</DialogTitle>
                 <DialogDescription>
                    {isEditing ? 'Actualice los detalles de la forma de pago.' : 'Complete los detalles para crear una nueva forma de pago.'}
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input id="nombre" value={currentFormaPago.nombre} onChange={e => handleInputChange('nombre', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea id="descripcion" value={currentFormaPago.descripcion} onChange={e => handleInputChange('descripcion', e.target.value)} />
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
