'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function ProtectedLayout({ children }) {
  const supabase = createClient()
  const router = useRouter()
  
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [userLocation, setUserLocation] = useState('📡 Obteniendo ubicación...')

  useEffect(() => {
    const initApp = async () => {
      // 1. Verificar sesión
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push('/login')
        return
      }
      setUser(user)

      // 2. Cargar perfil completo desde la tabla profiles (NO de user_metadata)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setProfile(profileData)

      // 3. Geolocalización
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=es`
              )
              const data = await response.json()
              const addr = data.address || {}
              const city = addr.city || addr.town || addr.municipality || addr.county || 'Ciudad'
              const dept = addr.state || addr.region || 'Departamento'
              const locationStr = `${city}, ${dept}`
              setUserLocation(` ${locationStr}`)
              
              await supabase
                .from('profiles')
                .update({ user_location: locationStr })
                .eq('id', user.id)
            } catch (err) {
              setUserLocation('📍 Ubicación no disponible')
            }
          },
          () => setUserLocation('⚠️ Permiso denegado'),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        )
      } else {
        setUserLocation('⚠️ No soportada')
      }
    }

    initApp()
  }, [supabase, router])

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
          <p className="text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar userRole={profile.role} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm z-10">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Sistema de Certificaciones</h2>
            <p className="text-xs text-gray-500">Fundación Oxígeno - Istmina, Chocó</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
              <span className="text-blue-600">📍</span>
              <span className="font-medium text-gray-700">{userLocation}</span>
            </div>

            <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
              <div className="text-right hidden sm:block">
                {/* ✅ AHORA LEE DE profile, NO de user_metadata */}
                <p className="text-sm font-semibold text-gray-900">{profile.full_name || 'Usuario'}</p>
                <p className="text-xs text-gray-500">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                    profile.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                    profile.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {profile.role}
                  </span>
                </p>
              </div>
              <button 
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.push('/login')
                  router.refresh()
                }}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Cerrar Sesión"
              >
                🚪
              </button>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-8 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
}