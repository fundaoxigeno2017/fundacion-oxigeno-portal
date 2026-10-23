'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useMemo, useRef, useState } from 'react'

// ==========================================
// CONFIGURACIÓN DEL DOCUMENTO: CARTA
// ==========================================
const PAGE_WIDTH_MM = 215.9
const PAGE_HEIGHT_MM = 279.4
const PAGE_MARGIN_X_MM = 15

const HEADER_TOP_MM = 10
const HEADER_HEIGHT_MM = 25

const CONTENT_TOP_MM = 40
const CONTENT_BOTTOM_MM = 40

const FOOTER_BOTTOM_MM = 10
const FOOTER_HEIGHT_MM = 25

const SIGNATURE_HEIGHT_MM = 25
const SIGNATURE_GAP_MM = 4
const QR_SIZE_MM = 18

const FINAL_CONTENT_BOTTOM_MM = FOOTER_BOTTOM_MM + FOOTER_HEIGHT_MM + SIGNATURE_HEIGHT_MM + SIGNATURE_GAP_MM
const NORMAL_CONTENT_HEIGHT_MM = PAGE_HEIGHT_MM - CONTENT_TOP_MM - CONTENT_BOTTOM_MM
const FINAL_CONTENT_HEIGHT_MM = PAGE_HEIGHT_MM - CONTENT_TOP_MM - FINAL_CONTENT_BOTTOM_MM
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - PAGE_MARGIN_X_MM * 2

const DOCUMENT_TYPES = {
  CC: 'C.C.',
  CE: 'C.E.',
  PAS: 'Pasaporte',
  TI: 'T.I.',
  NIT: 'NIT',
}

const CONTRACT_TYPES = {
  laboral: 'laboral',
  prestacion: 'de prestación de servicios',
  voluntario: 'voluntario',
  otro: 'otro',
}

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

// ==========================================
// UTILIDADES
// ==========================================
function getTodayParts() {
  const now = new Date()
  return { day: now.getDate(), month: MONTHS[now.getMonth()], year: now.getFullYear() }
}

function formatDate(date) {
  if (!date) return ''
  const value = new Date(`${date}T00:00:00`)
  if (Number.isNaN(value.getTime())) return ''
  return value.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
}

function escapeHtml(value) {
  const div = document.createElement('div')
  div.textContent = String(value ?? '')
  return div.innerHTML
}

function getPublicStorageUrl(bucket, path) {
  if (!path || !process.env.NEXT_PUBLIC_SUPABASE_URL) return ''
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')
  const safePath = String(path).split('/').map((part) => encodeURIComponent(part)).join('/')
  return `${baseUrl}/storage/v1/object/public/${bucket}/${safePath}`
}

// ==========================================
// RENDERIZADO DE LA PLANTILLA
// ==========================================
function renderTemplate(content, cert, settings) {
  if (!content) return ''

  const parts = getTodayParts()
  const tipoContratoTexto = cert.contract_type && CONTRACT_TYPES[cert.contract_type]
    ? CONTRACT_TYPES[cert.contract_type]
    : ''

  const replacements = {
    '{{nombres}}': cert.emp_name || '',
    '{{tipoDocumento}}': DOCUMENT_TYPES[cert.emp_doc_type] || cert.emp_doc_type || '',
    '{{numeroDocumento}}': cert.emp_doc_number || '',
    '{{cargo}}': cert.templates?.cargo || '',
    '{{tipoContrato}}': tipoContratoTexto,
    '{{fechaInicio}}': formatDate(cert.start_date),
    '{{fechaFin}}': formatDate(cert.end_date),
    '{{numeroContrato}}': cert.contract_number || '',
    '{{regional}}': cert.regional || '',
    '{{anio}}': cert.exec_year ?? '',
    '{{modalidad}}': cert.modality || '',
    '{{ciudad}}': cert.exp_city || '',
    '{{dia}}': parts.day,
    '{{mes}}': parts.month,
    '{{anioExp}}': parts.year,
    '{{codigo}}': cert.code || '',
    '{{nit}}': settings?.nit || '900.389.073-2',
  }

  let result = content
  Object.entries(replacements).forEach(([token, value]) => {
    result = result.split(token).join(escapeHtml(value))
  })

  // Limpiar cualquier variable {{...}} que no haya sido reemplazada
  result = result.replace(/\{\{[^}]+\}\}/g, '')

  return result
}

