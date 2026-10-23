'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Sidebar({ userRole }) {
  const pathname = usePathname()
  const supabase = createClient()
  const router = useRouter()

  // ✅ 1. Definimos TODAS las rutas con sus roles permitidos
  const allMenuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊', roles: ['ADMIN', 'MANAGER', 'VIEWER'] },
    { name: 'Certificados', href: '/certificados', icon: '📄', roles: ['ADMIN', 'MANAGER', 'VIEWER'] },
    { name: 'Plantillas', href: '/plantillas', icon: '📝', roles: ['ADMIN', 'MANAGER'] },
    { name: 'Usuarios', href: '/usuarios', icon: '👥', roles: ['ADMIN'] },
    { name: 'Configuración', href: '/configuracion', icon: '⚙️', roles: ['ADMIN', 'MANAGER', 'VIEWER'] },
    { name: 'Validar Certificado', href: '/validar', icon: '🔍', roles: ['ADMIN', 'MANAGER', 'VIEWER'] },
  ]

  // ✅ 2. Filtramos la lista según el rol del usuario actual
  const menuItems = allMenuItems.filter(item => 
    item.roles.includes(userRole || 'VIEWER')
  )

  // ✅ 3. Función para cerrar sesión
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside 
      className="w-64 flex flex-col h-screen shadow-lg"
      style={{
        background: `
          radial-gradient(
            ellipse at 50% 45%,
            #43878d 0%,
            #34777e 30%,
            #286971 58%,
            #164b52 80%,
            #082f35 100%
          )
        `,
      }}
    >
      {/* Logo Area */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          {/* ✅ Logo real desde la carpeta public */}
          <img 
            src="/1.1.oxigeno.png" 
            alt="Fundación Oxígeno" 
            className="w-20 h-18 object-contain drop-shadow-md"
          />
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Fundación Oxígeno</h1>
            <p className="text-xs text-white/70">Istmina, Chocó</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-white/20 text-white shadow-sm border-l-4 border-white' 
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* ✅ Botón de Cerrar Sesión */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600/80 hover:bg-red-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <svg 
            className="w-5 h-5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
            />
          </svg>
          Cerrar Sesión
        </button>
      </div>

      {/* Footer del Sidebar */}
      <div className="px-4 pb-4">
        <p className="text-xs text-white/50 text-center">
          v1.0.0 &copy; {new Date().getFullYear()}
        </p>
      </div>
    </aside>
  )
}