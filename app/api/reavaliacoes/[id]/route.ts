// app/api/reavaliacoes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, getPayloadFromRequest } from '@/lib/permissions'

type Params = { params: Promise<{ id: string }> }

// ── GET /api/reavaliacoes/[id] ────────────────────────────────
export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, [
    'Master',
    'Director',
    'ChefeDepartamento',
    'Tecnico',
  ])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const reavaliacao = await prisma.reavaliacaoIndicada.findUnique({
    where: { id },
    select: {
      id: true,
      motivacao: true,
      dataIndicacao: true,
      concluida: true,
      ficha: {
        select: {
          id: true,
          estado: true,
          avaliado: { select: { id: true, nomeCompleto: true, cargo: true } },
          periodo: { select: { id: true, nome: true } },
        },
      },
      reavaliador: { select: { id: true, nomeCompleto: true, cargo: true } },
      indicadoPor: { select: { id: true, nomeCompleto: true, role: true } },
    },
  })

  if (!reavaliacao) {
    return NextResponse.json(
      { error: 'Reavaliação não encontrada.' },
      { status: 404 },
    )
  }

  return NextResponse.json(reavaliacao)
}

// ── DELETE /api/reavaliacoes/[id] ─────────────────────────────
// Apenas quem indicou ou Master — só se ainda não estiver concluída
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, ['Master', 'Director', 'ChefeDepartamento'])
  if (auth instanceof NextResponse) return auth

  const payload = getPayloadFromRequest(req)!
  const { id } = await params

  const reavaliacao = await prisma.reavaliacaoIndicada.findUnique({
    where: { id },
  })

  if (!reavaliacao) {
    return NextResponse.json(
      { error: 'Reavaliação não encontrada.' },
      { status: 404 },
    )
  }

  if (reavaliacao.concluida) {
    return NextResponse.json(
      { error: 'Não é possível cancelar uma reavaliação já concluída.' },
      { status: 400 },
    )
  }

  if (payload.role !== 'Master' && reavaliacao.indicadoPorId !== payload.sub) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.reavaliacaoIndicada.delete({ where: { id } })

    await tx.fichaAvaliacao.update({
      where: { id: reavaliacao.fichaId },
      data: { estado: 'AvaliadoPorChefe' },
    })
  })

  return NextResponse.json({ message: 'Reavaliação cancelada com sucesso.' })
}
