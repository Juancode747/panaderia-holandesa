import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Route, Printer, FileText, MapPin, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { cn, getDayClass, getRouteClass } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function Routes() {
  const { getUserRoute, isAdmin } = useAuth();
  const [stores, setStores] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRoute, setFilterRoute] = useState('all');
  const [filterDay, setFilterDay] = useState(getCurrentDay());
  const printRef = useRef(null);

  const userRoute = getUserRoute();

  function getCurrentDay() {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const today = days[new Date().getDay()];
    return today === 'Domingo' ? 'Lunes' : today;
  }

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (filterRoute && filterRoute !== 'all') params.append('ruta_id', filterRoute);
      if (filterDay && filterDay !== 'all') params.append('dia_entrega', filterDay);
      
      const [storesRes, routesRes] = await Promise.all([
        axios.get(`${API_URL}/stores?${params.toString()}`),
        axios.get(`${API_URL}/routes`)
      ]);
      
      setStores(storesRes.data);
      setRoutes(routesRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterRoute, filterDay]);

  const handlePrint = () => {
    const printContent = printRef.current;
    const originalContents = document.body.innerHTML;
    
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  const getSelectedRouteName = () => {
    if (filterRoute === 'all') return 'Todas las rutas';
    return routes.find(r => r.id === filterRoute)?.nombre || '';
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="routes-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Hoja de Ruta
          </h1>
          <p className="text-muted-foreground mt-1">
            Genera la hoja de ruta diaria
          </p>
        </div>
        <Button 
          onClick={handlePrint} 
          className="gap-2"
          disabled={stores.length === 0}
          data-testid="print-route-btn"
        >
          <Printer className="w-4 h-4" />
          Imprimir Ruta
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {isAdmin() && (
              <div className="flex-1">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Ruta</label>
                <Select value={filterRoute} onValueChange={setFilterRoute}>
                  <SelectTrigger data-testid="route-filter-select">
                    <SelectValue placeholder="Seleccionar ruta" />
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
            
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Día de Entrega</label>
              <Select value={filterDay} onValueChange={setFilterDay}>
                <SelectTrigger data-testid="route-day-select">
                  <SelectValue placeholder="Seleccionar día" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los días</SelectItem>
                  {DIAS.map(dia => (
                    <SelectItem key={dia} value={dia}>{dia}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Route Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="card-hover">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-accent/20">
              <Route className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stores.length}</p>
              <p className="text-sm text-muted-foreground">Tiendas en ruta</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold truncate">{getSelectedRouteName()}</p>
              <p className="text-sm text-muted-foreground">Ruta</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{filterDay === 'all' ? 'Todos' : filterDay}</p>
              <p className="text-sm text-muted-foreground">Día de entrega</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Route Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="spinner w-8 h-8" />
            </div>
          ) : stores.length === 0 ? (
            <div className="empty-state py-16">
              <Route className="empty-state-icon" />
              <h3 className="text-lg font-medium">Sin tiendas en ruta</h3>
              <p className="text-muted-foreground mt-1">
                No hay tiendas programadas para los filtros seleccionados
              </p>
            </div>
          ) : (
            <div className="table-container">
              <Table className="data-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Tienda</TableHead>
                    <TableHead>Dueño</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Ruta</TableHead>
                    <TableHead>Día</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.map((store, index) => (
                    <TableRow key={store.id} data-testid={`route-row-${store.id}`}>
                      <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">{store.nombre_tienda}</TableCell>
                      <TableCell>{store.nombre_dueno}</TableCell>
                      <TableCell>{store.telefono}</TableCell>
                      <TableCell className="max-w-xs">
                        <div className="flex items-start gap-1">
                          <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                          <span className="text-sm">{store.direccion}</span>
                        </div>
                      </TableCell>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Print Template (Hidden) */}
      <div className="hidden">
        <div ref={printRef} className="route-sheet">
          <div className="route-sheet-header">
            <h1 className="route-sheet-title">Panadería Holandesa</h1>
            <p className="text-lg">Hoja de Ruta</p>
            <div className="flex justify-center gap-8 mt-4 text-sm">
              <span><strong>Ruta:</strong> {getSelectedRouteName()}</span>
              <span><strong>Día:</strong> {filterDay === 'all' ? 'Todos' : filterDay}</span>
              <span><strong>Fecha:</strong> {new Date().toLocaleDateString('es-CO')}</span>
            </div>
          </div>
          
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">Tienda</th>
                <th className="p-2 text-left">Dueño</th>
                <th className="p-2 text-left">Teléfono</th>
                <th className="p-2 text-left">Dirección</th>
                <th className="p-2 text-left">Entregado</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store, index) => (
                <tr key={store.id} className="border-b">
                  <td className="p-2">{index + 1}</td>
                  <td className="p-2 font-medium">{store.nombre_tienda}</td>
                  <td className="p-2">{store.nombre_dueno}</td>
                  <td className="p-2">{store.telefono}</td>
                  <td className="p-2">{store.direccion}</td>
                  <td className="p-2 text-center">☐</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="mt-8 text-sm text-gray-600">
            <p>Total de tiendas: {stores.length}</p>
            <p className="mt-4">Firma del vendedor: ________________________</p>
          </div>
        </div>
      </div>
    </div>
  );
}
