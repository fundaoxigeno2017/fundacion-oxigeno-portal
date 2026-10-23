'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams, useRouter } from 'next/navigation'
import ValidationSearch from '@/components/validation/ValidationSearch'
import ValidationResult from '@/components/validation/ValidationResult'
import PublicHeader from '@/components/PublicHeader'

// ✅ Componente interno que usa useSearchParams
function ValidarPageContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [code, setCode] = useState(searchParams.get('code') || '')
  const [cert, setCert] = useState(null)
  const [settings, setSettings] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasSearched, setHasSearched] = useState(!!searchParams.get('code'))

  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase.from('entity_settings').select('name, nit').eq('id', 1).single()
      if (data) setSettings(data)
    }
    loadSettings()
  }, [supabase])

  useEffect(() => {
    if (searchParams.get('code')) {
      handleValidate(searchParams.get('code'))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleValidate = async (searchCode) => {
    const cleanCode = searchCode.trim().toUpperCase()
    if (!cleanCode) return

    setIsLoading(true)
    setError(null)
    setCert(null)
    setHasSearched(true)

    router.push(`/validar?code=${cleanCode}`, { scroll: false })

    try {
      const { data, error: queryError } = await supabase
        .from('certificates')
        .select(`
          *,
          templates(cargo, name)
        `)
        .eq('code', cleanCode)
        .single()

      if (queryError) {
        if (queryError.code === 'PGRST116') {
          setError('No se encontró ningún certificado con ese código.')
        } else {
          throw queryError
        }
      } else {
        setCert(data)
      }
    } catch (err) {
      console.error('Error validando:', err)
      setError('Ocurrió un error al conectar con el servidor. Intente nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    handleValidate(formData.get('code'))
  }

  const handleReset = () => {
    setCode('')
    setCert(null)
    setError(null)
    setHasSearched(false)
    router.push('/validar', { scroll: false })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicHeader />

      <main className="flex-1 flex flex-col items-center justify-start px-4 py-12">
        <div className="w-full max-w-2xl text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Validación de Certificados</h1>
          <p className="text-gray-600">
            Verifique la autenticidad de los certificados laborales emitidos por la Fundación Oxígeno.
          </p>
        </div>

        {!hasSearched && !isLoading && (
          <ValidationSearch 
            onSearch={handleFormSubmit} 
            isLoading={isLoading} 
            initialCode={code} 
          />
        )}

        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
            <p className="text-gray-600">Consultando la base de datos...</p>
          </div>
        )}

        {error && (
          <div className="w-full max-w-md mx-auto bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg text-center">
            <p className="font-semibold mb-1">Certificado no encontrado</p>
            <p className="text-sm">{error}</p>
            <button 
              onClick={handleReset}
              className="mt-4 text-sm text-red-700 font-semibold hover:underline"
            >
              Intentar con otro código
            </button>
          </div>
        )}

        {cert && (
          <ValidationResult 
            cert={cert} 
            settings={settings} 
            onReset={handleReset} 
          />
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 py-6 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} Fundación Oxígeno. Todos los derechos reservados.</p>
        <p className="mt-1">Istmina, Chocó - Colombia</p>
      </footer>
    </div>
  )
}

// ✅ Componente principal que envuelve todo en Suspense
export default function ValidarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <PublicHeader />
        <main className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
          <p className="text-gray-600">Cargando validador...</p>
        </main>
      </div>
    }>
      <ValidarPageContent />
    </Suspense>
  )
}