'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PlantillasPage() {
  const supabase = createClient()
  
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showVersionsModal, setShowVersionsModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [selectedVersions, setSelectedVersions] = useState([])
  
  // Estados del formulario
  const [cargo, setCargo] = useState('')
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [changeLog, setChangeLog] = useState('')
  const [saving, setSaving] = useState(false)

  // Placeholders disponibles
  const placeholders = [
    '{{nombres}}', '{{tipoDocumento}}', '{{numeroDocumento}}',
    '{{tipoContrato}}', '{{fechaInicio}}', '{{fechaFin}}',
    '{{numeroContrato}}', '{{regional}}', '{{anio}}',
    '{{modalidad}}', '{{ciudad}}', '{{mes}}', '{{anioExp}}',
    '{{codigo}}', '{{nit}}'
  ]

  // Cargar plantillas al montar
  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('is_current', true)
        .eq('is_active', true)
        .order('cargo', { ascending: true })

      if (error) throw error
      setTemplates(data || [])
    } catch (err) {
      console.error('Error cargando plantillas:', err)
    } finally {
      setLoading(false)
    }
  }

  // Abrir modal para crear nueva plantilla
  const handleNewTemplate = () => {
    setEditingTemplate(null)
    setCargo('')
    setName('')
    setContent('')
    setChangeLog('')
    setShowModal(true)
  }

  // Abrir modal para editar (crear nueva versión)
  const handleEditTemplate = (template) => {
    setEditingTemplate(template)
    setCargo(template.cargo)
    setName(template.name)
    setContent(template.content)
    setChangeLog('')
    setShowModal(true)
  }

  // Guardar plantilla (crear o nueva versión)
  const handleSave = async () => {
    if (!cargo || !name || !content) {
      alert('Por favor completa todos los campos obligatorios')
      return
    }

    setSaving(true)
    try {
      if (editingTemplate) {
        // Crear nueva versión
        const { data: newVersion, error } = await supabase
          .from('templates')
          .insert([{
            cargo: cargo,
            name: name,
            content: content,
            version: editingTemplate.version + 1,
            is_current: true,
            parent_id: editingTemplate.id,
            change_log: changeLog || `Actualización desde versión ${editingTemplate.version}`
          }])
          .select()
          .single()

        if (error) throw error

        // Marcar la versión anterior como no actual
        await supabase
          .from('templates')
          .update({ is_current: false })
          .eq('id', editingTemplate.id)

        alert(`✅ Nueva versión ${newVersion.version} creada exitosamente`)
      } else {
        // Crear nueva plantilla
        const { data: newTemplate, error } = await supabase
          .from('templates')
          .insert([{
            cargo: cargo,
            name: name,
            content: content,
            version: 1,
            is_current: true
          }])
          .select()
          .single()

        if (error) throw error
        alert('✅ Plantilla creada exitosamente')
      }

      setShowModal(false)
      await loadTemplates()
    } catch (err) {
      console.error('Error guardando:', err)
      alert(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // Ver versiones de una plantilla
  const handleViewVersions = async (template) => {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('cargo', template.cargo)
        .eq('is_active', true)
        .order('version', { ascending: false })

      if (error) throw error
      setSelectedVersions(data || [])
      setShowVersionsModal(true)
    } catch (err) {
      console.error('Error cargando versiones:', err)
    }
  }

  // Activar una versión específica
  const handleActivateVersion = async (templateId) => {
    if (!confirm('¿Activar esta versión? La versión actual quedará como histórica.')) return

    try {
      // Desactivar todas las versiones del mismo cargo
      const versionToActivate = selectedVersions.find(v => v.id === templateId)
      await supabase
        .from('templates')
        .update({ is_current: false })
        .eq('cargo', versionToActivate.cargo)

      // Activar la versión seleccionada
      await supabase
        .from('templates')
        .update({ is_current: true })
        .eq('id', templateId)

      alert('✅ Versión activada')
      setShowVersionsModal(false)
      await loadTemplates()
    } catch (err) {
      console.error('Error activando versión:', err)
      alert(`Error: ${err.message}`)
    }
  }

  // Eliminar plantilla (desactivar)
  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('¿Eliminar esta plantilla? Esta acción desactivará todas sus versiones.')) return

    try {
      const template = templates.find(t => t.id === templateId)
      
      // Desactivar todas las versiones del mismo cargo
      await supabase
        .from('templates')
        .update({ is_active: false })
        .eq('cargo', template.cargo)

      alert('✅ Plantilla eliminada')
      await loadTemplates()
    } catch (err) {
      console.error('Error eliminando:', err)
      alert(`Error: ${err.message}`)
    }
  }

  // Copiar placeholder al portapapeles
  const copyPlaceholder = (placeholder) => {
    navigator.clipboard.writeText(placeholder)
    alert(`✅ ${placeholder} copiado al portapapeles`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
          <p className="text-gray-600">Cargando plantillas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Plantillas de Certificados</h1>
          <p className="text-gray-500 mt-1">Gestiona las plantillas por cargo con control de versiones.</p>
        </div>
        <button
          onClick={handleNewTemplate}
          className="px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors shadow-md flex items-center gap-2"
        >
          <span></span> Nueva Plantilla
        </button>
      </div>

      {/* Placeholders disponibles */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Placeholders Disponibles</h2>
        <p className="text-sm text-gray-600 mb-3">Haz clic en cualquier placeholder para copiarlo al portapapeles:</p>
        <div className="flex flex-wrap gap-2">
          {placeholders.map((p) => (
            <button
              key={p}
              onClick={() => copyPlaceholder(p)}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-mono hover:bg-blue-100 transition-colors border border-blue-200"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de plantillas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Plantillas Activas</h2>
        </div>
        
        {templates.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">📄</div>
            <p className="text-gray-500 text-lg">No hay plantillas creadas</p>
            <p className="text-gray-400 text-sm mt-2">Haz clic en "Nueva Plantilla" para comenzar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Versión</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{template.cargo}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{template.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        v{template.version}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditTemplate(template)}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleViewVersions(template)}
                          className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs"
                        >
                          📜 Versiones
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs"
                        >
                          ️ Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Crear/Editar Plantilla */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingTemplate ? `Editar Plantilla - Nueva Versión` : 'Nueva Plantilla'}
              </h2>
              {editingTemplate && (
                <p className="text-sm text-gray-600 mt-1">
                  Versión actual: v{editingTemplate.version} | Se creará la versión {editingTemplate.version + 1}
                </p>
              )}
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cargo *</label>
                  <input
                    type="text"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-900"
                    placeholder="Ej: Profesional Universitario"
                    disabled={!!editingTemplate}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre descriptivo *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-900"
                    placeholder="Ej: Certificado - Profesional Universitario"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contenido *</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={15}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-900 font-mono text-sm"
                  placeholder="Escribe el contenido de la plantilla usando los placeholders..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Usa los placeholders de arriba para insertar datos dinámicos
                </p>
              </div>

              {editingTemplate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descripción del cambio (opcional)</label>
                  <input
                    type="text"
                    value={changeLog}
                    onChange={(e) => setChangeLog(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-900"
                    placeholder="Ej: Actualización de funciones del cargo"
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Guardando...
                  </>
                ) : (
                  <>💾 {editingTemplate ? 'Crear Nueva Versión' : 'Guardar Plantilla'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Historial de Versiones */}
      {showVersionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Historial de Versiones</h2>
              <p className="text-sm text-gray-600 mt-1">Cargo: {selectedVersions[0]?.cargo}</p>
            </div>
            
            <div className="p-6">
              {selectedVersions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No hay versiones disponibles</p>
              ) : (
                <div className="space-y-3">
                  {selectedVersions.map((version) => (
                    <div
                      key={version.id}
                      className={`p-4 border rounded-lg ${
                        version.is_current ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg font-bold text-gray-900">v{version.version}</span>
                            {version.is_current && (
                              <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">ACTIVA</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            Creada: {new Date(version.created_at).toLocaleString('es-CO')}
                          </p>
                          {version.change_log && (
                            <p className="text-sm text-gray-700 italic">
                              Cambio: {version.change_log}
                            </p>
                          )}
                        </div>
                        {!version.is_current && (
                          <button
                            onClick={() => handleActivateVersion(version.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                          >
                            ✅ Activar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowVersionsModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}