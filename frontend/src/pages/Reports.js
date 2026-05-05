import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { FileSpreadsheet, Download, Calendar, TrendingUp, Package, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function Reports() {
  const { hasPermission, getUserRoute, isAdmin, user } = useAuth();
  const [report, setReport] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterRoute, setFilterRoute] = useState('all');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  const userRoute = getUserRoute();
  const canExport = hasPermission('exportar_excel');

  useEffect(() => {
    fetchRoutes();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [filterRoute, filterDate]);

  const fetchRoutes = async () => {
    try {
      const response = await axios.get(`${API_URL}/routes`);
      setRoutes(response.data);
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('fecha', filterDate);
      if (filterRoute && filterRoute !== 'all') {
        params.append('ruta_id', filterRoute);
      }
      
      const response = await axios.get(`${API_URL}/reports/daily-sales?${params.toString()}`);
      setReport(response.data);
    } catch (error) {
      toast.error('Error al cargar reporte');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams();
      params.append('fecha', filterDate);
      if (filterRoute && filterRoute !== 'all') {
        params.append('ruta_id', filterRoute);
      }
      
      const response = await axios.get(`${API_URL}/reports/export-excel?${params.toString()}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ventas_${filterDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Reporte exportado correctamente');
    } catch (error) {
      toast.error('Error al exportar reporte');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="reports-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Reporte de Ventas
          </h1>
          <p className="text-muted-foreground mt-1">
            Resumen de ventas diarias por ruta
          </p>
        </div>
        {canExport && (
          <Button onClick={handleExportExcel} className="gap-2" data-testid="export-excel-btn">
            <Download className="w-4 h-4" />
            Exportar Excel
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
                data-testid="report-date-input"
              />
            </div>
            {isAdmin() && (
              <div className="flex-1">
                <Label className="text-sm text-muted-foreground mb-2 block">Ruta</Label>
                <Select value={filterRoute} onValueChange={setFilterRoute}>
                  <SelectTrigger data-testid="report-route-select">
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

      {/* Report Header Info */}
      {report && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Fecha</p>
                  <p className="text-lg font-bold">{report.fecha}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Ruta</p>
                  <p className="text-lg font-bold">{report.ruta}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Facturas del día</p>
                  <p className="text-lg font-bold">{report.facturas_count}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Encargado</p>
                  <p className="text-lg font-bold">{report.encargado}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            <Package className="w-5 h-5 text-accent" />
            Detalle de Productos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="spinner w-8 h-8" />
            </div>
          ) : !report || report.productos.length === 0 ? (
            <div className="empty-state py-16">
              <FileSpreadsheet className="empty-state-icon" />
              <h3 className="text-lg font-medium">Sin datos</h3>
              <p className="text-muted-foreground mt-1">
                No hay ventas registradas para la fecha seleccionada
              </p>
            </div>
          ) : (
            <div className="table-container">
              <Table className="data-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre Producto</TableHead>
                    <TableHead className="text-center">Cantidad Vendida</TableHead>
                    <TableHead className="text-center">
                      <span className="flex items-center justify-center gap-1">
                        <RotateCcw className="w-3 h-3" />
                        Devoluciones
                      </span>
                    </TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.productos.map((product, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono font-medium">{product.codigo}</TableCell>
                      <TableCell>{product.nombre}</TableCell>
                      <TableCell className="text-center">{product.cantidad_vendida}</TableCell>
                      <TableCell className="text-center text-orange-600">
                        {product.cantidad_devuelta > 0 ? product.cantidad_devuelta : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(product.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Totals */}
      {report && report.productos.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Total Ventas</p>
                <p className="text-2xl font-bold text-green-700 font-mono">
                  {formatCurrency(report.total_ventas)}
                </p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-600 font-medium">Total Devoluciones</p>
                <p className="text-2xl font-bold text-orange-700 font-mono">
                  -{formatCurrency(report.total_devoluciones)}
                </p>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-primary font-medium">TOTAL NETO</p>
                <p className="text-3xl font-bold text-primary font-mono">
                  {formatCurrency(report.total_neto)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
