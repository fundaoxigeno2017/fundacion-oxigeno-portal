'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ConfiguracionPage() {
  const supabase = createClient()
  
  // Estados para el encabezado
  const [headerLine1, setHeaderLine1] = useState('PROCESO DE INNOVACIÓN Y MEJORA')
  const [headerLine2, setHeaderLine2] = useState('CERTIFICACIONES')
  const [headerLine3, setHeaderLine3] = useState('')
  const [headerLine4, setHeaderLine4] = useState('')
  
  const [docCode, setDocCode] = useState('AF-TH-2')
  const [docVersion, setDocVersion] = useState('1.0.5')
  
  // Estado para el pie de página
  const [footerText, setFooterText] = useState('Fundación Oxígeno - Todos los derechos reservados\nEmitido por: [Usuario] | Ubicación: [Ciudad]')

  // Estados para datos de la fundación
  const [entityName, setEntityName] = useState('')
  const [nit, setNit] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [web, setWeb] = useState('')
  const [email, setEmail] = useState('')
  
  // Estados para representante legal
  const [repName, setRepName] = useState('')
  const [repCC, setRepCC] = useState('')
  const [repRole, setRepRole] = useState('')

  // Estado para las imágenes (URLs desde Supabase o previews locales)
  const [images, setImages] = useState({ logo: null, signature: null, watermark: null })
  
  // Estado para archivos seleccionados (File objects)
  const [selectedFiles, setSelectedFiles] = useState({ logo: null, signature: null, watermark: null })

  // Estado para el botón de guardar
  const [saveStatus, setSaveStatus] = useState('idle') // 'idle' | 'saving' | 'success' | 'error'
  const [loading, setLoading] = useState(true)

  // ✅ Estados para control de permisos por rol
  const [currentUserRole, setCurrentUserRole] = useState(null)
  const [isReadOnly, setIsReadOnly] = useState(true)

  // 1. Cargar rol del usuario al montar
  useEffect(() => {
    const loadUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
          const role = profile?.role || 'VIEWER'
          setCurrentUserRole(role)
          setIsReadOnly(role !== 'ADMIN') // Solo ADMIN puede editar
        }
      } catch (err) {
        console.error('Error cargando rol:', err)
      }
    }
    loadUserRole()
  }, [])

  // 2. Cargar datos existentes al montar
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const { data: settings, error } = await supabase
        .from('entity_settings')
        .select('*')
        .eq('id', 1)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error cargando settings:', error)
        return
      }

      if (settings) {
        setHeaderLine1(settings.header_line1 || 'PROCESO DE INNOVACIÓN Y MEJORA')
        setHeaderLine2(settings.header_line2 || 'CERTIFICACIONES')
        setHeaderLine3(settings.header_line3 || '')
        setHeaderLine4(settings.header_line4 || '')
        setDocCode(settings.doc_code || 'AF-TH-2')
        setDocVersion(settings.doc_version || '1.0.5')
        setFooterText(settings.footer_text || '')
        
        setEntityName(settings.name || '')
        setNit(settings.nit || '')
        setAddress(settings.address || '')
        setPhone(settings.phone || '')
        setWeb(settings.web || '')
        setEmail(settings.email || '')
        
        setRepName(settings.rep_name || '')
        setRepCC(settings.rep_cc || '')
        setRepRole(settings.rep_role || '')
        
        const imagesToLoad = {}
        if (settings.logo_path) {
          const { data: logoData } = supabase.storage.from('logos').getPublicUrl(settings.logo_path)
          imagesToLoad.logo = logoData.publicUrl
        }
        if (settings.signature_path) {
          const { data: sigData } = supabase.storage.from('signatures').getPublicUrl(settings.signature_path)
          imagesToLoad.signature = sigData.publicUrl
        }
        if (settings.watermark_path) {
          const { data: wmData } = supabase.storage.from('watermarks').getPublicUrl(settings.watermark_path)
          imagesToLoad.watermark = wmData.publicUrl
        }
        setImages(imagesToLoad)
      }
    } catch (err) {
      console.error('Error cargando configuración:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleImageSelect = (e, type) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona una imagen válida (JPG, PNG, WEBP)')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen es demasiado grande. El límite es 5MB.')
        return
      }
      setSelectedFiles(prev => ({ ...prev, [type]: file }))
      const reader = new FileReader()
      reader.onloadend = () => {
        setImages(prev => ({ ...prev, [type]: reader.result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageRemove = (type) => {
    setImages(prev => ({ ...prev, [type]: null }))
    setSelectedFiles(prev => ({ ...prev, [type]: null }))
    const input = document.getElementById(`${type}Input`)
    if (input) input.value = ''
  }

  const uploadImage = async (file, bucket, path) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${path}_${Date.now()}.${fileExt}`
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, { cacheControl: '3600', upsert: false })
    if (error) throw error
    return data.path
  }

  const handleSave = async () => {
    if (isReadOnly) return // Protección extra
    setSaveStatus('saving')
    
    try {
      const imagePaths = {}
      if (selectedFiles.logo) imagePaths.logo_path = await uploadImage(selectedFiles.logo, 'logos', 'logo')
      if (selectedFiles.signature) imagePaths.signature_path = await uploadImage(selectedFiles.signature, 'signatures', 'signature')
      if (selectedFiles.watermark) imagePaths.watermark_path = await uploadImage(selectedFiles.watermark, 'watermarks', 'watermark')

      const settingsData = {
        header_line1: headerLine1, header_line2: headerLine2, header_line3: headerLine3, header_line4: headerLine4,
        doc_code: docCode, doc_version: docVersion, footer_text: footerText,
        name: entityName, nit: nit, address: address, phone: phone, web: web, email: email,
        rep_name: repName, rep_cc: repCC, rep_role: repRole,
        ...imagePaths
      }

      const { error } = await supabase.from('entity_settings').update(settingsData).eq('id', 1)
      if (error) throw error

      setSaveStatus('success')
      setSelectedFiles({ logo: null, signature: null, watermark: null })
      await loadSettings()
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err) {
      console.error('Error guardando:', err)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  // Clase reutilizable para inputs deshabilitados
  const inputClass = (isReadOnly) => 
    `w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium ${
      isReadOnly ? 'bg-gray-100 cursor-not-allowed opacity-75' : 'placeholder-gray-400'
    }`

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configuración del Sistema</h1>
        <p className="text-gray-500 mt-1">Gestiona la identidad visual y los datos de la fundación.</p>
      </div>

      {/* Sección: Datos de la Fundación */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">🏢</span>
          Datos de la Fundación
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: 'Nombre de la Entidad', value: entityName, setter: setEntityName, type: 'text', placeholder: 'Fundación Oxígeno' },
            { label: 'NIT', value: nit, setter: setNit, type: 'text', placeholder: '900.000.000-0' },
            { label: 'Dirección', value: address, setter: setAddress, type: 'text', placeholder: '' },
            { label: 'Teléfono', value: phone, setter: setPhone, type: 'text', placeholder: '' },
            { label: 'Sitio Web', value: web, setter: setWeb, type: 'text', placeholder: '' },
            { label: 'Correo Electrónico', value: email, setter: setEmail, type: 'email', placeholder: '' }
          ].map((field, idx) => (
            <div key={idx}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
              <input 
                type={field.type} 
                value={field.value}
                onChange={(e) => field.setter(e.target.value)}
                readOnly={isReadOnly}
                disabled={isReadOnly}
                className={inputClass(isReadOnly)} 
                placeholder={field.placeholder} 
              />
            </div>
          ))}
        </div>
      </div>

      {/* Sección: Representante Legal */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">👤</span>
          Representante Legal
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
            <input type="text" value={repName} onChange={(e) => setRepName(e.target.value)} readOnly={isReadOnly} disabled={isReadOnly} className={inputClass(isReadOnly)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
            <input type="text" value={repCC} onChange={(e) => setRepCC(e.target.value)} readOnly={isReadOnly} disabled={isReadOnly} className={inputClass(isReadOnly)} />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
            <input type="text" value={repRole} onChange={(e) => setRepRole(e.target.value)} readOnly={isReadOnly} disabled={isReadOnly} className={inputClass(isReadOnly)} />
          </div>
        </div>
      </div>

      {/* Sección: Encabezado del Certificado */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600">📄</span>
          Encabezado del Certificado
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Texto Central (Hasta 4 líneas)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Línea 1 (Proceso)', value: headerLine1, setter: setHeaderLine1 },
                { label: 'Línea 2 (Título Principal)', value: headerLine2, setter: setHeaderLine2 },
                { label: 'Línea 3 (Opcional)', value: headerLine3, setter: setHeaderLine3 },
                { label: 'Línea 4 (Opcional)', value: headerLine4, setter: setHeaderLine4 }
              ].map((field, idx) => (
                <div key={idx}>
                  <label className="block text-sm font-medium text-gray-600 mb-1">{field.label}</label>
                  <input 
                    type="text" value={field.value} onChange={(e) => field.setter(e.target.value)}
                    readOnly={isReadOnly} disabled={isReadOnly} className={inputClass(isReadOnly)} 
                    placeholder="Dejar en blanco si no aplica"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Información de Gestión Documental</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Código del Documento</label>
                <input type="text" value={docCode} onChange={(e) => setDocCode(e.target.value)} readOnly={isReadOnly} disabled={isReadOnly} className={inputClass(isReadOnly)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Versión</label>
                <input type="text" value={docVersion} onChange={(e) => setDocVersion(e.target.value)} readOnly={isReadOnly} disabled={isReadOnly} className={inputClass(isReadOnly)} />
              </div>
            </div>
            <p className="text-xs text-teal-600 mt-2 flex items-center gap-1">
              <span>ℹ️</span> La numeración de páginas será calculada e insertada automáticamente por el sistema al generar el PDF.
            </p>
          </div>

          {/* Vista Previa del Encabezado */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Vista Previa del Encabezado</h3>
            <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
              <div className="flex border border-black bg-white" style={{ minHeight: '90px' }}>
                <div className="w-1/4 border-r border-black flex items-center justify-center p-2">
                  {images.logo ? (
                    <img src={images.logo} alt="Logo" className="max-h-16 max-w-full object-contain" />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xs font-bold">LOGO</div>
                  )}
                </div>
                <div className="flex-1 border-r border-black flex flex-col items-center justify-center p-2 text-center">
                  {headerLine1 && <div className="text-[10px] font-normal uppercase mb-0.5 text-gray-700">{headerLine1}</div>}
                  {headerLine2 && <div className="text-xs font-bold uppercase mb-0.5 text-black">{headerLine2}</div>}
                  {headerLine3 && <div className="text-[10px] font-normal uppercase mb-0.5 text-gray-700">{headerLine3}</div>}
                  {headerLine4 && <div className="text-[10px] font-normal uppercase text-gray-700">{headerLine4}</div>}
                </div>
                <div className="w-1/4 flex flex-col bg-gray-50">
                  <div className="flex-1 border-b border-black flex items-center px-2 text-xs">
                    <span className="font-bold mr-1 text-gray-700 min-w-[50px]">Código:</span>
                    <span className="flex-1 text-right font-bold text-gray-900 break-all">{docCode || 'N/A'}</span>
                  </div>
                  <div className="flex-1 border-b border-black flex items-center px-2 text-xs">
                    <span className="font-bold mr-1 text-gray-700 min-w-[50px]">Versión:</span>
                    <span className="flex-1 text-right font-bold text-gray-900 break-all">{docVersion || 'N/A'}</span>
                  </div>
                  <div className="flex-1 flex items-center px-2 text-xs">
                    <span className="font-bold mr-1 text-gray-700 min-w-[50px]">Página:</span>
                    <span className="flex-1 text-right font-bold text-gray-900 italic">Auto</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sección: Pie de Página */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">📋</span>
          Pie de Página del Certificado
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Texto del Pie de Página</label>
            <textarea 
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              rows={4}
              readOnly={isReadOnly}
              disabled={isReadOnly}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-gray-900 font-medium ${
                isReadOnly ? 'bg-gray-100 cursor-not-allowed opacity-75' : 'placeholder-gray-400'
              }`}
              placeholder="Escribe el texto aquí. Presiona Enter para crear nuevas líneas."
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 Tip: Presiona la tecla <strong>Enter</strong> para crear saltos de línea. El sistema respetará el formato exacto.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Vista Previa del Pie de Página</h3>
            <div className="border-t-2 border-black pt-3 bg-white px-4 pb-3">
              <div className="text-center text-xs text-gray-900 whitespace-pre-wrap leading-relaxed font-medium">
                {footerText}
              </div>
              <div className="mt-3 pt-2 border-t border-gray-200 text-[10px] text-gray-600 flex justify-center items-center gap-2">
                <span>🔐 Valide en: {web || 'www.fundacionoxigeno.org'}/validar</span>
                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                <span>Página <span className="font-bold text-gray-900">X</span> de <span className="font-bold text-gray-900">Y</span> (Automático)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sección: Identidad Visual */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600">🎨</span>
          Identidad Visual (Logos y Firmas)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {['logo', 'signature', 'watermark'].map((type) => (
            <div key={type} className="flex flex-col items-center">
              <input 
                type="file" 
                id={`${type}Input`} 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => handleImageSelect(e, type)} 
                disabled={isReadOnly}
              />
              <div 
                className={`w-full h-40 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50 mb-3 overflow-hidden ${
                  isReadOnly ? 'border-gray-200 cursor-not-allowed opacity-75' : 'border-gray-300 cursor-pointer hover:border-teal-500 hover:bg-teal-50 transition-colors'
                }`}
                onClick={() => !isReadOnly && document.getElementById(`${type}Input`).click()}
              >
                {images[type] ? (
                  <img src={images[type]} alt={type} className="w-full h-full object-contain p-2" />
                ) : (
                  <span className="text-gray-400 text-sm text-center px-2">Clic para subir {type === 'logo' ? 'logo' : type === 'signature' ? 'firma' : 'marca de agua'}</span>
                )}
              </div>
              
              {/* ✅ Botones de acción SOLO visibles para ADMIN */}
              {!isReadOnly && (
                <div className="flex gap-2 w-full">
                  <button 
                    onClick={() => document.getElementById(`${type}Input`).click()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    {images[type] ? 'Cambiar' : 'Subir'}
                  </button>
                  {images[type] && (
                    <button 
                      onClick={() => handleImageRemove(type)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ✅ Footer con Botón de Guardar (Solo ADMIN) o Mensaje de Solo Lectura */}
      {currentUserRole === 'ADMIN' ? (
        <div className="flex justify-end sticky bottom-4 bg-white/90 backdrop-blur-sm p-4 border-t border-gray-200 rounded-b-xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button 
            onClick={handleSave}
            disabled={saveStatus === 'saving' || isReadOnly}
            className="px-8 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-all shadow-lg flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed active:scale-95"
          >
            {saveStatus === 'saving' ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Guardando...
              </>
            ) : saveStatus === 'success' ? (
              <><span>✅</span> ¡Configuración Guardada!</>
            ) : saveStatus === 'error' ? (
              <><span>❌</span> Error al guardar</>
            ) : (
              <><span>💾</span> Guardar Configuración</>
            )}
          </button>
        </div>
      ) : (
        <div className="sticky bottom-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-center shadow-sm">
          <p className="text-blue-800 text-sm font-medium flex items-center justify-center gap-2">
            <span>🔒</span> Modo solo lectura: Solo los administradores pueden modificar la configuración del sistema.
          </p>
        </div>
      )}
    </div>
  )
}