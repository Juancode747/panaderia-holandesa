import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Search, Edit, Trash2, Truck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const emptyProvider = {
  nombre_contacto: '',
  empresa: '',
  telefono: '',
  correo: '',
  insumos: ''
};

export default function Providers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [formData, setFormData] = useState(emptyProvider);
  const [providerToDelete, setProviderToDelete] = useState(null);

  const fetchProviders = async () => {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await axios.get(`${API_URL}/providers${params}`);
      setProviders(response.data);
    } catch (error) {
      toast.error('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      handleOpenNew();
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const handleOpenNew = () => {
    setEditingProvider(null);
    setFormData(emptyProvider);
    setDialogOpen(true);
  };

  const handleEdit = (provider) => {
    setEditingProvider(provider);
    setFormData({
      nombre_contacto: provider.nombre_contacto,
      empresa: provider.empresa,
      telefono: provider.telefono,
      correo: provider.correo || '',
      insumos: provider.insumos
    });
    setDialogOpen(true);
  };

  const handleDelete = (provider) => {
    setProviderToDelete(provider);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!providerToDelete) return;
    
    try {
      await axios.delete(`${API_URL}/providers/${providerToDelete.id}`);
      toast.success('Proveedor eliminado correctamente');
      fetchProviders();
    } catch (error) {
      toast.error('Error al eliminar proveedor');
    } finally {
      setDeleteDialogOpen(false);
      setProviderToDelete(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingProvider) {
        await axios.put(`${API_URL}/providers/${editingProvider.id}`, formData);
        toast.success('Proveedor actualizado correctamente');
      } else {
        await axios.post(`${API_URL}/providers`, formData);
        toast.success('Proveedor creado correctamente');
      }
      setDialogOpen(false);
      fetchProviders();
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al guardar proveedor';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProviders();
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="providers-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Gestión de Proveedores
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra los proveedores de insumos
          </p>
        </div>
        <Button onClick={handleOpenNew} className="gap-2" data-testid="new-provider-btn">
          <Plus className="w-4 h-4" />
          Nuevo Proveedor
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por empresa o contacto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="provider-search-input"
              />
            </div>
            <Button type="submit" variant="secondary" data-testid="provider-search-btn">
              Buscar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="spinner w-8 h-8" />
            </div>
          ) : providers.length === 0 ? (
            <div className="empty-state py-16">
              <Truck className="empty-state-icon" />
              <h3 className="text-lg font-medium">No hay proveedores</h3>
              <p className="text-muted-foreground mt-1">
                {search ? 'No se encontraron proveedores' : 'Comienza agregando tu primer proveedor'}
              </p>
              {!search && (
                <Button onClick={handleOpenNew} className="mt-4 gap-2">
                  <Plus className="w-4 h-4" />
                  Nuevo Proveedor
                </Button>
              )}
            </div>
          ) : (
            <div className="table-container">
              <Table className="data-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Insumos</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers.map((provider) => (
                    <TableRow key={provider.id} data-testid={`provider-row-${provider.id}`}>
                      <TableCell className="font-medium">{provider.empresa}</TableCell>
                      <TableCell>{provider.nombre_contacto}</TableCell>
                      <TableCell>{provider.telefono}</TableCell>
                      <TableCell className="text-muted-foreground">{provider.correo || '-'}</TableCell>
                      <TableCell className="max-w-xs truncate">{provider.insumos}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEdit(provider)}
                            data-testid={`edit-provider-${provider.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(provider)}
                            data-testid={`delete-provider-${provider.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
              {editingProvider ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="empresa">Empresa *</Label>
                <Input
                  id="empresa"
                  value={formData.empresa}
                  onChange={(e) => handleInputChange('empresa', e.target.value)}
                  required
                  data-testid="provider-company-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre_contacto">Nombre del Contacto *</Label>
                <Input
                  id="nombre_contacto"
                  value={formData.nombre_contacto}
                  onChange={(e) => handleInputChange('nombre_contacto', e.target.value)}
                  required
                  data-testid="provider-contact-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono *</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => handleInputChange('telefono', e.target.value)}
                  required
                  data-testid="provider-phone-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="correo">Correo Electrónico</Label>
                <Input
                  id="correo"
                  type="email"
                  value={formData.correo}
                  onChange={(e) => handleInputChange('correo', e.target.value)}
                  data-testid="provider-email-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insumos">Insumos que Provee *</Label>
                <Textarea
                  id="insumos"
                  value={formData.insumos}
                  onChange={(e) => handleInputChange('insumos', e.target.value)}
                  placeholder="Ej: Harina, Azúcar, Levadura..."
                  rows={3}
                  required
                  data-testid="provider-supplies-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} data-testid="provider-submit-btn">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  editingProvider ? 'Actualizar' : 'Crear Proveedor'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el proveedor
              <strong> {providerToDelete?.empresa}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-provider-btn"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
