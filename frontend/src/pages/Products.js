import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Search, Edit, Trash2, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const emptyProduct = {
  codigo: '',
  nombre: '',
  precio: '',
  descripcion: ''
};

export default function Products() {
  const { hasPermission } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(emptyProduct);
  const [productToDelete, setProductToDelete] = useState(null);

  const canCreate = hasPermission('productos_crear');
  const canEdit = hasPermission('productos_editar');
  const canDelete = hasPermission('productos_eliminar');

  const fetchProducts = async () => {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await axios.get(`${API_URL}/products${params}`);
      setProducts(response.data);
    } catch (error) {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (searchParams.get('action') === 'new' && canCreate) {
      handleOpenNew();
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, canCreate]);

  const handleOpenNew = () => {
    setEditingProduct(null);
    setFormData(emptyProduct);
    setDialogOpen(true);
  };

  const handleEdit = (product) => {
    if (!canEdit) return;
    setEditingProduct(product);
    setFormData({
      codigo: product.codigo,
      nombre: product.nombre,
      precio: product.precio.toString(),
      descripcion: product.descripcion || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = (product) => {
    if (!canDelete) return;
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    
    try {
      await axios.delete(`${API_URL}/products/${productToDelete.id}`);
      toast.success('Producto eliminado correctamente');
      fetchProducts();
    } catch (error) {
      toast.error('Error al eliminar producto');
    } finally {
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      ...formData,
      precio: parseFloat(formData.precio)
    };

    try {
      if (editingProduct) {
        await axios.put(`${API_URL}/products/${editingProduct.id}`, payload);
        toast.success('Producto actualizado correctamente');
      } else {
        await axios.post(`${API_URL}/products`, payload);
        toast.success('Producto creado correctamente');
      }
      setDialogOpen(false);
      fetchProducts();
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al guardar producto';
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
    fetchProducts();
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="products-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Gestión de Productos
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra el catálogo de productos de la panadería
          </p>
        </div>
        {canCreate && (
          <Button onClick={handleOpenNew} className="gap-2" data-testid="new-product-btn">
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </Button>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por código o nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="product-search-input"
              />
            </div>
            <Button type="submit" variant="secondary" data-testid="product-search-btn">
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
          ) : products.length === 0 ? (
            <div className="empty-state py-16">
              <Package className="empty-state-icon" />
              <h3 className="text-lg font-medium">No hay productos</h3>
              <p className="text-muted-foreground mt-1">
                {search ? 'No se encontraron productos' : 'Comienza agregando tu primer producto'}
              </p>
              {canCreate && !search && (
                <Button onClick={handleOpenNew} className="mt-4 gap-2">
                  <Plus className="w-4 h-4" />
                  Nuevo Producto
                </Button>
              )}
            </div>
          ) : (
            <div className="table-container">
              <Table className="data-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} data-testid={`product-row-${product.id}`}>
                      <TableCell className="font-mono font-medium">{product.codigo}</TableCell>
                      <TableCell className="font-medium">{product.nombre}</TableCell>
                      <TableCell className="font-mono">{formatCurrency(product.precio)}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {product.descripcion || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEdit(product)}
                              data-testid={`edit-product-${product.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(product)}
                              data-testid={`delete-product-${product.id}`}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código del Producto *</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => handleInputChange('codigo', e.target.value)}
                  placeholder="Ej: PAN001"
                  required
                  data-testid="product-code-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del Producto *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  required
                  data-testid="product-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="precio">Precio (COP) *</Label>
                <Input
                  id="precio"
                  type="number"
                  min="0"
                  step="100"
                  value={formData.precio}
                  onChange={(e) => handleInputChange('precio', e.target.value)}
                  required
                  data-testid="product-price-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => handleInputChange('descripcion', e.target.value)}
                  rows={3}
                  data-testid="product-description-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} data-testid="product-submit-btn">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  editingProduct ? 'Actualizar' : 'Crear Producto'
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
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el producto
              <strong> {productToDelete?.nombre}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-product-btn"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
