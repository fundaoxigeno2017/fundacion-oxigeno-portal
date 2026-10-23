'use client'

export default function ValidationSearch({ onSearch, isLoading, initialCode }) {
  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={onSearch} className="flex flex-col gap-4">
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
            Código de Verificación
          </label>
          <input
            id="code"
            type="text"
            name="code"
            defaultValue={initialCode}
            placeholder="Ej: OX-ABCD-1234-EFGH"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-lg font-mono tracking-wider uppercase focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-teal-700 text-white font-semibold rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Validando...
            </>
          ) : (
            'Validar Certificado'
          )}
        </button>
      </form>
    </div>
  )
}