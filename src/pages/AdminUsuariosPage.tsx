import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCrm } from '@/hooks/useCrm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Shield, ShieldCheck, User as UserIcon, Loader2, Pencil, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface UserWithRole {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  active: boolean;
  role: 'admin' | 'operador' | 'usuario';
  role_id: string;
}

const ROLE_META: Record<string, { label: string; color: string; icon: typeof Shield; description: string }> = {
  admin: { label: 'Administrador', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: ShieldCheck, description: 'Acceso total + gestión de usuarios' },
  operador: { label: 'Operador', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: Shield, description: 'Puede crear, editar y mover tarjetas' },
  usuario: { label: 'Usuario', color: 'bg-muted text-muted-foreground', icon: UserIcon, description: 'Solo lectura' },
};

export default function AdminUsuariosPage() {
  const { user } = useAuth();
  const { isAdmin } = useCrm();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Edit dialog
  const [editUser, setEditUser] = useState<UserWithRole | null>(null);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editActive, setEditActive] = useState(true);

  // Add user dialog
  const [showAddUser, setShowAddUser] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'operador' | 'usuario'>('usuario');
  const [addingUser, setAddingUser] = useState(false);

  useEffect(() => {
    if (!user || !isAdmin) return;
    loadUsers();
  }, [user, isAdmin]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('user_id, display_name, avatar_url, active'),
        supabase.from('user_roles').select('id, user_id, role'),
      ]);

      if (profilesRes.error || rolesRes.error) {
        toast.error('Error al cargar usuarios');
        return;
      }

      const profiles = profilesRes.data || [];
      const roles = rolesRes.data || [];

      const merged: UserWithRole[] = profiles.map(p => {
        const userRole = roles.find(r => r.user_id === p.user_id);
        return {
          user_id: p.user_id,
          display_name: p.display_name,
          avatar_url: p.avatar_url,
          active: (p as any).active !== false,
          role: (userRole?.role as 'admin' | 'operador' | 'usuario') || 'usuario',
          role_id: userRole?.id || '',
        };
      });

      setUsers(merged.sort((a, b) => {
        const order = { admin: 0, operador: 1, usuario: 2 };
        return order[a.role] - order[b.role];
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: 'admin' | 'operador' | 'usuario') => {
    if (targetUserId === user?.id) {
      toast.error('No podés cambiar tu propio rol');
      return;
    }

    setUpdating(targetUserId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole } as any)
        .eq('user_id', targetUserId);

      if (error) {
        toast.error('Error al actualizar rol: ' + error.message);
        return;
      }

      setUsers(prev => prev.map(u =>
        u.user_id === targetUserId ? { ...u, role: newRole } : u
      ));
      toast.success(`Rol actualizado a ${ROLE_META[newRole].label}`);
    } finally {
      setUpdating(null);
    }
  };

  const openEditDialog = (u: UserWithRole) => {
    setEditUser(u);
    setEditName(u.display_name || '');
    setEditAvatar(u.avatar_url || '');
    setEditActive(u.active);
  };

  const handleSaveProfile = async () => {
    if (!editUser) return;
    setUpdating(editUser.user_id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: editName.trim() || null,
          avatar_url: editAvatar.trim() || null,
          active: editActive,
        } as any)
        .eq('user_id', editUser.user_id);

      if (error) {
        toast.error('Error al actualizar perfil: ' + error.message);
        return;
      }

      setUsers(prev => prev.map(u =>
        u.user_id === editUser.user_id
          ? { ...u, display_name: editName.trim() || null, avatar_url: editAvatar.trim() || null, active: editActive }
          : u
      ));
      toast.success('Perfil actualizado');
      setEditUser(null);
    } finally {
      setUpdating(null);
    }
  };

  const handleAddUser = async () => {
    if (!newEmail || !newPassword) {
      toast.error('Email y contraseña son requeridos');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setAddingUser(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('create-user', {
        body: { email: newEmail, password: newPassword, display_name: newDisplayName || newEmail, role: newRole },
      });
      if (res.error || res.data?.error) {
        toast.error(res.data?.error || res.error?.message || 'Error al crear usuario');
        return;
      }
      toast.success('Usuario creado exitosamente');
      setShowAddUser(false);
      setNewEmail('');
      setNewPassword('');
      setNewDisplayName('');
      setNewRole('usuario');
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear usuario');
    } finally {
      setAddingUser(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">Acceso restringido</h2>
            <p className="text-sm text-muted-foreground">Solo los administradores pueden acceder a esta sección.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h1>
          <p className="text-sm text-muted-foreground mt-1">Administrá los roles y permisos del equipo</p>
        </div>
        <Button onClick={() => setShowAddUser(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Agregar Usuario
        </Button>
      </div>

      {/* Role legend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {Object.entries(ROLE_META).map(([key, meta]) => (
          <Card key={key} className="border">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <meta.icon className="h-4 w-4" />
                <span className="font-medium text-sm">{meta.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{meta.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Equipo</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Rol actual</TableHead>
                  <TableHead className="w-[200px]">Cambiar rol</TableHead>
                  <TableHead className="w-[80px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => {
                  const meta = ROLE_META[u.role];
                  const isSelf = u.user_id === user?.id;
                  return (
                    <TableRow key={u.user_id} className={!u.active ? 'opacity-50' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium overflow-hidden">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              (u.display_name || '?')[0].toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{u.display_name || 'Sin nombre'}</p>
                            {isSelf && <span className="text-xs text-muted-foreground">(vos)</span>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.active ? "default" : "secondary"}>
                          {u.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={meta.color}>
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isSelf ? (
                          <span className="text-xs text-muted-foreground">No editable</span>
                        ) : (
                          <Select
                            value={u.role}
                            onValueChange={(v) => handleRoleChange(u.user_id, v as any)}
                            disabled={updating === u.user_id}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="operador">Operador</SelectItem>
                              <SelectItem value="usuario">Usuario</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        {!isSelf && (
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(u)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit profile dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar perfil de {editUser?.display_name || 'usuario'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nombre de usuario" />
            </div>
            <div>
              <Label>Avatar URL</Label>
              <Input value={editAvatar} onChange={e => setEditAvatar(e.target.value)} placeholder="https://..." />
              {editAvatar && (
                <div className="mt-2 flex justify-center">
                  <img src={editAvatar} alt="Preview" className="w-16 h-16 rounded-full object-cover border" />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <Label>Cuenta activa</Label>
              <Switch checked={editActive} onCheckedChange={setEditActive} />
            </div>
            {!editActive && (
              <p className="text-xs text-destructive">Al desactivar la cuenta, el usuario no podrá operar en el sistema.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button onClick={handleSaveProfile} disabled={updating === editUser?.user_id}>
              {updating === editUser?.user_id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add user dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Agregar nuevo usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} placeholder="Nombre del usuario" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="usuario@email.com" />
            </div>
            <div>
              <Label>Contraseña *</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <Label>Rol</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as any)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="usuario">Usuario</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUser(false)}>Cancelar</Button>
            <Button onClick={handleAddUser} disabled={addingUser}>
              {addingUser ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Crear Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
