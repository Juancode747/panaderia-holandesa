import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Search, Edit, Trash2, Store, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn, getDayClass, getRouteClass } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const emptyStore = {
  nombre_tienda: '',
  nombre_dueno: '',
  cedula_nit: '',
  telefono: '',
  correo: '',
  direccion: '',
  ruta_id: '',
  dia_entrega: ''
};

export default function Stores() {
  const { hasPermission, getUserRoute, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [stores, setStores] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [filterRoute, setFilterRoute] = useState('all');
  const [filterDay, setFilterDay] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [formData, setFormData] = useState(emptyStore);
  const [storeToDelete, setStoreToDelete] = useState(null);

  const userRoute = getUserRoute();
  const canCreate = hasPermission('tiendas_crear');
  const canEdit = hasPermission('tiendas_editar');
  const canDelete = hasPermission('tiendas_eliminar');

  const fetchStores = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterRoute && filterRoute !== 'all') params.append('ruta_id', filterRoute);
      if (filterDay && filterDay !== 'all') params.append('dia_entrega', filterDay);
      
      const response = await axios.get(`${API_URL}/stores?${params.toString()}`);
      setStores(response.data);
    } catch (error) {
      toast.error('Error al cargar tiendas');
    } finally {
      setLoading(false);
    }
  }, [search, filterRoute, filterDay]);

  const fetchRoutes = async () => {
    try {
      const response = await axios.get(`${API_URL}/routes`);
      setRoutes(response.data);
    } catch (error) {
      toast.error('Error al cargar rutas');
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  useEffect(() => {
    if (searchParams.get('action') === 'new' && canCreate) {
      handleOpenNew();
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, canCreate]);

  const handleOpenNew = () => {
    setEditingStore(null);
    setFormData({
      ...emptyStore,
      ruta_id: userRoute || ''
    });
    setDialogOpen(true);
  };

  const handleEdit = (store) => {
    if (!canEdit) return;
    setEditingStore(store);
    setFormData({
      nombre_tienda: store.nombre_tienda,
      nombre_dueno: store.nombre_dueno,
      cedula_nit: store.cedula_nit,
      telefono: store.telefono,
      correo: store.correo,
      direccion: store.direccion,
      ruta_id: store.ruta_id,
      dia_entrega: store.dia_entrega
    });
    setDialogOpen(true);
  };

  const handleDelete = (store) => {
    if (!canDelete) return;
    setStoreToDelete(store);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!storeToDelete) return;
    
    try {
      await axios.delete(`${API_URL}/stores/${storeToDelete.id}`);
      toast.success('Tienda eliminada correctamente');
      fetchStores();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar tienda');
    } finally {
      setDeleteDialogOpen(false);
      setStoreToDelete(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingStore) {
        await axios.put(`${API_URL}/stores/${editingStore.id}`, formData);
        toast.success('Tienda actualizada correctamente');
      } else {
        await axios.post(`${API_URL}/stores`, formData);
        toast.success('Tienda creada correctamente');
      }
      setDialogOpen(false);
      fetchStores();
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al guardar tienda';
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
    fetchStores();
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="stores-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Gestión de Tiendas
          </h1>
          <p className="text-muted-foreground mt-1">
            {userRoute ? `Tu ruta: ${routes.find(r => r.id === userRoute)?.nombre || userRoute}` : 'Todas las rutas'}
          </p>
        </div>
        {canCreate && (
          <Button onClick={handleOpenNew} className="gap-2" data-testid="new-store-btn">
            <Plus className="w-4 h-4" />
            Nueva Tienda
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar por cédula, nombre o tienda..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="store-search-input"
                />
              </div>
              <Button type="submit" variant="secondary" data-testid="store-search-btn">
                Buscar
              </Button>
            </form>
            
            <div className="flex gap-2">
              {isAdmin() && (
                <Select value={filterRoute} onValueChange={setFilterRoute}>
                  <SelectTrigger className="w-40" data-testid="filter-route-select">
                    <SelectValue placeholder="Ruta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las rutas</SelectItem>
                    {routes.map(route => (
                      <SelectItem key={route.id} value={route.id}>{route.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <Select value={filterDay} onValueChange={setFilterDay}>
                <SelectTrigger className="w-40" data-testid="filter-day-select">
                  <SelectValue placeholder="Día" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los días</SelectItem>
                  {DIAS.map(dia => (
                    <SelectItem key={dia} value={dia}>{dia}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {(filterRoute !== 'all' || filterDay !== 'all' || search) && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    setFilterRoute('all');
                    setFilterDay('all');
                    setSearch('');
                  }}
                  data-testid="clear-filters-btn"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="spinner w-8 h-8" />
            </div>
          ) : stores.length === 0 ? (
            <div className="empty-state py-16">
              <Store className="empty-state-icon" />
              <h3 className="text-lg font-medium">No hay tiendas</h3>
              <p className="text-muted-foreground mt-1">
                {search || filterRoute !== 'all' || filterDay !== 'all' 
                  ? 'No se encontraron tiendas con los filtros aplicados'
                  : 'Comienza agregando tu primera tienda'}
              </p>
              {canCreate && !search && filterRoute === 'all' && filterDay === 'all' && (
                <Button onClick={handleOpenNew} className="mt-4 gap-2">
                  <Plus className="w-4 h-4" />
                  Nueva Tienda
                </Button>
              )}
            </div>
          ) : (
            <div className="table-container">
              <Table className="data-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Tienda</TableHead>
                    <TableHead>Dueño</TableHead>
                    <TableHead>Cédula/NIT</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Ruta</TableHead>
                    <TableHead>Día</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.map((store) => (
                    <TableRow key={store.id} data-testid={`store-row-${store.id}`}>
                      <TableCell className="font-medium">{store.nombre_tienda}</TableCell>
                      <TableCell>{store.nombre_dueno}</TableCell>
                      <TableCell className="font-mono text-sm">{store.cedula_nit}</TableCell>
                      <TableCell>{store.telefono}</TableCell>
                      <TableCell>
                        <span className={cn("vendor-badge", getRouteClass(store.ruta_id))}>
                          {store.ruta_nombre}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn("day-badge", getDayClass(store.dia_entrega))}>
                          {store.dia_entrega}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEdit(store)}
                              data-testid={`edit-store-${store.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(store)}
                              data-testid={`delete-store-${store.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
              {editingStore ? 'Editar Tienda' : 'Nueva Tienda'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="form-grid py-4">
              <div className="space-y-2">
                <Label htmlFor="nombre_tienda">Nombre de la Tienda *</Label>
                <Input
                  id="nombre_tienda"
                  value={formData.nombre_tienda}
                  onChange={(e) => handleInputChange('nombre_tienda', e.target.value)}
                  required
                  data-testid="store-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre_dueno">Nombre del Dueño *</Label>
                <Input
                  id="nombre_dueno"
                  value={formData.nombre_dueno}
                  onChange={(e) => handleInputChange('nombre_dueno', e.target.value)}
                  required
                  data-testid="store-owner-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cedula_nit">Cédula o NIT *</Label>
                <Input
                  id="cedula_nit"
                  value={formData.cedula_nit}
                  onChange={(e) => handleInputChange('cedula_nit', e.target.value)}
                  required
                  data-testid="store-cedula-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono *</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => handleInputChange('telefono', e.target.value)}
                  required
                  data-testid="store-phone-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="correo">Correo Electrónico *</Label>
                <Input
                  id="correo"
                  type="email"
                  value={formData.correo}
                  onChange={(e) => handleInputChange('correo', e.target.value)}
                  required
                  data-testid="store-email-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ruta_id">Ruta *</Label>
                <Select 
                  value={formData.ruta_id} 
                  onValueChange={(value) => handleInputChange('ruta_id', value)}
                  disabled={!!userRoute && !isAdmin()}
                  required
                >
                  <SelectTrigger data-testid="store-route-select">
                    <SelectValue placeholder="Seleccionar ruta" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.filter(r => !userRoute || r.id === userRoute || isAdmin()).map(route => (
                      <SelectItem key={route.id} value={route.id}>{route.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dia_entrega">Día de Entrega *</Label>
                <Select 
                  value={formData.dia_entrega} 
                  onValueChange={(value) => handleInputChange('dia_entrega', value)}
                  required
                >
                  <SelectTrigger data-testid="store-day-select">
                    <SelectValue placeholder="Seleccionar día" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIAS.map(dia => (
                      <SelectItem key={dia} value={dia}>{dia}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="direccion">Dirección (Villavicencio) *</Label>
                <Input
                  id="direccion"
                  value={formData.direccion}
                  onChange={(e) => handleInputChange('direccion', e.target.value)}
                  placeholder="Ej: Calle 15 #23-45, Barrio Centro"
                  required
                  data-testid="store-address-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} data-testid="store-submit-btn">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  editingStore ? 'Actualizar' : 'Crear Tienda'
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
            <AlertDialogTitle>¿Eliminar tienda?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la tienda
              <strong> {storeToDelete?.nombre_tienda}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-btn"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
