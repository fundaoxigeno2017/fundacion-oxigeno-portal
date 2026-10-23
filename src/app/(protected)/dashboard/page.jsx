import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. Obtener estadísticas reales
  const { count: totalCerts } = await supabase
    .from('certificates')
    .select('*', { count: 'exact', head: true })

  const { count: activeCerts } = await supabase
    .from('certificates')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  const { count: revokedCerts } = await supabase
    .from('certificates')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'revoked')

  const { count: templates } = await supabase
    .from('templates')
    .select('*', { count: 'exact', head: true })
    .eq('is_current', true)

  // 2. Obtener actividad reciente (últimos 5 certificados)
  const { data: recentCerts } = await supabase
    .from('certificates')
    .select(`
      id, code, emp_name, created_at, status,
      profiles!certificates_created_by_fkey (full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Panel de Control</h1>
        <p className="text-gray-500 mt-1">Resumen general del sistema de certificaciones.</p>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Emitidos</p>
              <p className="text-4xl font-bold text-blue-900 mt-2">{totalCerts || 0}</p>
            </div>
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-2xl">📝</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-green-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Activos</p>
              <p className="text-4xl font-bold text-green-600 mt-2">{activeCerts || 0}</p>
            </div>
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center text-2xl">✅</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-red-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revocados</p>
              <p className="text-4xl font-bold text-red-600 mt-2">{revokedCerts || 0}</p>
            </div>
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-2xl">🚫</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-purple-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Plantillas</p>
              <p className="text-4xl font-bold text-purple-600 mt-2">{templates || 0}</p>
            </div>
            <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center text-2xl">📝</div>
          </div>
        </div>
      </div>

      {/* Actividad Reciente */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Actividad Reciente</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 text-sm">
              <tr>
                <th className="px-6 py-3 font-medium">Código</th>
                <th className="px-6 py-3 font-medium">Empleado</th>
                <th className="px-6 py-3 font-medium">Creado por</th>
                <th className="px-6 py-3 font-medium">Fecha</th>
                <th className="px-6 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentCerts && recentCerts.length > 0 ? (
                recentCerts.map((cert) => (
                  <tr key={cert.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-blue-900">{cert.code}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{cert.emp_name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{cert.profiles?.full_name || 'Sistema'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(cert.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        cert.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {cert.status === 'active' ? 'Activo' : 'Revocado'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No hay certificados emitidos recientemente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}