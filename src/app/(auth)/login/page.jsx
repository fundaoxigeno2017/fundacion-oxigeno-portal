'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const LOGO_ENTIDAD = '/1.1.oxigeno.png'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 1. Intentar iniciar sesión
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : authError.message)
      } else if (authData.user) {
        // 2. VERIFICAR SI EL USUARIO ESTÁ ACTIVO EN LA TABLA PROFILES
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_active')
          .eq('id', authData.user.id)
          .single()

        if (profileError) {
          console.error('Error al verificar perfil:', profileError)
          setError('Error al verificar el estado de la cuenta.')
          await supabase.auth.signOut() // Por seguridad, cerrar sesión
        } else if (profile.is_active === false) {
          // 3. BLOQUEAR EL INGRESO SI ESTÁ INACTIVO
          setError('⚠️ Tu cuenta ha sido desactivada. Contacta al administrador.')
          await supabase.auth.signOut() // Cerrar sesión inmediatamente
        } else {
          // 4. TODO ESTÁ BIEN, REDIRIGIR AL DASHBOARD
          router.push('/dashboard')
          router.refresh()
        }
      }
    } catch {
      setError('Error al iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen w-full">
      <div
        className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6"
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
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(
                ellipse at 18% 50%,
                rgba(86, 157, 164, 0.25) 0%,
                transparent 42%
              ),
              radial-gradient(
                ellipse at 82% 48%,
                rgba(72, 145, 153, 0.22) 0%,
                transparent 42%
              )
            `,
          }}
        />

        <div className="relative z-10 w-full max-w-[440px]">
          <header className="mb-8 text-center sm:mb-10">
            <div className="mb-6 flex justify-center">
              <img
                src={LOGO_ENTIDAD}
                alt="Fundación Oxígeno"
                className="h-[185px] w-auto max-w-[320px] object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
                style={{ minHeight: '185px' }}
              />
            </div>

            <h1 className="text-[21px] font-medium tracking-[0.08em] text-white sm:text-[24px]">
              FUNDACION OXIGENO
            </h1>

            <p className="mt-1 text-[12px] font-light tracking-[0.10em] text-[#e1eeee] sm:text-[13px]">
              PORTAL DE CERTIFICACION LABORAL
            </p>

            <p className="mt-3 text-[15px] font-light tracking-[0.18em] text-white sm:text-[16px]">
              ACCESO AL PORTAL
            </p>
          </header>

          <section className="w-full rounded-2xl border border-white/10 bg-[#071d20]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.28)] sm:p-8">
            <form onSubmit={handleLogin} className="flex flex-col gap-7">
              <div>
                <div className="flex h-[62px] w-full overflow-hidden rounded-xl shadow-md sm:h-[66px]">
                  <div className="flex w-[56px] shrink-0 items-center justify-center bg-[#eeeeee] sm:w-[62px]">
                    <svg className="h-6 w-6 text-[#555555]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21v-2a8 8 0 0 1 16 0v2Z" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Correo electrónico"
                    aria-label="Correo electrónico"
                    required
                    className="min-w-0 flex-1 border-0 bg-[#d8d8d8] px-3 text-[15px] text-[#333333] outline-none placeholder:text-[#5b5b5b] focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#57949b] sm:px-4 sm:text-[16px]"
                  />
                </div>
              </div>

              <div>
                <div className="flex h-[62px] w-full overflow-hidden rounded-xl shadow-md sm:h-[66px]">
                  <div className="flex w-[56px] shrink-0 items-center justify-center bg-[#eeeeee] sm:w-[62px]">
                    <svg className="h-6 w-6 text-[#555555]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="4.5" y="10" width="15" height="11" rx="1.5" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                      <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none" />
                      <path d="M12 16v2" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña"
                    aria-label="Contraseña"
                    required
                    className="min-w-0 flex-1 border-0 bg-[#d8d8d8] px-3 text-[15px] text-[#333333] outline-none placeholder:text-[#5b5b5b] focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#57949b] sm:px-4 sm:text-[16px]"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-[#0b2528] px-4 py-3">
                <label htmlFor="remember" className="flex cursor-pointer items-center text-sm text-[#d0d0d0]">
                  <input
                    id="remember"
                    name="remember"
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-[17px] w-[17px] cursor-pointer rounded border border-[#78999c] accent-[#57949b] focus:ring-2 focus:ring-[#57949b]"
                  />
                  <span className="ml-3">Recordarme</span>
                </label>
              </div>

              {error && (
                <div role="alert" className="rounded-lg border border-red-400/30 bg-red-950/50 px-4 py-3 text-center text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-[54px] w-full items-center justify-center rounded-lg bg-[#4f8f97] text-base font-medium tracking-[0.14em] text-white shadow-md transition-colors duration-200 hover:bg-[#5999a1] focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-2 focus:ring-offset-[#071d20] disabled:cursor-not-allowed disabled:opacity-60 sm:h-[58px]"
              >
                {loading ? (
                  <span className="flex items-center gap-3">
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
                    </svg>
                    VALIDANDO...
                  </span>
                ) : (
                  'INGRESAR'
                )}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  )
}