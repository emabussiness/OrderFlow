
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

type TipoDocumento = {
  id: string;
  nombre: string;
  descripcion?: string;
};

const initialTipoDocumentoState: Omit<TipoDocumento, 'id'> = {
    nombre: "",
    descripcion: "",
};

export default function TiposDocumentoPage() {
  const { toast } = useToast();
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTipoDocumento, setCurrentTipoDocumento] = useState<Omit<TipoDocumento, 'id'>>(initialTipoDocumentoState);
  const [currentTipoDocumentoId, setCurrentTipoDocumentoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchTiposDocumento = async () => {
    setLoading(true);
    try {
      const tiposDocumentoCollection = collection(db, 'tipos_documento');
      const q = query(tiposDocumentoCollection, orderBy("nombre", "asc"));
      const tiposDocumentoSnapshot = await getDocs(q);
      const tiposDocumentoList = tiposDocumentoSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TipoDocumento));
      setTiposDocumento(tiposDocumentoList);
    } catch (error) {
      console.error("Error fetching document types: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los tipos de documento." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTiposDocumento();
  }, [toast]);
  
  const filteredTiposDocumento = useMemo(() => {
    return tiposDocumento.filter(tipo =>
      tipo.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tiposDocumento, searchTerm]);

  const handleOpenDialog = (tipoDocumento: TipoDocumento | null = null) => {
    if (tipoDocumento) {
      setIsEditing(true);
      setCurrentTipoDocumentoId(tipoDocumento.id);
      setCurrentTipoDocumento({ nombre: tipoDocumento.nombre, descripcion: tipoDocumento.descripcion });
    } else {
      setIsEditing(false);
      setCurrentTipoDocumento(initialTipoDocumentoState);
      setCurrentTipoDocumentoId(null);
    }
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setIsEditing(false);
    setCurrentTipoDocumento(initialTipoDocumentoState);
    setCurrentTipoDocumentoId(null);
  }

  const handleInputChange = (field: keyof Omit<TipoDocumento, 'id'>, value: string) => {
    setCurrentTipoDocumento(prev => ({ ...prev, [field]: value }));
  }

  const handleSubmit = async () => {
    const trimmedName = currentTipoDocumento.nombre.trim();
    if (!trimmedName) {
        toast({ variant: 'destructive', title: 'Error de validación', description: 'El nombre es requerido.'});
        return;
    }
    
    // Case-insensitive duplicate check
    const isDuplicate = tiposDocumento.some(doc => 
        doc.nombre.toLowerCase() === trimmedName.toLowerCase() && doc.id !== currentTipoDocumentoId
    );

    if (isDuplicate) {
        toast({ variant: 'destructive', title: 'Nombre duplicado', description: `Ya existe un tipo de documento con el nombre "${trimmedName}".`});
        return;
    }

    try {
        const dataToSave = {
            ...currentTipoDocumento,
            nombre: trimmedName,
        };

        if(isEditing && currentTipoDocumentoId) {
            const tipoDocumentoRef = doc(db, 'tipos_documento', currentTipoDocumentoId);
            await updateDoc(tipoDocumentoRef, dataToSave);
            toast({ title: 'Tipo de Documento Actualizado', description: 'El tipo de documento ha sido actualizado exitosamente.'});
        } else {
            await addDoc(collection(db, 'tipos_documento'), dataToSave);
            toast({ title: 'Tipo de Documento Creado', description: 'El nuevo tipo de documento ha sido creado exitosamente.'});
        }
        await fetchTiposDocumento();
        handleCloseDialog();
    } catch (error) {
        console.error("Error saving document type: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el tipo de documento.'});
    }
  }

  const handleDelete = async (tipoDocumentoId: string) => {
      try {
          await deleteDoc(doc(db, 'tipos_documento', tipoDocumentoId));
          toast({ title: 'Tipo de Documento Eliminado', description: 'El tipo de documento ha sido eliminado.', variant: 'destructive' });
          await fetchTiposDocumento();
      } catch (error) {
          console.error("Error deleting document type: ", error);
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el tipo de documento.'});
      }
  }

  if (loading) return <p>Cargando tipos de documento...</p>;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Tipos de Documento</h1>
        <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4"/>Crear Tipo de Documento</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Tipos de Documento</CardTitle>
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
              {filteredTiposDocumento.map((tipo) => (
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
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente el tipo de documento.
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
           {filteredTiposDocumento.length === 0 && <p className="text-center text-muted-foreground mt-4">No hay tipos de documento registrados.</p>}
        </CardContent>
      </Card>
      
      <Dialog open={openDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>{isEditing ? 'Editar Tipo de Documento' : 'Crear Nuevo Tipo de Documento'}</DialogTitle>
                 <DialogDescriptionComponent>
                    {isEditing ? 'Actualice los detalles del tipo de documento.' : 'Complete los detalles para crear un nuevo tipo de documento.'}
                </DialogDescriptionComponent>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input id="nombre" value={currentTipoDocumento.nombre} onChange={e => handleInputChange('nombre', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea id="descripcion" value={currentTipoDocumento.descripcion} onChange={e => handleInputChange('descripcion', e.target.value)} />
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
