// lib/permissions.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, JwtPayload } from './auth'

export const ROLE_ROUTES: Record<string, string> = {
  Master: '/master',
  Director: '/director',
  ChefeDepartamento: '/chefe',
  Tecnico: '/tecnico',
}

export function getPayloadFromRequest(req: NextRequest): JwtPayload | null {
  const token = req.cookies.get('ua_token')?.value
  if (!token) return null
  return verifyToken(token)
}

export function requireAuth(
  req: NextRequest,
): { payload: JwtPayload } | NextResponse {
  const payload = getPayloadFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  return { payload }
}

export function requireRole(
  req: NextRequest,
  roles: string[],
): { payload: JwtPayload } | NextResponse {
  const result = requireAuth(req)
  if (result instanceof NextResponse) return result
  const { payload } = result
  if (!roles.includes(payload.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  return { payload }
}
