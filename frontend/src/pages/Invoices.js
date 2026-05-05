import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Checkbox } from '../components/ui/checkbox';
import { Plus, Search, Edit, Trash2, Receipt, Loader2, Printer, Eye, Package, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function Invoices() {
  const { hasPermission, getUserRoute, isAdmin, user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [filterRoute, setFilterRoute] = useState('all');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Form state
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [items, setItems] = useState([]);
  const [observaciones, setObservaciones] = useState('');
  
  // Add item state
  const [selectedProduct, setSelectedProduct] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [esDevolucion, setEsDevolucion] = useState(false);

  const userRoute = getUserRoute();
  const canCreate = hasPermission('facturas_crear');
  const canEdit = hasPermission('facturas_editar');

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (filterDate) params.append('fecha', filterDate);
      if (filterRoute && filterRoute !== 'all') params.append('ruta_id', filterRoute);
      
      const [invoicesRes, storesRes, productsRes, routesRes] = await Promise.all([
        axios.get(`${API_URL}/invoices?${params.toString()}`),
        axios.get(`${API_URL}/stores`),
        axios.get(`${API_URL}/products`),
        axios.get(`${API_URL}/routes`)
      ]);
      
      setInvoices(invoicesRes.data);
      setStores(storesRes.data);
      setProducts(productsRes.data);
      setRoutes(routesRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterRoute, filterDate]);

  const handleOpenNew = () => {
    setEditingInvoice(null);
    setSelectedStore('');
    setSelectedRoute(userRoute || '');
    setItems([]);
    setObservaciones('');
    setDialogOpen(true);
  };

  const handleEdit = (invoice) => {
    if (!canEdit) return;
    setEditingInvoice(invoice);
    setSelectedStore(invoice.tienda_id);
    setSelectedRoute(invoice.ruta_id);
    setItems(invoice.items);
    setObservaciones(invoice.observaciones);
    setDialogOpen(true);
  };

  const handleView = (invoice) => {
    setViewingInvoice(invoice);
    setViewDialogOpen(true);
  };

  const addItem = () => {
    if (!selectedProduct || cantidad < 1) {
      toast.error('Selecciona un producto y cantidad válida');
      return;
    }
    
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;
    
    const newItem = {
      producto_id: product.id,
      producto_codigo: product.codigo,
      producto_nombre: product.nombre,
      cantidad: cantidad,
      precio_unitario: product.precio,
      es_devolucion: esDevolucion
    };
    
    setItems(prev => [...prev, newItem]);
    setSelectedProduct('');
    setCantidad(1);
    setEsDevolucion(false);
  };

  const removeItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalDevoluciones = 0;
    
    items.forEach(item => {
      const itemTotal = item.cantidad * item.precio_unitario;
      if (item.es_devolucion) {
        totalDevoluciones += itemTotal;
      } else {
        subtotal += itemTotal;
      }
    });
    
    const subtotalNeto = subtotal - totalDevoluciones;
    const iva = subtotalNeto * 0.19;
    const total = subtotalNeto + iva;
    
    return { subtotal, totalDevoluciones, subtotalNeto, iva, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedStore || !selectedRoute || items.length === 0) {
      toast.error('Completa todos los campos requeridos');
      return;
    }
    
    setSaving(true);

    try {
      const payload = {
        tienda_id: selectedStore,
        ruta_id: selectedRoute,
        items: items,
        observaciones: observaciones
      };

      if (editingInvoice) {
        await axios.put(`${API_URL}/invoices/${editingInvoice.id}`, {
          items: items,
          observaciones: observaciones
        });
        toast.success('Factura actualizada correctamente');
      } else {
        await axios.post(`${API_URL}/invoices`, payload);
        toast.success('Factura creada correctamente');
      }
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al guardar factura';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const printInvoice = (invoice) => {
    const printWindow = window.open('', '_blank');
    const totals = {
      subtotal: invoice.subtotal,
      iva: invoice.iva,
      total: invoice.total,
      totalDevoluciones: invoice.total_devoluciones
    };
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Factura ${invoice.numero_factura}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; width: 80mm; padding: 5mm; font-size: 12px; }
          .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .title { font-size: 16px; font-weight: bold; }
          .info { margin: 10px 0; }
          .info p { margin: 3px 0; }
          .items { width: 100%; border-collapse: collapse; margin: 10px 0; }
          .items th, .items td { text-align: left; padding: 3px 0; }
          .items th { border-bottom: 1px solid #000; }
          .items .qty { width: 30px; text-align: center; }
          .items .price { text-align: right; }
          .devolucion { color: #666; font-style: italic; }
          .totals { border-top: 1px dashed #000; margin-top: 10px; padding-top: 10px; }
          .totals p { display: flex; justify-content: space-between; margin: 3px 0; }
          .total-final { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
          .footer { text-align: center; margin-top: 15px; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <p class="title">PANADERÍA HOLANDESA</p>
          <p>Villavicencio, Colombia</p>
          <p>NIT: 900.000.000-0</p>
        </div>
        
        <div class="info">
          <p><strong>Factura:</strong> ${invoice.numero_factura}</p>
          <p><strong>Fecha:</strong> ${invoice.fecha}</p>
          <p><strong>Cliente:</strong> ${invoice.tienda_nombre}</p>
          <p><strong>NIT/CC:</strong> ${invoice.tienda_cedula}</p>
          <p><strong>Dirección:</strong> ${invoice.tienda_direccion}</p>
          <p><strong>Vendedor:</strong> ${invoice.vendedor_nombre}</p>
        </div>
        
        <table class="items">
          <thead>
            <tr>
              <th class="qty">Cant</th>
              <th>Producto</th>
              <th class="price">Precio</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items.map(item => `
              <tr class="${item.es_devolucion ? 'devolucion' : ''}">
                <td class="qty">${item.es_devolucion ? '-' : ''}${item.cantidad}</td>
                <td>${item.producto_codigo} - ${item.producto_nombre}${item.es_devolucion ? ' (DEV)' : ''}</td>
                <td class="price">$${(item.cantidad * item.precio_unitario).toLocaleString('es-CO')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="totals">
          <p><span>Subtotal:</span><span>$${totals.subtotal.toLocaleString('es-CO')}</span></p>
          ${totals.totalDevoluciones > 0 ? `<p><span>Devoluciones:</span><span>-$${totals.totalDevoluciones.toLocaleString('es-CO')}</span></p>` : ''}
          <p><span>IVA (19%):</span><span>$${totals.iva.toLocaleString('es-CO')}</span></p>
          <p class="total-final"><span>TOTAL:</span><span>$${totals.total.toLocaleString('es-CO')}</span></p>
        </div>
        
        ${invoice.observaciones ? `<div class="info"><p><strong>Obs:</strong> ${invoice.observaciones}</p></div>` : ''}
        
        <div class="footer">
          <p>¡Gracias por su compra!</p>
          <p>Impreso: ${new Date().toLocaleString('es-CO')}</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const filteredStores = stores.filter(s => !selectedRoute || s.ruta_id === selectedRoute);
  const totals = calculateTotals();

  return (
    <div className="space-y-6 animate-fade-in" data-testid="invoices-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Facturación
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las facturas de entrega
          </p>
        </div>
        {canCreate && (
          <Button onClick={handleOpenNew} className="gap-2" data-testid="new-invoice-btn">
            <Plus className="w-4 h-4" />
            Nueva Factura
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label className="text-sm text-muted-foreground mb-2 block">Fecha</Label>
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                data-testid="filter-date-input"
              />
            </div>
            {isAdmin() && (
              <div className="flex-1">
                <Label className="text-sm text-muted-foreground mb-2 block">Ruta</Label>
                <Select value={filterRoute} onValueChange={setFilterRoute}>
                  <SelectTrigger data-testid="filter-route-select">
                    <SelectValue placeholder="Todas las rutas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las rutas</SelectItem>
                    {routes.map(route => (
                      <SelectItem key={route.id} value={route.id}>{route.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="spinner w-8 h-8" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="empty-state py-16">
              <Receipt className="empty-state-icon" />
              <h3 className="text-lg font-medium">No hay facturas</h3>
              <p className="text-muted-foreground mt-1">
                No se encontraron facturas para la fecha seleccionada
              </p>
              {canCreate && (
                <Button onClick={handleOpenNew} className="mt-4 gap-2">
                  <Plus className="w-4 h-4" />
                  Nueva Factura
                </Button>
              )}
            </div>
          ) : (
            <div className="table-container">
              <Table className="data-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Factura</TableHead>
                    <TableHead>Tienda</TableHead>
                    <TableHead>Ruta</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id} data-testid={`invoice-row-${invoice.id}`}>
                      <TableCell className="font-mono font-medium">{invoice.numero_factura}</TableCell>
                      <TableCell>{invoice.tienda_nombre}</TableCell>
                      <TableCell>{invoice.ruta_nombre}</TableCell>
                      <TableCell>{invoice.vendedor_nombre}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(invoice.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleView(invoice)}
                            data-testid={`view-invoice-${invoice.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canEdit && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEdit(invoice)}
                              data-testid={`edit-invoice-${invoice.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => printInvoice(invoice)}
                            data-testid={`print-invoice-${invoice.id}`}
                          >
                            <Printer className="w-4 h-4" />
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
              {editingInvoice ? 'Editar Factura' : 'Nueva Factura'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6 py-4">
              {/* Store and Route Selection */}
              {!editingInvoice && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ruta *</Label>
                    <Select 
                      value={selectedRoute} 
                      onValueChange={setSelectedRoute}
                      disabled={!!userRoute}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar ruta" />
                      </SelectTrigger>
                      <SelectContent>
                        {routes.filter(r => !userRoute || r.id === userRoute).map(route => (
                          <SelectItem key={route.id} value={route.id}>{route.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tienda *</Label>
                    <Select 
                      value={selectedStore} 
                      onValueChange={setSelectedStore}
                      disabled={!selectedRoute}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tienda" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredStores.map(store => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.nombre_tienda} - {store.nombre_dueno}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Add Items */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Agregar Productos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.codigo} - {product.nombre} ({formatCurrency(product.precio)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        min="1"
                        value={cantidad}
                        onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                        placeholder="Cant"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="esDevolucion"
                        checked={esDevolucion}
                        onCheckedChange={setEsDevolucion}
                      />
                      <label htmlFor="esDevolucion" className="text-sm flex items-center gap-1 cursor-pointer">
                        <RotateCcw className="w-3 h-3" />
                        Devolución
                      </label>
                    </div>
                    <Button type="button" onClick={addItem} variant="secondary">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Items List */}
              {items.length > 0 && (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-center">Cant</TableHead>
                          <TableHead className="text-right">Precio</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, index) => (
                          <TableRow key={index} className={item.es_devolucion ? 'bg-orange-50' : ''}>
                            <TableCell className="font-mono">{item.producto_codigo}</TableCell>
                            <TableCell>
                              {item.producto_nombre}
                              {item.es_devolucion && (
                                <span className="ml-2 text-xs text-orange-600 font-medium">(DEVOLUCIÓN)</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">{item.cantidad}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.precio_unitario)}</TableCell>
                            <TableCell className="text-right font-medium">
                              {item.es_devolucion ? '-' : ''}{formatCurrency(item.cantidad * item.precio_unitario)}
                            </TableCell>
                            <TableCell>
                              <Button 
                                type="button"
                                variant="ghost" 
                                size="icon"
                                onClick={() => removeItem(index)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Totals */}
              {items.length > 0 && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-mono">{formatCurrency(totals.subtotal)}</span>
                      </div>
                      {totals.totalDevoluciones > 0 && (
                        <div className="flex justify-between text-orange-600">
                          <span>Devoluciones:</span>
                          <span className="font-mono">-{formatCurrency(totals.totalDevoluciones)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>IVA (19%):</span>
                        <span className="font-mono">{formatCurrency(totals.iva)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>TOTAL:</span>
                        <span className="font-mono">{formatCurrency(totals.total)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Observations */}
              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Notas adicionales..."
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || items.length === 0} data-testid="invoice-submit-btn">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  editingInvoice ? 'Actualizar' : 'Crear Factura'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
              Factura {viewingInvoice?.numero_factura}
            </DialogTitle>
          </DialogHeader>
          {viewingInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Fecha</p>
                  <p className="font-medium">{viewingInvoice.fecha}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vendedor</p>
                  <p className="font-medium">{viewingInvoice.vendedor_nombre}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tienda</p>
                  <p className="font-medium">{viewingInvoice.tienda_nombre}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">NIT/CC</p>
                  <p className="font-medium">{viewingInvoice.tienda_cedula}</p>
                </div>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Cant</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingInvoice.items.map((item, index) => (
                    <TableRow key={index} className={item.es_devolucion ? 'bg-orange-50' : ''}>
                      <TableCell>
                        {item.producto_codigo} - {item.producto_nombre}
                        {item.es_devolucion && <span className="ml-2 text-xs text-orange-600">(DEV)</span>}
                      </TableCell>
                      <TableCell className="text-center">{item.cantidad}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.precio_unitario)}</TableCell>
                      <TableCell className="text-right">
                        {item.es_devolucion ? '-' : ''}{formatCurrency(item.cantidad * item.precio_unitario)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatCurrency(viewingInvoice.subtotal)}</span>
                </div>
                {viewingInvoice.total_devoluciones > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Devoluciones:</span>
                    <span className="font-mono">-{formatCurrency(viewingInvoice.total_devoluciones)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>IVA (19%):</span>
                  <span className="font-mono">{formatCurrency(viewingInvoice.iva)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>TOTAL:</span>
                  <span className="font-mono">{formatCurrency(viewingInvoice.total)}</span>
                </div>
              </div>
              
              {viewingInvoice.observaciones && (
                <div>
                  <p className="text-muted-foreground text-sm">Observaciones</p>
                  <p>{viewingInvoice.observaciones}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={() => viewingInvoice && printInvoice(viewingInvoice)} className="gap-2">
              <Printer className="w-4 h-4" />
              Imprimir Tirilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
