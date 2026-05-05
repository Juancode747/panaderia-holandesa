import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Store, Package, Truck, Receipt, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function Dashboard() {
  const { user, getUserRoute } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const userRoute = getUserRoute();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      toast.error('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  const statCards = [
    { 
      title: 'Total Tiendas', 
      value: stats?.total_tiendas || 0, 
      icon: Store, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      title: 'Ventas Hoy', 
      value: formatCurrency(stats?.ventas_hoy || 0), 
      icon: DollarSign, 
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    { 
      title: 'Facturas Hoy', 
      value: stats?.facturas_hoy || 0, 
      icon: Receipt, 
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    { 
      title: 'Productos', 
      value: stats?.total_productos || 0, 
      icon: Package, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in" data-testid="dashboard-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: 'Manrope, sans-serif' }}>
          ¡Hola, {user?.nombre}!
        </h1>
        <p className="text-muted-foreground mt-1">
          {userRoute 
            ? `Tu ruta: ${stats?.tiendas_por_ruta?.find(r => r.nombre.includes(user?.nombre))?.nombre || 'Asignada'}`
            : 'Resumen general del sistema de gestión'
          }
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="stat-card" data-testid={`stat-card-${index}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="stat-value mt-2">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stores per Route */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <TrendingUp className="w-5 h-5 text-accent" />
              Tiendas por Ruta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.tiendas_por_ruta?.map((item, index) => {
                const colors = ['bg-sky-500', 'bg-rose-500'];
                const maxValue = Math.max(...stats.tiendas_por_ruta.map(v => v.tiendas), 1);
                const percentage = (item.tiendas / maxValue) * 100;
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.nombre}</span>
                      <span className="text-sm text-muted-foreground">{item.tiendas} tiendas</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${colors[index % colors.length]} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {(!stats?.tiendas_por_ruta || stats.tiendas_por_ruta.length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  No hay datos disponibles
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stores per Day */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <Calendar className="w-5 h-5 text-accent" />
              Entregas por Día
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.tiendas_por_dia?.map((item, index) => {
                const colors = [
                  'bg-blue-500', 'bg-purple-500', 'bg-yellow-500', 
                  'bg-green-500', 'bg-orange-500', 'bg-pink-500'
                ];
                const maxValue = Math.max(...stats.tiendas_por_dia.map(v => v.tiendas), 1);
                const percentage = (item.tiendas / maxValue) * 100;
                
                return (
                  <div key={index} className="flex items-center gap-4">
                    <span className="text-sm font-medium w-24">{item.dia}</span>
                    <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                      <div 
                        className={`h-full ${colors[index % colors.length]} rounded flex items-center justify-end pr-2 transition-all duration-500`}
                        style={{ width: `${Math.max(percentage, 10)}%` }}
                      >
                        <span className="text-xs text-white font-medium">{item.tiendas}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a 
              href="/facturas" 
              className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-center group"
              data-testid="quick-action-invoice"
            >
              <Receipt className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-accent transition-colors" />
              <p className="text-sm mt-2 font-medium">Nueva Factura</p>
            </a>
            <a 
              href="/tiendas?action=new" 
              className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-center group"
              data-testid="quick-action-new-store"
            >
              <Store className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-accent transition-colors" />
              <p className="text-sm mt-2 font-medium">Nueva Tienda</p>
            </a>
            <a 
              href="/reportes" 
              className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-center group"
              data-testid="quick-action-reports"
            >
              <TrendingUp className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-accent transition-colors" />
              <p className="text-sm mt-2 font-medium">Ver Reportes</p>
            </a>
            <a 
              href="/rutas" 
              className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-center group"
              data-testid="quick-action-routes"
            >
              <Calendar className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-accent transition-colors" />
              <p className="text-sm mt-2 font-medium">Ver Rutas</p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
