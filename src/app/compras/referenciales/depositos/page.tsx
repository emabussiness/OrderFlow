
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescriptionComponent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/command";

type Sucursal = {
  id: string;
  nombre: string;
};

type Deposito = {
  id: string;
  nombre: string;
  direccion?: string;
  sucursal_id: string;
};

const initialDepositoState: Omit<Deposito, 'id'> = {
    nombre: "",
    direccion: "",
    sucursal_id: "",
};

export default function DepositosPage() {
  const { toast } = useToast();
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDeposito, setCurrentDeposito] = useState<Omit<Deposito, 'id'>>(initialDepositoState);
  const [currentDepositoId, setCurrentDepositoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const sucursalesCollection = collection(db, 'sucursales');
      const qSucursales = query(sucursalesCollection, orderBy("nombre", "asc"));
      const sucursalesSnapshot = await getDocs(qSucursales);
      const sucursalesList = sucursalesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sucursal));
      setSucursales(sucursalesList);

      const depositosCollection = collection(db, 'depositos');
      const qDepositos = query(depositosCollection, orderBy("nombre", "asc"));
      const depositosSnapshot = await getDocs(qDepositos);
      const depositosList = depositosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Deposito));
      setDepositos(depositosList);

    } catch (error) {
      console.error("Error fetching data: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [toast]);
  
  const filteredDepositos = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const sucursalesMap = new Map(sucursales.map(s => [s.id, s.nombre]));

    return depositos.filter(deposito =>
        deposito.nombre.toLowerCase().includes(term) ||
        (deposito.direccion && deposito.direccion.toLowerCase().includes(term)) ||
        sucursalesMap.get(deposito.sucursal_id)?.toLowerCase().includes(term)
    );
  }, [depositos, searchTerm, sucursales]);


  const handleOpenDialog = (deposito: Deposito | null = null) => {
    if (deposito) {
      setIsEditing(true);
      setCurrentDepositoId(deposito.id);
      setCurrentDeposito({ 
          nombre: deposito.nombre,
          direccion: deposito.direccion,
          sucursal_id: deposito.sucursal_id,
       });
    } else {
      setIsEditing(false);
      setCurrentDeposito(initialDepositoState);
      setCurrentDepositoId(null);
    }
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setIsEditing(false);
    setCurrentDeposito(initialDepositoState);
    setCurrentDepositoId(null);
  }

  const handleInputChange = (field: keyof Omit<Deposito, 'id'>, value: string) => {
      setCurrentDeposito(prev => ({...prev, [field]: value}));
  }

  const handleSubmit = async () => {
    const trimmedName = currentDeposito.nombre.trim();
    if (!trimmedName || !currentDeposito.sucursal_id) {
        toast({ variant: 'destructive', title: 'Error de validación', description: 'Nombre y sucursal son requeridos.'});
        return;
    }

    // Check for duplicates
    const isDuplicate = depositos.some(dep => 
        dep.nombre.toLowerCase() === trimmedName.toLowerCase() &&
        dep.sucursal_id === currentDeposito.sucursal_id &&
        dep.id !== currentDepositoId
    );

    if (isDuplicate) {
        toast({ variant: 'destructive', title: 'Depósito duplicado', description: `Ya existe un depósito con el nombre "${trimmedName}" en la sucursal seleccionada.`});
        return;
    }

    try {
        const depositoData = {
            ...currentDeposito,
            nombre: trimmedName,
        };
        if(isEditing && currentDepositoId) {
            const depositoRef = doc(db, 'depositos', currentDepositoId);
            await updateDoc(depositoRef, depositoData);
            toast({ title: 'Depósito Actualizado', description: 'El depósito ha sido actualizado exitosamente.'});
        } else {
            await addDoc(collection(db, 'depositos'), depositoData);
            toast({ title: 'Depósito Creado', description: 'El nuevo depósito ha sido creado exitosamente.'});
        }
        await fetchData();
        handleCloseDialog();
    } catch (error) {
        console.error("Error saving deposito: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el depósito.'});
    }
  }

  const handleDelete = async (depositoId: string) => {
      try {
          await deleteDoc(doc(db, 'depositos', depositoId));
          toast({ title: 'Depósito Eliminado', description: 'El depósito ha sido eliminado.', variant: 'destructive' });
          await fetchData();
      } catch (error) {
          console.error("Error deleting deposito: ", error);
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el depósito.'});
      }
  }

  if (loading) return <p>Cargando depósitos...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Depósitos</h1>
        <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4"/>Crear Depósito</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Depósitos</CardTitle>
          <CardDescription>
            <Input 
              placeholder="Buscar por nombre, dirección o sucursal..."
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
                <TableHead>Sucursal</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDepositos.map((deposito) => (
                <TableRow key={deposito.id}>
                  <TableCell className="font-medium">{deposito.nombre}</TableCell>
                   <TableCell>{deposito.direccion || 'N/A'}</TableCell>
                   <TableCell>{sucursales.find(s => s.id === deposito.sucursal_id)?.nombre || 'Desconocida'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(deposito)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 hover:text-red-500 focus:text-red-500"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                                <AlertDialogDescriptionComponent>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente el depósito.
                                </AlertDialogDescriptionComponent>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(deposito.id)} className="bg-destructive hover:bg-destructive/90">Confirmar</AlertDialogAction>
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
           {filteredDepositos.length === 0 && <p className="text-center text-muted-foreground mt-4">No hay depósitos registrados.</p>}
        </CardContent>
      </Card>
      
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>{isEditing ? 'Editar Depósito' : 'Crear Nuevo Depósito'}</DialogTitle>
                 <DialogDescription>
                    {isEditing ? 'Actualice los detalles del depósito.' : 'Complete los detalles para crear un nuevo depósito.'}
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input id="nombre" value={currentDeposito.nombre} onChange={e => handleInputChange('nombre', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="sucursal_id">Sucursal</Label>
                    <Combobox
                        options={sucursales.map(s => ({ value: s.id, label: s.nombre }))}
                        value={currentDeposito.sucursal_id}
                        onChange={(value) => handleInputChange('sucursal_id', value)}
                        placeholder="Seleccione una sucursal"
                        searchPlaceholder="Buscar sucursal..."
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="direccion">Dirección</Label>
                    <Textarea id="direccion" value={currentDeposito.direccion} onChange={e => handleInputChange('direccion', e.target.value)} />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
                <Button onClick={handleSubmit}>{isEditing ? 'Guardar Cambios' : 'Crear Depósito'}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

    
