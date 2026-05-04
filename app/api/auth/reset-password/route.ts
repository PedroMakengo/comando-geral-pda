import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { requireRole } from '@/lib/permissions'

export async function POST(req: NextRequest) {
  // Apenas Master pode redefinir passwords
  const auth = requireRole(req, ['Master'])
  if (auth instanceof Response) return auth

  try {
    const { utilizadorId, novaSenha } = await req.json()

    if (!utilizadorId || !novaSenha) {
      return NextResponse.json(
        { error: 'ID do utilizador e nova senha são obrigatórios.' },
        { status: 400 },
      )
    }

    if (novaSenha.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres.' },
        { status: 400 },
      )
    }

    const utilizador = await prisma.utilizador.findUnique({
      where: { id: utilizadorId },
    })

    if (!utilizador) {
      return NextResponse.json(
        { error: 'Utilizador não encontrado.' },
        { status: 404 },
      )
    }

    await prisma.utilizador.update({
      where: { id: utilizadorId },
      data: { passwordHash: await hashPassword(novaSenha) },
    })

    return NextResponse.json({ message: 'Senha redefinida com sucesso.' })
  } catch (error) {
    console.error('[RESET_PASSWORD]', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 },
    )
  }
}
