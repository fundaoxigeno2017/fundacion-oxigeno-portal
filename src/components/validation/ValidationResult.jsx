'use client'

export default function ValidationResult({ cert, settings, onReset }) {
  if (!cert) return null

  const isRevoked = cert.status === 'revoked'

  return (
    <div className={`w-full max-w-2xl mx-auto rounded-2xl shadow-lg border overflow-hidden ${
      isRevoked ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
    }`}>
      {/* Encabezado de la tarjeta */}
      <div className={`p-6 text-center border-b ${isRevoked ? 'bg-red-100 border-red-200' : 'bg-green-100 border-green-200'}`}>
        <div className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center ${
          isRevoked ? 'bg-red-200 text-red-700' : 'bg-green-200 text-green-700'
        }`}>
          {isRevoked ? (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          )}
        </div>
        <h2 className={`text-2xl font-bold ${isRevoked ? 'text-red-800' : 'text-green-800'}`}>
          {isRevoked ? 'Certificado Revocado' : 'Certificado Válido'}
        </h2>
        <p className={`text-sm mt-1 ${isRevoked ? 'text-red-700' : 'text-green-700'}`}>
          {isRevoked 
            ? 'Este documento ha sido anulado por la entidad emisora.' 
            : 'Este documento es auténtico y fue emitido por la Fundación Oxígeno.'}
        </p>
      </div>

      {/* Cuerpo de la tarjeta */}
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Nombre</p>
            <p className="text-base font-medium text-gray-900">{cert.emp_name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Documento</p>
            <p className="text-base font-medium text-gray-900">{cert.emp_doc_type} {cert.emp_doc_number}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Cargo</p>
            <p className="text-base font-medium text-gray-900">{cert.templates?.cargo || 'No especificado'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Fecha de Emisión</p>
            <p className="text-base font-medium text-gray-900">
              {new Date(cert.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* ✅ NUEVO CAMPO: Ubicación de creación (DENTRO del grid) */}
          {cert.creation_location && (
            <div className="md:col-span-2 bg-gray-100 p-3 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Ubicación de Generación</p>
              <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                📍 {cert.creation_location}
              </p>
            </div>
          )}
        </div>

        {isRevoked && cert.revoke_reason && (
          <div className="mt-4 p-4 bg-red-100 rounded-lg border border-red-200">
            <p className="text-xs font-semibold text-red-800 uppercase mb-1">Motivo de Revocación</p>
            <p className="text-sm text-red-900">{cert.revoke_reason}</p>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center font-mono break-all">
            Hash de integridad: {cert.hash || 'N/A'}
          </p>
        </div>
      </div>

      {/* Pie de la tarjeta */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
        <button 
          onClick={onReset}
          className="text-sm text-teal-700 font-semibold hover:text-teal-800 hover:underline"
        >
          Validar otro certificado
        </button>
      </div>
    </div>
  )
}