// ==========================================
// CONSTRUCCIÓN DEL CERTIFICADO (CORREGIDO)
// ==========================================
function buildCertificateHtml(cert, settings) {
  const fullRendered = renderTemplate(
    cert.templates?.content || '',
    cert,
    settings
  )

  // ✅ SIEMPRE generar el encabezado estándar desde el código
  const headerHtml = `
    <div class="certificate-intro-header">
      <div>LA SUSCRITA REPRESENTANTE LEGAL DE</div>
      <div>FUNDACIÓN OXÍGENO</div>
      <div>NIT ${escapeHtml(settings?.nit || '900.389.073-2')}</div>
    </div>
  `

  let introHtml = ''
  let functionsHtml = ''

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(fullRendered, 'text/html')

    // Localizar el contenedor principal de la introducción.
    const introContainer =
      doc.querySelector('.certificate-intro') || doc.body

    // Buscar el encabezado institucional dentro de la plantilla para ELIMINARLO.
    const headerElement = Array.from(
      introContainer.querySelectorAll('div, p, h1, h2, h3, h4, h5, h6')
    ).find((element) => {
      const text = element.textContent.trim().toUpperCase()

      return (
        text.includes('LA SUSCRITA REPRESENTANTE LEGAL DE') &&
        text.length < 150
      )
    })

    // Buscar el título de funciones.
    const functionsTitle = Array.from(
      introContainer.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6')
    ).find((element) => {
      const text = element.textContent.trim().toUpperCase()

      return (
        /FUNCIONES|FUNCIÓN|FUNCION/.test(text) &&
        text.length < 80
      )
    })

    // ELIMINAR el encabezado de la plantilla si existe (ya lo generamos desde el código)
    if (headerElement) {
      headerElement.remove()
    }

    const introWrapper = doc.createElement('div')
    introWrapper.className = 'certificate-intro-from-template'

    // Recorrer el contenido original del contenedor principal,
    // omitiendo el encabezado eliminado.
    Array.from(introContainer.childNodes).forEach((node) => {
      if (node === headerElement) return

      if (
        node.nodeType === Node.ELEMENT_NODE &&
        node.contains(headerElement)
      ) {
        const clone = node.cloneNode(true)
        const clonedHeader = clone.querySelector(
          '.certificate-intro-header'
        )

        if (clonedHeader) clonedHeader.remove()

        const nestedHeader = Array.from(
          clone.querySelectorAll('div')
        ).find((element) => {
          const text = element.textContent.trim().toUpperCase()
          return (
            text.includes('LA SUSCRITA REPRESENTANTE LEGAL DE') &&
            text.length < 150
          )
        })

        if (nestedHeader) nestedHeader.remove()

        if (clone.textContent.trim()) {
          introWrapper.appendChild(clone)
        }

        return
      }

      introWrapper.appendChild(node.cloneNode(true))
    })

    // Si el título de funciones existe, separarlo de la introducción.
    if (functionsTitle && introWrapper.contains(functionsTitle)) {
      const clonedTitle = Array.from(
        introWrapper.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6')
      ).find((element) => {
        const text = element.textContent.trim().toUpperCase()
        return (
          /FUNCIONES|FUNCIÓN|FUNCION/.test(text) &&
          text.length < 80
        )
      })

      if (clonedTitle) {
        const functionsWrapper = doc.createElement('div')
        functionsWrapper.className = 'certificate-template-functions'

        let current = clonedTitle

        while (current) {
          const next = current.nextElementSibling
          functionsWrapper.appendChild(current.cloneNode(true))
          current.remove()
          current = next
        }

        functionsHtml = functionsWrapper.innerHTML
      }
    }

    introHtml = introWrapper.innerHTML
  } catch (error) {
    console.error('Error procesando plantilla:', error)
    introHtml = fullRendered
  }

  const parts = getTodayParts()
  const signatureUrl = getPublicStorageUrl(
    'signatures',
    settings?.signature_path
  )

  const closingHtml = `
    <div class="certificate-closing">
      <p class="certificate-issuance">
        Esta certificación se expide a solicitud del interesado, en
        <strong>${escapeHtml(cert.exp_city || '')}</strong>,
        a los <strong>${escapeHtml(parts.day)}</strong> días del mes de
        <strong>${escapeHtml(parts.month)}</strong> de
        <strong>${escapeHtml(parts.year)}</strong>.
      </p>

      <div class="certificate-verification">
        Código de verificación:
        <strong>${escapeHtml(cert.code || '')}</strong>
      </div>

      <div class="certificate-signature">
        ${
          signatureUrl
            ? `<img src="${escapeHtml(signatureUrl)}" alt="Firma" crossorigin="anonymous">`
            : '<div class="certificate-signature-space"></div>'
        }
        <div class="certificate-signature-line"></div>
        <div class="certificate-signature-name">
          ${escapeHtml(settings?.rep_name || 'CRUZ MARINA LOZANO IBARGÜEN')}
        </div>
        <div>CC. ${escapeHtml(settings?.rep_cc || '26.330.896')}</div>
        <div>Representante Legal</div>
        <div>Fundación Oxígeno</div>
      </div>
    </div>
  `

  return {
    header: headerHtml,
    intro: introHtml,
    content: functionsHtml,
    closing: closingHtml,
  }
}

