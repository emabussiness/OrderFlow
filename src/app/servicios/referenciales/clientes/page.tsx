
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

type Cliente = {
  id: string;
  nombre: string;
  ruc_ci: string;
  direccion?: string;
  telefono?: string;
  email?: string;
};

const initialClienteState: Omit<Cliente, 'id'> = {
    nombre: "",
    ruc_ci: "",
    direccion: "",
    telefono: "",
    email: "",
};

export default function ClientesPage() {
  const { toast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCliente, setCurrentCliente] = useState<Omit<Cliente, 'id'>>(initialClienteState);
  const [currentClienteId, setCurrentClienteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const clientesCollection = collection(db, 'clientes');
      const q = query(clientesCollection, orderBy("nombre", "asc"));
      const clientesSnapshot = await getDocs(q);
      const clientesList = clientesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cliente));
      setClientes(clientesList);
    } catch (error) {
      console.error("Error fetching clientes: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los clientes." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, [toast]);
  
  const filteredClientes = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return clientes.filter(cliente =>
      cliente.nombre.toLowerCase().includes(term) ||
      cliente.ruc_ci.toLowerCase().includes(term)
    );
  }, [clientes, searchTerm]);

  const handleOpenDialog = (cliente: Cliente | null = null) => {
    if (cliente) {
      setIsEditing(true);
      setCurrentClienteId(cliente.id);
      setCurrentCliente({ 
          nombre: cliente.nombre,
          ruc_ci: cliente.ruc_ci,
          direccion: cliente.direccion,
          telefono: cliente.telefono,
          email: cliente.email
       });
    } else {
      setIsEditing(false);
      setCurrentCliente(initialClienteState);
      setCurrentClienteId(null);
    }
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setIsEditing(false);
    setCurrentCliente(initialClienteState);
    setCurrentClienteId(null);
  }

  const handleInputChange = (field: keyof Omit<Cliente, 'id'>, value: string) => {
      setCurrentCliente(prev => ({...prev, [field]: value}));
  }

  const handleSubmit = async () => {
    if (!currentCliente.nombre || !currentCliente.ruc_ci) {
        toast({ variant: 'destructive', title: 'Error de validación', description: 'Nombre y RUC/CI son requeridos.'});
        return;
    }

    // Check for duplicates
    const q = query(collection(db, 'clientes'), where("ruc_ci", "==", currentCliente.ruc_ci));
    const snapshot = await getDocs(q);
    if(!snapshot.empty) {
        let isDuplicate = false;
        if (isEditing && currentClienteId) {
            // In edit mode, it's a duplicate if the found doc has a different ID
            if (snapshot.docs[0].id !== currentClienteId) {
                isDuplicate = true;
            }
        } else {
            // In create mode, any result is a duplicate
            isDuplicate = true;
        }

        if (isDuplicate) {
            toast({ variant: 'destructive', title: 'Cliente duplicado', description: `Ya existe un cliente con el RUC/CI ${currentCliente.ruc_ci}.`});
            return;
        }
    }

    try {
        if(isEditing && currentClienteId) {
            const clienteRef = doc(db, 'clientes', currentClienteId);
            await updateDoc(clienteRef, currentCliente);
            toast({ title: 'Cliente Actualizado', description: 'El cliente ha sido actualizado exitosamente.'});
        } else {
            await addDoc(collection(db, 'clientes'), currentCliente);
            toast({ title: 'Cliente Creado', description: 'El nuevo cliente ha sido creado exitosamente.'});
        }
        await fetchClientes();
        handleCloseDialog();
    } catch (error) {
        console.error("Error saving cliente: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el cliente.'});
    }
  }

  const handleDelete = async (clienteId: string) => {
      try {
          await deleteDoc(doc(db, 'clientes', clienteId));
          toast({ title: 'Cliente Eliminado', description: 'El cliente ha sido eliminado.', variant: 'destructive' });
          await fetchClientes();
      } catch (error) {
          console.error("Error deleting cliente: ", error);
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el cliente.'});
      }
  }

  if (loading) return <p>Cargando clientes...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Clientes</h1>
        <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4"/>Crear Cliente</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Clientes</CardTitle>
          <CardDescription>
            <Input 
                placeholder="Buscar por nombre o RUC/CI..."
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
                <TableHead>RUC / CI</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClientes.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell className="font-medium">{cliente.nombre}</TableCell>
                   <TableCell>{cliente.ruc_ci}</TableCell>
                  <TableCell>{cliente.telefono || 'N/A'}</TableCell>
                  <TableCell>{cliente.email || 'N/A'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(cliente)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 hover:text-red-500 focus:text-red-500"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente al cliente.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(cliente.id)} className="bg-destructive hover:bg-destructive/90">Confirmar</AlertDialogAction>
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
           {filteredClientes.length === 0 && <p className="text-center text-muted-foreground mt-4">No se encontraron clientes.</p>}
        </CardContent>
      </Card>
      
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>{isEditing ? 'Editar Cliente' : 'Crear Nuevo Cliente'}</DialogTitle>
                 <DialogDescriptionComponent>
                    {isEditing ? 'Actualice los detalles del cliente.' : 'Complete los detalles para crear un nuevo cliente.'}
                </DialogDescriptionComponent>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="nombre">Nombre</Label>
                        <Input id="nombre" value={currentCliente.nombre} onChange={e => handleInputChange('nombre', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="ruc_ci">RUC / CI</Label>
                        <Input id="ruc_ci" value={currentCliente.ruc_ci} onChange={e => handleInputChange('ruc_ci', e.target.value)} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="direccion">Dirección</Label>
                    <Textarea id="direccion" value={currentCliente.direccion} onChange={e => handleInputChange('direccion', e.target.value)} />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="telefono">Teléfono</Label>
                        <Input id="telefono" value={currentCliente.telefono} onChange={e => handleInputChange('telefono', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={currentCliente.email} onChange={e => handleInputChange('email', e.target.value)} />
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
                <Button onClick={handleSubmit}>{isEditing ? 'Guardar Cambios' : 'Crear Cliente'}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
