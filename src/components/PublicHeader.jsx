'use client'

export default function PublicHeader() {
  return (
    <header className="w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo de la Fundación */}
          <div className="w-10 h-10 bg-teal-700 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
            O₂
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Fundación Oxígeno</h1>
            <p className="text-xs text-gray-500">Istmina, Chocó</p>
          </div>
        </div>
        
        {/* Enlace corregido al Dashboard */}
        <a 
          href="/dashboard" 
          className="text-sm text-gray-600 hover:text-teal-700 font-medium transition-colors flex items-center gap-1"
        >
          <span>←</span> Volver
        </a>
      </div>
    </header>
  )
}