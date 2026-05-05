import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  LayoutDashboard,
  Store,
  Package,
  Truck,
  Route,
  LogOut,
  Menu,
  X,
  Search,
  FileCode,
  User,
  Users,
  Receipt,
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasPermission, isAdmin } = useAuth();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { path: '/tiendas', label: 'Tiendas', icon: Store, show: hasPermission('tiendas_ver') },
    { path: '/facturas', label: 'Facturación', icon: Receipt, show: hasPermission('facturas_ver') },
    { path: '/reportes', label: 'Reportes', icon: FileSpreadsheet, show: hasPermission('reportes_ver') },
    { path: '/productos', label: 'Productos', icon: Package, show: hasPermission('productos_ver') },
    { path: '/proveedores', label: 'Proveedores', icon: Truck, show: hasPermission('proveedores_ver') },
    { path: '/rutas', label: 'Rutas', icon: Route, show: true },
    { path: '/usuarios', label: 'Usuarios', icon: Users, show: hasPermission('usuarios_gestionar') },
    { path: '/export-sql', label: 'Export SQL', icon: FileCode, show: isAdmin() },
  ].filter(item => item.show);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/tiendas?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-muted rounded-lg"
            data-testid="mobile-menu-btn"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-foreground" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Panadería Holandesa
          </span>
          <div className="w-9" />
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <Store className="w-8 h-8 text-accent" strokeWidth={1.5} />
              <div>
                <h1 className="font-bold text-foreground" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Panadería
                </h1>
                <p className="text-xs text-muted-foreground">Holandesa</p>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-muted rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "sidebar-link",
                    isActive && "active"
                  )}
                  data-testid={`nav-${item.path.replace('/', '')}`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center">
                <User className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.nombre}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.rol === 'admin' ? 'Administrador' : 'Vendedor'}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut className="w-5 h-5" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Desktop header */}
        <header className="hidden lg:flex items-center justify-between px-8 py-4 bg-card border-b border-border">
          <form onSubmit={handleSearch} className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por cédula, nombre o tienda..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input w-full"
              data-testid="global-search-input"
            />
          </form>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('es-CO', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8 mt-14 lg:mt-0">
          {children}
        </main>
      </div>
    </div>
  );
}
