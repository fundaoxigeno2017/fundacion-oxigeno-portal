import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          supabaseResponse.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          supabaseResponse.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // ✅ Permitir acceso público a la ruta de validación
  if (request.nextUrl.pathname.startsWith('/validar')) {
    return supabaseResponse
  }

  const { data: { user } } = await supabase.auth.getUser()

  // Si no hay usuario, redirigir al login
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Si hay usuario, verificar si está activo en la base de datos
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_active')
      .eq('id', user.id)
      .single()

    // Si el perfil existe y está inactivo, cerrar sesión y redirigir
    if (profile && profile.is_active === false) {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}