import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  comparePassword,
  signToken,
  COOKIE_NAME,
  COOKIE_OPTIONS,
} from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { login, password } = await req.json()

    if (!login || !password) {
      return NextResponse.json(
        { error: 'Credenciais obrigatórias.' },
        { status: 400 },
      )
    }

    const utilizador = await prisma.utilizador.findFirst({
      where: {
        OR: [{ email: login }, { numeroMecanografico: login }],
      },
    })

    if (!utilizador) {
      return NextResponse.json(
        { error: 'Credenciais inválidas.' },
        { status: 401 },
      )
    }

    if (utilizador.estado === 'Inactivo') {
      return NextResponse.json(
        { error: 'Conta inactiva. Contacte o administrador.' },
        { status: 403 },
      )
    }

    const passwordValida = await comparePassword(
      password,
      utilizador.passwordHash,
    )
    if (!passwordValida) {
      return NextResponse.json(
        { error: 'Credenciais inválidas.' },
        { status: 401 },
      )
    }

    const token = signToken({
      sub: utilizador.id,
      email: utilizador.email,
      role: utilizador.role,
    })

    // ✅ Cookie definido na response — funciona em produção
    const response = NextResponse.json({
      id: utilizador.id,
      nomeCompleto: utilizador.nomeCompleto,
      email: utilizador.email,
      role: utilizador.role,
      avatarUrl: utilizador.avatarUrl,
    })

    response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS)

    return response
  } catch (error) {
    console.error('[LOGIN]', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 },
    )
  }
}