// ==========================================
// DIVISIÓN Y MEDICIÓN DE BLOQUES
// ==========================================
function getContentBlocks(html) {
  if (!html) return []
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div id="certificate-root">${html}</div>`, 'text/html')
  const root = doc.getElementById('certificate-root')
  if (!root) return []

  const blocks = []
  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent?.trim()) blocks.push(`<p>${escapeHtml(node.textContent.trim())}</p>`)
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return

    const tag = node.tagName.toLowerCase()
    if (tag === 'br') {
      blocks.push('<div class="certificate-spacer"></div>')
      return
    }
    if (node.classList.contains('certificate-intro-header') || node.classList.contains('certificate-closing')) {
      blocks.push(node.outerHTML)
      return
    }
    if (tag === 'ul' || tag === 'ol') {
      Array.from(node.children).forEach((item) => {
        if (item.tagName.toLowerCase() === 'li') {
          blocks.push(`<div class="certificate-function-item">${item.innerHTML}</div>`)
        }
      })
      return
    }
    if (tag === 'div' && (node.classList.contains('certificate-intro-from-template') || node.classList.contains('certificate-template-functions') || node.classList.contains('certificate-intro'))) {
      Array.from(node.childNodes).forEach(processNode)
      return
    }
    if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'hr'].includes(tag)) {
      blocks.push(node.outerHTML)
      return
    }
    if (tag === 'div' && node.children.length) {
      Array.from(node.childNodes).forEach(processNode)
      return
    }
    blocks.push(node.outerHTML)
  }
  Array.from(root.childNodes).forEach(processNode)
  return blocks.filter(Boolean)
}

function createMeasurementContainer() {
  const container = document.createElement('div')
  container.className = 'certificate-rich-content'
  Object.assign(container.style, {
    position: 'absolute', left: '-100000px', top: '0', width: `${CONTENT_WIDTH_MM}mm`,
    visibility: 'hidden', pointerEvents: 'none', zIndex: '-1', boxSizing: 'border-box',
  })
  document.body.appendChild(container)
  return container
}

async function waitForImages(root) {
  const images = Array.from(root.querySelectorAll('img'))
  await Promise.all(images.map(async (img) => {
    if (img.complete) {
      if (img.decode) try { await img.decode() } catch {}
      return
    }
    await new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true })
      img.addEventListener('error', resolve, { once: true })
    })
  }))
}

async function measureHtmlHeight(html, container) {
  container.innerHTML = html
  await waitForImages(container)
  await new Promise((resolve) => requestAnimationFrame(resolve))
  return container.getBoundingClientRect().height * (25.4 / 96)
}

// ==========================================
// PAGINACIÓN OPTIMIZADA
// ==========================================
async function paginateCertificate(headerHtml, introHtml, contentHtml, closingHtml) {
  const allBlocks = [
    ...getContentBlocks(headerHtml),
    ...getContentBlocks(introHtml),
    ...getContentBlocks(contentHtml),
    ...getContentBlocks(closingHtml),
  ]
  if (!allBlocks.length) return ['']

  const measurementContainer = createMeasurementContainer()
  try {
    const pages = []
    let currentPage = []
    const HEIGHT_TOLERANCE_MM = 2.5

    for (const block of allBlocks) {
      const candidate = [...currentPage, block].join('')
      const candidateHeight = await measureHtmlHeight(candidate, measurementContainer)

      if (currentPage.length === 0 || candidateHeight <= NORMAL_CONTENT_HEIGHT_MM + HEIGHT_TOLERANCE_MM) {
        currentPage.push(block)
      } else {
        pages.push(currentPage)
        currentPage = [block]
      }
    }
    if (currentPage.length) pages.push(currentPage)

    if (pages.length > 1) {
      let lastPage = pages[pages.length - 1]
      let lastHeight = await measureHtmlHeight(lastPage.join(''), measurementContainer)

      while (lastHeight > FINAL_CONTENT_HEIGHT_MM + HEIGHT_TOLERANCE_MM && lastPage.length > 1) {
        const movedBlock = lastPage.pop()
        const previousPage = pages[pages.length - 2]
        const prevCandidate = [...previousPage, movedBlock].join('')
        const prevHeight = await measureHtmlHeight(prevCandidate, measurementContainer)

        if (prevHeight <= NORMAL_CONTENT_HEIGHT_MM + HEIGHT_TOLERANCE_MM) {
          previousPage.push(movedBlock)
        } else {
          lastPage.push(movedBlock)
          break
        }
        lastHeight = await measureHtmlHeight(lastPage.join(''), measurementContainer)
      }
      if (lastPage.length === 0) pages.pop()
    }
    return pages.map((page) => page.join(''))
  } finally {
    measurementContainer.remove()
  }
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function CertificadosPage() {
  const supabase = useMemo(() => createClient(), [])
  const [certificates, setCertificates] = useState([])
  const [templates, setTemplates] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [userRole, setUserRole] = useState(null)

  const [formData, setFormData] = useState({
    empName: '', empDocType: 'CC', empDocNumber: '', contractType: '',
    contractNumber: '', regional: 'Chocó', modality: '', startDate: '', endDate: '',
    execYear: new Date().getFullYear(), expCity: 'Istmina, Chocó',
  })

  const [previewCert, setPreviewCert] = useState(null)
  const [previewPages, setPreviewPages] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const pageRefs = useRef([])

  useEffect(() => {
    loadData()
    checkUserRole()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function checkUserRole() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setUserRole(profile?.role || 'VIEWER')
    }
  }

  async function loadData() {
    setLoading(true)
    try {
      const [{ data: templatesData, error: templatesError }, { data: settingsData }, { data: certificatesData, error: certificatesError }] = await Promise.all([
        supabase.from('templates').select('*').eq('is_current', true).eq('is_active', true).order('cargo', { ascending: true }),
        supabase.from('entity_settings').select('*').eq('id', 1).single(),
        supabase.from('certificates').select(`*, templates!inner(cargo, name, content), profiles!certificates_created_by_fkey(full_name)`).order('created_at', { ascending: false }),
      ])
      if (templatesError) throw templatesError
      if (certificatesError) throw certificatesError
      setTemplates(templatesData || [])
      setSettings(settingsData || null)
      setCertificates(certificatesData || [])
    } catch (error) {
      console.error('Error cargando certificados:', error)
    } finally {
      setLoading(false)
    }
  }

  function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    return `OX-${part()}-${part()}-${part()}`
  }

  async function calculateHash(data) {
    if (!window.crypto?.subtle) return ''
    const buffer = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(data)))
    return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  function resetForm() {
    setFormData({ empName: '', empDocType: 'CC', empDocNumber: '', contractType: '', contractNumber: '', regional: 'Chocó', modality: '', startDate: '', endDate: '', execYear: new Date().getFullYear(), expCity: 'Istmina, Chocó' })
    setSelectedTemplate(null)
  }

    async function handleSave(event) {
    event.preventDefault()
    if (!selectedTemplate || !formData.empName.trim() || !formData.empDocNumber.trim() || !formData.startDate || !formData.endDate) {
      alert('Por favor complete todos los campos obligatorios.')
      return
    }
    if (formData.endDate < formData.startDate) {
      alert('La fecha de finalización no puede ser anterior a la fecha de inicio.')
      return
    }
    setSaving(true)
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('Sesión no válida')

      // ✅ 1. Obtener la ubicación registrada del usuario en este momento
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('user_location')
        .eq('id', user.id)
        .single()

      const code = generateCode()
      const today = getTodayParts()
      
      const certData = {
        code, 
        template_id: selectedTemplate.id, 
        emp_name: formData.empName.trim(),
        emp_doc_type: formData.empDocType, 
        emp_doc_number: formData.empDocNumber.trim(),
        contract_type: formData.contractType || '',
        contract_number: formData.contractNumber.trim(),
        regional: formData.regional.trim(), 
        modality: formData.modality.trim(),
        start_date: formData.startDate, 
        end_date: formData.endDate,
        exec_year: Number(formData.execYear), 
        exp_city: formData.expCity.trim(),
        exp_day: today.day, 
        exp_month: today.month, 
        exp_year: today.year,
        status: 'active', 
        created_by: user.id,
        // ✅ 2. Guardar la ubicación de creación
        creation_location: userProfile?.user_location || 'Ubicación no registrada' 
      }
      
      const { error } = await supabase.from('certificates').insert({ ...certData, hash: await calculateHash(certData) })
      if (error) throw error

      alert('Certificado creado correctamente.')
      setShowForm(false)
      resetForm()
      await loadData()
    } catch (error) {
      console.error('Error creando certificado:', error)
      alert(`Error: ${error?.message || 'Desconocido'}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleRevoke(cert) {
    console.log('⚙️ [1] Iniciando revocación para certificado:', cert.code)
    if (cert.status === 'revoked') {
      alert('Este certificado ya está revocado.')
      return
    }
    const reason = prompt('Ingrese el motivo de la revocación:')
    console.log('⚙️ [2] Motivo ingresado:', reason)
    if (!reason || !reason.trim()) {
      console.log('⚠️ [3] Revocación cancelada: motivo vacío o cancelado')
      return
    }
    try {
      console.log('📡 [4] Enviando UPDATE a Supabase...')
      const { data, error } = await supabase
        .from('certificates')
        .update({ status: 'revoked', revoke_reason: reason.trim(), revoked_at: new Date().toISOString() })
        .eq('id', cert.id)
        .select()
      if (error) {
        console.error('❌ [5] Error de Supabase al revocar:', error)
        alert(`Error al revocar: ${error.message}`)
        return
      }
      console.log('✅ [6] Revocación exitosa:', data)
      alert('Certificado revocado correctamente.')
      await loadData()
    } catch (error) {
      console.error('❌ [7] Error inesperado revocando:', error)
      alert(`Error: ${error?.message || 'Desconocido'}`)
    }
  }

  async function handleDelete(certId) {
    console.log('⚙️ [1] Iniciando eliminación para ID:', certId)
    const isConfirmed = confirm('¿Está seguro de eliminar este certificado permanentemente? Esta acción no se puede deshacer.')
    console.log('⚙️ [2] Confirmación del usuario:', isConfirmed)
    if (!isConfirmed) {
      console.log('⚠️ [3] Eliminación cancelada por el usuario')
      return
    }
    try {
      console.log('📡 [4] Enviando DELETE a Supabase...')
      const { data, error } = await supabase
        .from('certificates')
        .delete()
        .eq('id', certId)
        .select()
      if (error) {
        console.error('❌ [5] Error de Supabase al eliminar:', error)
        alert(`Error al eliminar: ${error.message}`)
        return
      }
      console.log('✅ [6] Eliminación exitosa:', data)
      alert('Certificado eliminado correctamente.')
      await loadData()
    } catch (error) {
      console.error('❌ [7] Error inesperado eliminando:', error)
      alert(`Error: ${error?.message || 'Desconocido'}`)
    }
  }

  async function preparePreview(cert) {
    setPreviewCert(cert)
    setPreviewPages([])
    setPreviewLoading(true)
    pageRefs.current = []
    try {
      const { header, intro, content, closing } = buildCertificateHtml(cert, settings)
      const pages = await paginateCertificate(header, intro, content, closing)
      setPreviewPages(pages)
    } catch (error) {
      console.error('Error preparando la vista previa:', error)
      alert('No fue posible preparar la vista previa.')
    } finally {
      setPreviewLoading(false)
    }
  }

  async function createQrCode(cert) {
    try {
      const module = await import('qrcode')
      const QRCode = module.default || module
      const url = `${window.location.origin}/validar?code=${encodeURIComponent(cert.code)}`
      return await QRCode.toDataURL(url, { width: 120, margin: 1, errorCorrectionLevel: 'M' })
    } catch (error) {
      console.error('Error generando QR:', error)
      return ''
    }
  }

  async function handleDownloadPDF(cert) {
    if (!cert) return
    setPdfLoading(true)
    try {
      let pages = previewPages
      if (previewCert?.id !== cert.id || !pages.length) {
        const { header, intro, content, closing } = buildCertificateHtml(cert, settings)
        pages = await paginateCertificate(header, intro, content, closing)
        setPreviewCert(cert)
        setPreviewPages(pages)
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      }

      if (document.fonts?.ready) await document.fonts.ready
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

      const pageElements = pageRefs.current.filter(Boolean).slice(0, pages.length)
      if (pageElements.length !== pages.length) throw new Error('No se encontraron todas las páginas. Abra la vista previa e intente nuevamente.')

      const jsPdfModule = await import('jspdf')
      const html2canvasModule = await import('html2canvas')
      const { jsPDF } = jsPdfModule
      const html2canvas = html2canvasModule.default || html2canvasModule

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter', compress: true })
      const qr = await createQrCode(cert)

      for (let index = 0; index < pageElements.length; index++) {
        const page = pageElements[index]
        const isLastPage = index === pageElements.length - 1
        const qrElement = page.querySelector('.certificate-qr')

        if (qrElement) {
          qrElement.style.display = isLastPage && qr ? 'block' : 'none'
          const qrImage = qrElement.querySelector('img')
          if (qrImage && qr) qrImage.src = qr
        }

        await waitForImages(page)
        const canvas = await html2canvas(page, { scale: 2, useCORS: true, allowTaint: false, backgroundColor: '#ffffff', logging: false, width: page.scrollWidth, height: page.scrollHeight })
        const imageData = canvas.toDataURL('image/jpeg', 0.92)

        if (index > 0) pdf.addPage('letter', 'portrait')
        pdf.addImage(imageData, 'JPEG', 0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, undefined, 'FAST')
      }
      pdf.save(`Certificado_${cert.code}.pdf`)
    } catch (error) {
      console.error('Error generando PDF:', error)
      alert(error?.message || 'No fue posible generar el PDF.')
    } finally {
      setPdfLoading(false)
    }
  }

  function renderCertificatePage(pageHtml, cert, pageNumber, totalPages, isLastPage) {
    const logoUrl = getPublicStorageUrl('logos', settings?.logo_path)
    const watermarkUrl = getPublicStorageUrl('watermarks', settings?.watermark_path)

    return (
      <div
        key={`${cert.id}-${pageNumber}`}
        ref={(element) => { pageRefs.current[pageNumber - 1] = element }}
        className="certificate-page"
        style={{
          width: `${PAGE_WIDTH_MM}mm`, height: `${PAGE_HEIGHT_MM}mm`, position: 'relative',
          background: '#ffffff', overflow: 'hidden', flex: '0 0 auto', boxSizing: 'border-box',
          color: '#111827', fontFamily: 'Arial, Helvetica, sans-serif',
        }}
      >
        {watermarkUrl && <img src={watermarkUrl} alt="" crossOrigin="anonymous" className="certificate-watermark" />}

        <header className="certificate-header">
          <div className="certificate-header-logo">
            {logoUrl ? <img src={logoUrl} alt="Logo" crossOrigin="anonymous" /> : <span className="text-xs text-gray-400 font-bold">[LOGO]</span>}
          </div>
          <div className="certificate-header-center">
            <div>{settings?.header_line1 || 'PROCESO DE INNOVACIÓN Y MEJORA'}</div>
            <div className="font-bold">{settings?.header_line2 || 'CERTIFICACIONES'}</div>
          </div>
          <div className="certificate-header-meta">
            <div><strong>Código</strong><br />{settings?.doc_code || 'AF-TH-2'}</div>
            <div className="mt-1"><strong>Versión</strong><br />{settings?.doc_version || '1.0.5'}</div>
          </div>
          <div className="certificate-page-number">Página {pageNumber} de {totalPages}</div>
        </header>

        <main className={`certificate-content ${isLastPage ? 'certificate-content-last' : ''}`}>
          <div className="certificate-rich-content" dangerouslySetInnerHTML={{ __html: pageHtml }} />
        </main>

        {isLastPage && (
          <div className="certificate-qr">
            <img src={qrDataUrl || ''} alt="QR de validación" />
            <div>Validar certificado</div>
          </div>
        )}

        <footer className="certificate-footer">
          <div className="font-bold italic">"Servir – Nuestro gran Compromiso"</div>
          <div>{settings?.email || 'fundaoxigeno2017@gmail.com'} / {settings?.alternate_email || 'cruzmlozano@hotmail.es'}</div>
          <div>{settings?.address || 'Cra 7 N 27a – 56'} · {settings?.city || 'Istmina - Chocó'}</div>
          <div className="font-bold">FUNDACIÓN OXÍGENO</div>
          <div>Todos los derechos reservados</div>
        </footer>
      </div>
    )
  }

  useEffect(() => {
    let cancelled = false
    async function loadQr() {
      if (!previewCert) { setQrDataUrl(''); return }
      const qr = await createQrCode(previewCert)
      if (!cancelled) setQrDataUrl(qr)
    }
    loadQr()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewCert])

  const filteredCertificates = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()
    if (!search) return certificates
    return certificates.filter((cert) =>
      [cert.code, cert.emp_name, cert.emp_doc_number, cert.contract_number, cert.templates?.name, cert.templates?.cargo].some((value) =>
        String(value || '').toLowerCase().includes(search)
      )
    )
  }, [certificates, searchTerm])

  return (
    <div className="min-h-screen bg-slate-50">
      <style jsx global>{`
        .certificate-page { box-shadow: 0 8px 30px rgba(15, 23, 42, 0.18); }
        .certificate-header {
          position: absolute; top: ${HEADER_TOP_MM}mm; left: ${PAGE_MARGIN_X_MM}mm; right: ${PAGE_MARGIN_X_MM}mm;
          height: ${HEADER_HEIGHT_MM}mm; display: grid; grid-template-columns: 28mm 1fr 32mm;
          column-gap: 4mm; align-items: center; border-bottom: 0.35mm solid #111827;
          box-sizing: border-box; z-index: 5;
        }
        .certificate-header-logo { height: 20mm; display: flex; align-items: center; justify-content: flex-start; }
        .certificate-header-logo img { max-width: 25mm; max-height: 20mm; object-fit: contain; }
        .certificate-header-center { text-align: center; font-size: 8.5pt; line-height: 1.15; font-weight: 700; text-transform: uppercase; }
        .certificate-header-meta { text-align: right; font-size: 7.5pt; line-height: 1.25; }
        .certificate-page-number { position: absolute; right: 0; bottom: -5mm; font-size: 7.5pt; white-space: nowrap; }
        .certificate-watermark {
          position: absolute; top: 50%; left: 50%; width: 70%; height: 70%; object-fit: contain;
          transform: translate(-50%, -50%); opacity: 0.08; z-index: 0; pointer-events: none;
        }
        .certificate-content {
          position: absolute; left: ${PAGE_MARGIN_X_MM}mm; right: ${PAGE_MARGIN_X_MM}mm;
          top: ${CONTENT_TOP_MM}mm; bottom: ${CONTENT_BOTTOM_MM}mm; overflow: hidden;
          z-index: 2; box-sizing: border-box;
        }
        .certificate-content-last { bottom: ${FINAL_CONTENT_BOTTOM_MM}mm; }
        .certificate-rich-content {
          font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.5;
          color: #111827; text-align: justify; overflow-wrap: break-word;
        }
        
        /* ✅ ENCABEZADO CENTRADO, EN NEGRITA Y CON SEPARACIÓN CLARA */
        .certificate-intro-header {
          text-align: center !important;
          font-weight: 700 !important;
          margin-bottom: 25px !important;
          line-height: 1.6 !important;
        }
        .certificate-intro-header > div {
          display: block !important;
          text-align: center !important;
          font-weight: 700 !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .certificate-intro-from-template {
          display: block;
          width: 100%;
        }
        .certificate-intro-from-template > p:first-of-type {
          margin-top: 0;
        }

        .certificate-rich-content p {
          display: block;
          margin: 0 0 15px 0;
          padding: 0;
          text-align: justify;
          line-height: 1.5;
        }
        .certificate-rich-content .certificate-functions-title { margin-top: 15px; margin-bottom: 10px; font-weight: bold; line-height: 1.4; text-align: center; }
        .certificate-function-item {
          display: block; margin: 0 0 2.5mm; padding: 0; text-align: justify;
          break-inside: avoid; page-break-inside: avoid; overflow: visible; line-height: 1.4;
        }
        .certificate-spacer { height: 1.2em; }
        .certificate-closing { margin-top: 1.5em; }
        .certificate-rich-content .certificate-issuance { margin-top: 1.5em; margin-bottom: 1.5em; line-height: 1.4; }
        .certificate-verification { text-align: center; font-size: 9pt; margin-top: 1.5em; margin-bottom: 1em; line-height: 1.4; }
        .certificate-signature {
          width: 80mm; max-width: 100%; text-align: center; font-size: 8pt; line-height: 1.25;
          margin-top: 2mm; margin-bottom: 1mm; break-inside: avoid; page-break-inside: avoid;
        }
        .certificate-signature img { display: block; width: auto; max-width: 36mm; height: auto; max-height: 11mm; object-fit: contain; margin: 0 auto 1.5mm; }
        .certificate-signature-space { height: 11mm; }
        .certificate-signature-line { width: 62mm; margin: 0 auto 1mm; border-top: 0.3mm solid #111827; }
        .certificate-signature-name { font-weight: bold; }
        .certificate-qr {
          position: absolute; right: ${PAGE_MARGIN_X_MM}mm; bottom: ${FOOTER_BOTTOM_MM + FOOTER_HEIGHT_MM + 2}mm;
          width: 22mm; text-align: center; z-index: 5; font-size: 6.5pt; line-height: 1.1;
        }
        .certificate-qr img { display: block; width: ${QR_SIZE_MM}mm; height: ${QR_SIZE_MM}mm; object-fit: contain; margin: 0 auto 1mm; }
        .certificate-footer {
          position: absolute; left: ${PAGE_MARGIN_X_MM}mm; right: ${PAGE_MARGIN_X_MM}mm;
          bottom: ${FOOTER_BOTTOM_MM}mm; height: ${FOOTER_HEIGHT_MM}mm; border-top: 0.3mm solid #111827;
          z-index: 5; text-align: center; font-size: 7.5pt; line-height: 1.2; padding-top: 1.5mm; box-sizing: border-box;
        }
        @media print {
          body { background: #ffffff !important; }
          .certificate-page { box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Certificados laborales</h1>
            <p className="mt-1 text-sm text-slate-500">Generación, consulta y descarga de certificados.</p>
          </div>
          <button type="button" onClick={() => setShowForm(true)} className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
            Nuevo certificado
          </button>
        </div>

        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por código, nombre, documento..."
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">Cargando...</div>
          ) : filteredCertificates.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-slate-700">No hay certificados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Código</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Persona</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Documento</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contrato</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCertificates.map((cert) => (
                    <tr key={cert.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-5 py-4 text-sm font-semibold text-slate-800">{cert.code}</td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-medium text-slate-800">{cert.emp_name}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{cert.templates?.cargo}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {DOCUMENT_TYPES[cert.emp_doc_type] || cert.emp_doc_type}
                        <br />
                        <span className="text-xs">{cert.emp_doc_number}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">{cert.contract_number || '—'}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => preparePreview(cert)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                            Ver
                          </button>
                          <button type="button" onClick={() => handleDownloadPDF(cert)} disabled={pdfLoading} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50">
                            PDF
                          </button>
                          {userRole === 'ADMIN' && cert.status === 'active' && (
                            <button type="button" onClick={(e) => { console.log('🔘 ¡CLIC EN REVOCAR!', cert.code); handleRevoke(cert) }} className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-700">
                              Revocar
                            </button>
                          )}
                          {userRole === 'ADMIN' && (
                            <button type="button" onClick={(e) => { console.log('🔘 ¡CLIC EN ELIMINAR!', cert.id); handleDelete(cert.id) }} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700">
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: NUEVO CERTIFICADO */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-bold text-slate-900">Nuevo certificado laboral</h2>
            </div>
            <form onSubmit={handleSave} className="space-y-6 p-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Plantilla</label>
                <select value={selectedTemplate?.id || ''} onChange={(event) => setSelectedTemplate(templates.find((template) => String(template.id) === String(event.target.value)) || null)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" required>
                  <option value="">Seleccione una plantilla</option>
                  {templates.map((template) => <option key={template.id} value={template.id}>{template.name || template.cargo}</option>)}
                </select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Nombre completo</label>
                  <input name="empName" value={formData.empName} onChange={(event) => setFormData({ ...formData, empName: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" required />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Tipo de documento</label>
                  <select name="empDocType" value={formData.empDocType} onChange={(event) => setFormData({ ...formData, empDocType: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
                    {Object.entries(DOCUMENT_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Número de documento</label>
                  <input name="empDocNumber" value={formData.empDocNumber} onChange={(event) => setFormData({ ...formData, empDocNumber: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" required />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Tipo de contrato <span className="text-slate-400 font-normal">(opcional)</span></label>
                  <select name="contractType" value={formData.contractType || ''} onChange={(event) => setFormData({ ...formData, contractType: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
                    <option value="">Seleccione un tipo de contrato</option>
                    <option value="laboral">Contrato laboral</option>
                    <option value="prestacion">Prestación de servicios</option>
                    <option value="voluntario">Voluntario</option>
                    <option value="otro">Otro</option>
                  </select>
                  <p className="mt-1 text-xs text-slate-500">Si no conoce el tipo de contrato, deje esta opción en "No especificado".</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Número de contrato de aportes</label>
                  <input name="contractNumber" value={formData.contractNumber} onChange={(event) => setFormData({ ...formData, contractNumber: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Fecha de inicio</label>
                  <input type="date" name="startDate" value={formData.startDate} onChange={(event) => setFormData({ ...formData, startDate: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" required />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Fecha de finalización</label>
                  <input type="date" name="endDate" value={formData.endDate} onChange={(event) => setFormData({ ...formData, endDate: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" required />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Regional</label>
                  <input name="regional" value={formData.regional} onChange={(event) => setFormData({ ...formData, regional: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Modalidad</label>
                  <input name="modality" value={formData.modality} onChange={(event) => setFormData({ ...formData, modality: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Vigencia / año</label>
                  <input type="number" name="execYear" value={formData.execYear} onChange={(event) => setFormData({ ...formData, execYear: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Ciudad de expedición</label>
                  <input name="expCity" value={formData.expCity} onChange={(event) => setFormData({ ...formData, expCity: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button type="button" onClick={() => setShowForm(false)} disabled={saving} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{saving ? 'Generando...' : 'Generar certificado'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VISTA PREVIA */}
      {previewCert && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950/90">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-950 px-5 py-3 text-white">
            <div>
              <div className="text-sm font-semibold">Vista previa del certificado</div>
              <div className="text-xs text-slate-400">{previewCert.code} · {previewPages.length} {previewPages.length === 1 ? 'página' : 'páginas'}</div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => handleDownloadPDF(previewCert)} disabled={previewLoading || pdfLoading || !previewPages.length} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50">
                {pdfLoading ? 'Generando PDF...' : 'Descargar PDF'}
              </button>
              <button type="button" onClick={() => { setPreviewCert(null); setPreviewPages([]); setQrDataUrl(''); pageRefs.current = [] }} className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
                Cerrar
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-slate-700 px-4 py-8">
            {previewLoading ? (
              <div className="flex min-h-full items-center justify-center text-sm text-white">Preparando vista previa...</div>
            ) : (
              <div className="flex flex-col items-center gap-8">
                {previewPages.map((pageHtml, index) => renderCertificatePage(pageHtml, previewCert, index + 1, previewPages.length, index === previewPages.length - 1))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}