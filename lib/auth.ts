// lib/auth.ts
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

export interface JwtPayload {
  sub: string
  email: string
  role: string
  iat?: number
  exp?: number
}

export const COOKIE_NAME = 'ua_token'

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7,
  path: '/',
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions)
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
}

// ✅ Apenas para Server Components / Server Actions
export async function getTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value ?? null
}

export async function getCurrentUser() {
  const token = await getTokenFromCookies()
  if (!token) return null

  const payload = verifyToken(token)
  if (!payload) return null

  return prisma.utilizador.findUnique({
    where: { id: payload.sub, estado: 'Activo' },
    select: {
      id: true,
      nomeCompleto: true,
      email: true,
      numeroMecanografico: true,
      cargo: true,
      avatarUrl: true,
      role: true,
      estado: true,
      // ── Objectos expandidos em vez de só IDs ──
      pelouro: { select: { id: true, nome: true } },
      direcao: { select: { id: true, nome: true } },
      departamento: { select: { id: true, nome: true } },
      chefeDe: { select: { id: true, nome: true } },
    },
  })
}
export type CurrentUser = NonNullable<
  Awaited<ReturnType<typeof getCurrentUser>>
>
