// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getPayloadFromRequest } from './lib/permissions'

const ROLE_ROUTES: Record<string, string> = {
  Master: '/master',
  Director: '/director',
  ChefeDepartamento: '/chefe',
  Tecnico: '/tecnico',
}

const PUBLIC_ROUTES = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/activate',
  '/acesso-negado',
]

const PUBLIC_API_ROUTES = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/activate',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
]

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/') return NextResponse.next()

  if (
    PUBLIC_API_ROUTES.some(
      (r) => pathname === r || pathname.startsWith(r + '/'),
    )
  ) {
    return NextResponse.next()
  }

  if (
    PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))
  ) {
    return NextResponse.next()
  }

  const payload = getPayloadFromRequest(request)

  if (pathname.startsWith('/api/')) {
    if (!payload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    return NextResponse.next()
  }

  if (!payload) {
    const loginUrl = new URL('/', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const allowedPrefix = ROLE_ROUTES[payload.role]
  if (allowedPrefix && !pathname.startsWith(allowedPrefix)) {
    return NextResponse.redirect(new URL(allowedPrefix, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/|favicon.ico|images|icons|fonts|svg|public|.*\\.(?:ico|woff|woff2|ttf|otf|png|jpg|jpeg|gif|webp|svg)).*)',
  ],
}
