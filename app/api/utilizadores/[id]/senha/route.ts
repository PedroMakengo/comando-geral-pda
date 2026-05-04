import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword, hashPassword } from '@/lib/auth'
import { requireAuth, getPayloadFromRequest } from '@/lib/permissions'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const payload = getPayloadFromRequest(req)!
  const { id } = await params

  if (payload.sub !== id) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  const { senhaActual, novaSenha } = await req.json()

  if (!senhaActual || !novaSenha) {
    return NextResponse.json(
      { error: 'Campos obrigatórios em falta.' },
      { status: 400 },
    )
  }

  if (novaSenha.length < 6) {
    return NextResponse.json(
      { error: 'A nova senha deve ter pelo menos 6 caracteres.' },
      { status: 400 },
    )
  }

  const utilizador = await prisma.utilizador.findUnique({ where: { id } })
  if (!utilizador) {
    return NextResponse.json(
      { error: 'Utilizador não encontrado.' },
      { status: 404 },
    )
  }

  const senhaCorrecta = await comparePassword(
    senhaActual,
    utilizador.passwordHash,
  )
  if (!senhaCorrecta) {
    return NextResponse.json(
      { error: 'Senha actual incorrecta.' },
      { status: 400 },
    )
  }

  await prisma.utilizador.update({
    where: { id },
    data: { passwordHash: await hashPassword(novaSenha) },
  })

  return NextResponse.json({ message: 'Senha alterada com sucesso.' })
}
