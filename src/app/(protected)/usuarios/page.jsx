'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function UsuariosPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState(null)
  
  const [formData, setFormData] = useState({
    fullName: '', username: '', email: '', password: '', role: 'VIEWER'
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const role = profile?.role || 'VIEWER'
      setCurrentUserRole(role)

      if (role !== 'ADMIN') {
        router.push('/dashboard')
        return
      }

      await loadUsers()
    }
    init()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error cargando usuarios:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCreateUser = async () => {
    if (!formData.fullName || !formData.username || !formData.email || !formData.password) {
      alert('Por favor completa todos los campos')
      return
    }
    if (formData.password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setSaving(true)
    try {
      // Usamos signUp normal (los métodos admin no funcionan en el navegador por seguridad)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            username: formData.username,
            role: formData.role
          }
        }
      })

      if (signUpError) throw signUpError
      
      if (signUpData.user) {
        // El trigger 'handle_new_user' ya crea el perfil, pero actualizamos para asegurar
        await supabase.from('profiles').update({ 
          role: formData.role, 
          is_active: true, 
          email: formData.email 
        }).eq('id', signUpData.user.id)
      }

      alert(`✅ Usuario ${formData.fullName} creado exitosamente`)
      setShowForm(false)
      setFormData({ fullName: '', username: '', email: '', password: '', role: 'VIEWER' })
      await loadUsers()
    } catch (err) {
      console.error('Error creando usuario:', err)
      alert(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

    const handleToggleActive = async (userId, currentStatus) => {
    const newStatus = !currentStatus;
    const action = currentStatus ? 'desactivar' : 'activar'
    
    // 1. Actualización inmediata en la pantalla (Optimistic UI)
    setUsers(prevUsers => 
      prevUsers.map(u => u.id === userId ? { ...u, is_active: newStatus } : u)
    );

    try {
      // 2. Enviar la orden a la base de datos
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', userId)

      if (error) {
        console.error('❌ Error de Supabase:', error)
        // 3. Si falla, revertimos el cambio visual
        setUsers(prevUsers => 
          prevUsers.map(u => u.id === userId ? { ...u, is_active: currentStatus } : u)
        );
        alert(`Error al ${action}: ${error.message}`)
        return
      }

      // 4. Recargar la tabla en segundo plano para asegurar consistencia total
      await loadUsers()
      
    } catch (err) {
      console.error('❌ Error inesperado:', err)
      // Revertir en caso de error de red
      setUsers(prevUsers => 
        prevUsers.map(u => u.id === userId ? { ...u, is_active: currentStatus } : u)
      );
    }
  }

  const handleChangeRole = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error
      alert(`✅ Rol actualizado a ${newRole}`)
      await loadUsers()
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-800'
      case 'MANAGER': return 'bg-blue-100 text-blue-800'
      case 'VIEWER': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
        <p className="text-gray-600">Cargando usuarios...</p>
      </div>
    )
  }

  if (currentUserRole !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">Solo los administradores pueden gestionar usuarios.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-500 mt-1">Administra los usuarios del sistema y sus permisos.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors shadow-md flex items-center gap-2"
        >
          <span>👤</span> Nuevo Usuario
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Usuarios Registrados ({users.length})</h2>
        </div>
        
        {users.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">👥</div>
            <p className="text-gray-500 text-lg">No hay usuarios registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicación</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    {/* ✅ COLUMNA USUARIO CORREGIDA (Nombre y Avatar) */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold">
                          {user.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.full_name || 'Sin nombre'}</div>
                          <div className="text-xs text-gray-500">@{user.username || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-sm text-gray-700">{user.email || 'N/A'}</td>
                    
                    <td className="px-6 py-4">
                      <select
                        value={user.role || 'VIEWER'}
                        onChange={(e) => handleChangeRole(user.id, e.target.value)}
                        className={`px-3 py-1 text-xs font-semibold rounded-full border-0 ${getRoleBadgeColor(user.role)} cursor-pointer`}
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    </td>
                    
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.user_location || '—'}
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        user.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    
                    {/* ✅ COLUMNA ACCIONES CON EL BOTÓN CORREGIDO */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(user.id, user.is_active !== false)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          user.is_active !== false
                            ? 'bg-orange-600 text-white hover:bg-orange-700' 
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {user.is_active !== false ? '🚫 Desactivar' : '✅ Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Crear Nuevo Usuario */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Nuevo Usuario</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
                <input type="text" value={formData.fullName} onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-gray-900" placeholder="Ej: María Fernanda López" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Usuario *</label>
                <input type="text" value={formData.username} onChange={(e) => handleInputChange('username', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-gray-900" placeholder="Ej: mlopez" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico *</label>
                <input type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-gray-900" placeholder="Ej: maria@fundacionoxigeno.org" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                <input type="password" value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-gray-900" placeholder="Mínimo 6 caracteres" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
                <select value={formData.role} onChange={(e) => handleInputChange('role', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-gray-900">
                  <option value="VIEWER">VIEWER - Solo consulta</option>
                  <option value="MANAGER">MANAGER - Crear certificados y plantillas</option>
                  <option value="ADMIN">ADMIN - Acceso total al sistema</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">Cancelar</button>
              <button onClick={handleCreateUser} disabled={saving}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                {saving ? 'Creando...' : '👤 Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}