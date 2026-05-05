import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Checkbox } from '../components/ui/checkbox';
import { Plus, Edit, Trash2, Users, Loader2, Shield, ShieldCheck, ShieldX } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const emptyUser = {
  email: '',
  nombre: '',
  password: '',
  rol: 'vendedor',
  ruta_asignada: '',
  permisos: []
};

export default function UsersManagement() {
  const { hasPermission, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [allPermissions, setAllPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(emptyUser);
  const [userToDelete, setUserToDelete] = useState(null);

  const canManageUsers = hasPermission('usuarios_gestionar');

  const fetchData = async () => {
    try {
      const [usersRes, routesRes, permsRes] = await Promise.all([
        axios.get(`${API_URL}/users`),
        axios.get(`${API_URL}/routes`),
        axios.get(`${API_URL}/permissions`)
      ]);
      setUsers(usersRes.data);
      setRoutes(routesRes.data);
      setAllPermissions(permsRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManageUsers) {
      fetchData();
    }
  }, [canManageUsers]);

  const handleOpenNew = () => {
    setEditingUser(null);
    setFormData(emptyUser);
    setDialogOpen(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      nombre: user.nombre,
      password: '',
      rol: user.rol,
      ruta_asignada: user.ruta_asignada || '',
      permisos: user.permisos || []
    });
    setDialogOpen(true);
  };

  const handleDelete = (user) => {
    if (user.id === currentUser.id) {
      toast.error('No puedes eliminarte a ti mismo');
      return;
    }
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    
    try {
      await axios.delete(`${API_URL}/users/${userToDelete.id}`);
      toast.success('Usuario eliminado correctamente');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar usuario');
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = { ...formData };
      if (!payload.password) delete payload.password;
      if (!payload.ruta_asignada) payload.ruta_asignada = null;

      if (editingUser) {
        await axios.put(`${API_URL}/users/${editingUser.id}`, payload);
        toast.success('Usuario actualizado correctamente');
      } else {
        await axios.post(`${API_URL}/users`, payload);
        toast.success('Usuario creado correctamente');
      }
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al guardar usuario';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const togglePermission = (permission) => {
    setFormData(prev => ({
      ...prev,
      permisos: prev.permisos.includes(permission)
        ? prev.permisos.filter(p => p !== permission)
        : [...prev.permisos, permission]
    }));
  };

  const toggleAllPermissions = () => {
    const allPerms = Object.keys(allPermissions);
    if (formData.permisos.length === allPerms.length) {
      setFormData(prev => ({ ...prev, permisos: [] }));
    } else {
      setFormData(prev => ({ ...prev, permisos: allPerms }));
    }
  };

  if (!canManageUsers) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ShieldX className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">Sin permisos</h3>
          <p className="text-muted-foreground">No tienes permisos para gestionar usuarios</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="users-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Gestión de Usuarios
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra usuarios y sus permisos
          </p>
        </div>
        <Button onClick={handleOpenNew} className="gap-2" data-testid="new-user-btn">
          <Plus className="w-4 h-4" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="spinner w-8 h-8" />
            </div>
          ) : users.length === 0 ? (
            <div className="empty-state py-16">
              <Users className="empty-state-icon" />
              <h3 className="text-lg font-medium">No hay usuarios</h3>
              <Button onClick={handleOpenNew} className="mt-4 gap-2">
                <Plus className="w-4 h-4" />
                Nuevo Usuario
              </Button>
            </div>
          ) : (
            <div className="table-container">
              <Table className="data-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Ruta Asignada</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                      <TableCell className="font-medium">{user.nombre}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.rol === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.rol === 'admin' ? 'Administrador' : 'Vendedor'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.ruta_asignada 
                          ? routes.find(r => r.id === user.ruta_asignada)?.nombre || user.ruta_asignada
                          : <span className="text-muted-foreground">Todas</span>
                        }
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.activo 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEdit(user)}
                            data-testid={`edit-user-${user.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {user.id !== currentUser.id && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(user)}
                              data-testid={`delete-user-${user.id}`}
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
              {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    required
                    data-testid="user-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                    data-testid="user-email-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Contraseña {editingUser ? '(dejar vacío para no cambiar)' : '*'}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    required={!editingUser}
                    data-testid="user-password-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rol">Rol *</Label>
                  <Select 
                    value={formData.rol} 
                    onValueChange={(value) => handleInputChange('rol', value)}
                  >
                    <SelectTrigger data-testid="user-role-select">
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="vendedor">Vendedor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="ruta_asignada">Ruta Asignada</Label>
                  <Select 
                    value={formData.ruta_asignada || 'none'} 
                    onValueChange={(value) => handleInputChange('ruta_asignada', value === 'none' ? '' : value)}
                  >
                    <SelectTrigger data-testid="user-route-select">
                      <SelectValue placeholder="Todas las rutas (Admin)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Todas las rutas (Admin)</SelectItem>
                      {routes.map(route => (
                        <SelectItem key={route.id} value={route.id}>{route.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Si se asigna una ruta, el usuario solo podrá ver y gestionar esa ruta
                  </p>
                </div>
              </div>

              {/* Permissions */}
              {formData.rol !== 'admin' && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Permisos
                      </CardTitle>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={toggleAllPermissions}
                      >
                        {formData.permisos.length === Object.keys(allPermissions).length 
                          ? 'Quitar todos' 
                          : 'Seleccionar todos'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(allPermissions).map(([key, label]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={key}
                            checked={formData.permisos.includes(key)}
                            onCheckedChange={() => togglePermission(key)}
                          />
                          <label
                            htmlFor={key}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {formData.rol === 'admin' && (
                <div className="flex items-center gap-2 p-4 bg-purple-50 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-purple-800">
                    Los administradores tienen acceso completo a todas las funciones
                  </span>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} data-testid="user-submit-btn">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  editingUser ? 'Actualizar' : 'Crear Usuario'
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
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el usuario
              <strong> {userToDelete?.nombre}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
