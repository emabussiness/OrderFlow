
"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle, Trash2, Edit, Landmark } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescriptionComponent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Banco = {
  id: string;
  nombre: string;
};

const initialBancoState: Omit<Banco, 'id'> = {
    nombre: "",
};

export default function BancosPage() {
  const { toast } = useToast();
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBanco, setCurrentBanco] = useState<Omit<Banco, 'id'>>(initialBancoState);
  const [currentBancoId, setCurrentBancoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchBancos = async () => {
    setLoading(true);
    try {
      const bancosCollection = collection(db, 'bancos');
      const q = query(bancosCollection, orderBy("nombre", "asc"));
      const bancosSnapshot = await getDocs(q);
      const bancosList = bancosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banco));
      setBancos(bancosList);
    } catch (error) {
      console.error("Error fetching banks: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los bancos." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBancos();
  }, [toast]);
  
  const filteredBancos = useMemo(() => {
    return bancos.filter(banco =>
      banco.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [bancos, searchTerm]);


  const handleOpenDialog = (banco: Banco | null = null) => {
    if (banco) {
      setIsEditing(true);
      setCurrentBancoId(banco.id);
      setCurrentBanco({ nombre: banco.nombre });
    } else {
      setIsEditing(false);
      setCurrentBanco(initialBancoState);
      setCurrentBancoId(null);
    }
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setIsEditing(false);
    setCurrentBanco(initialBancoState);
    setCurrentBancoId(null);
  }

  const handleSubmit = async () => {
    const trimmedName = currentBanco.nombre.trim();
    if (!trimmedName) {
        toast({ variant: 'destructive', title: 'Error de validación', description: 'El nombre es requerido.'});
        return;
    }

    // Case-insensitive duplicate check
    const isDuplicate = bancos.some(banco => 
        banco.nombre.toLowerCase() === trimmedName.toLowerCase() && banco.id !== currentBancoId
    );

    if (isDuplicate) {
        toast({ variant: 'destructive', title: 'Banco duplicado', description: `Ya existe un banco con el nombre "${trimmedName}".`});
        return;
    }


    try {
        const dataToSave = { nombre: trimmedName };
        if(isEditing && currentBancoId) {
            const bancoRef = doc(db, 'bancos', currentBancoId);
            await updateDoc(bancoRef, dataToSave);
            toast({ title: 'Banco Actualizado', description: 'El banco ha sido actualizado exitosamente.'});
        } else {
            await addDoc(collection(db, 'bancos'), dataToSave);
            toast({ title: 'Banco Creado', description: 'El nuevo banco ha sido creado exitosamente.'});
        }
        await fetchBancos();
        handleCloseDialog();
    } catch (error) {
        console.error("Error saving bank: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el banco.'});
    }
  }

  const handleDelete = async (bancoId: string) => {
      try {
          await deleteDoc(doc(db, 'bancos', bancoId));
          toast({ title: 'Banco Eliminado', description: 'El banco ha sido eliminado.', variant: 'destructive' });
          await fetchBancos();
      } catch (error) {
          console.error("Error deleting bank: ", error);
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el banco.'});
      }
  }

  if (loading) return <p>Cargando bancos...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Bancos</h1>
        <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4"/>Crear Banco</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Bancos</CardTitle>
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
              {filteredBancos.map((banco) => (
                <TableRow key={banco.id}>
                  <TableCell className="font-medium">{banco.nombre}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(banco)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 hover:text-red-500 focus:text-red-500"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                                <AlertDialogDescriptionComponent>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente el banco.
                                </AlertDialogDescriptionComponent>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(banco.id)} className="bg-destructive hover:bg-destructive/90">Confirmar</AlertDialogAction>
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
           {filteredBancos.length === 0 && <p className="text-center text-muted-foreground mt-4">No hay bancos registrados.</p>}
        </CardContent>
      </Card>
      
      <Dialog open={openDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{isEditing ? 'Editar Banco' : 'Crear Nuevo Banco'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre del Banco</Label>
                    <Input id="nombre" value={currentBanco.nombre} onChange={e => setCurrentBanco({ ...currentBanco, nombre: e.target.value })} />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
                <Button onClick={handleSubmit}>{isEditing ? 'Guardar Cambios' : 'Crear Banco'}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
