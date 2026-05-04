// app/api/fichas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, getPayloadFromRequest } from '@/lib/permissions'

type Params = { params: Promise<{ id: string }> }

// ── GET /api/fichas/[id] ──────────────────────────────────────
export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, [
    'Master',
    'Director',
    'ChefeDepartamento',
    'Tecnico',
  ])
  if (auth instanceof NextResponse) return auth

  const payload = getPayloadFromRequest(req)!
  const { id } = await params

  const ficha = await prisma.fichaAvaliacao.findUnique({
    where: { id },
    select: {
      id: true,
      estado: true,
      pontuacaoFinal: true,
      createdAt: true,
      updatedAt: true,
      avaliado: {
        select: {
          id: true,
          nomeCompleto: true,
          cargo: true,
          role: true, // ← OBRIGATÓRIO para distinguir Técnico vs ChefeDepartamento
          email: true,
          numeroMecanografico: true,
          avatarUrl: true,
          departamento: { select: { id: true, nome: true } },
          direcao: { select: { id: true, nome: true } },
        },
      },
      periodo: {
        select: {
          id: true,
          nome: true,
          dataInicio: true,
          dataFim: true,
          activo: true,
        },
      },
      submissoes: {
        orderBy: { dataSubmissao: 'asc' },
        select: {
          id: true,
          tipo: true,
          comentarios: true,
          pontuacaoTotal: true,
          dataSubmissao: true,
          avaliador: { select: { id: true, nomeCompleto: true, role: true } },
          respostas: {
            select: {
              id: true,
              pontuacao: true,
              observacao: true,
              criterio: { select: { id: true, nome: true, peso: true } },
            },
          },
        },
      },
      reavaliacao: {
        select: {
          id: true,
          motivacao: true,
          dataIndicacao: true,
          concluida: true,
          reavaliador: { select: { id: true, nomeCompleto: true } },
          indicadoPor: { select: { id: true, nomeCompleto: true, role: true } },
        },
      },
      validacao: {
        select: {
          id: true,
          aprovado: true,
          comentarios: true,
          dataValidacao: true,
          director: { select: { id: true, nomeCompleto: true } },
        },
      },
    },
  })

  if (!ficha) {
    return NextResponse.json(
      { error: 'Ficha não encontrada.' },
      { status: 404 },
    )
  }

  // Técnico só pode ver a sua própria ficha
  if (payload.role === 'Tecnico' && ficha.avaliado.id !== payload.sub) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  return NextResponse.json(ficha)
}

// ── DELETE /api/fichas/[id] ───────────────────────────────────
// Apenas Master — só se ainda estiver Pendente
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, ['Master'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const ficha = await prisma.fichaAvaliacao.findUnique({ where: { id } })
  if (!ficha) {
    return NextResponse.json(
      { error: 'Ficha não encontrada.' },
      { status: 404 },
    )
  }

  if (ficha.estado !== 'Pendente') {
    return NextResponse.json(
      { error: 'Só é possível eliminar fichas no estado Pendente.' },
      { status: 400 },
    )
  }

  await prisma.fichaAvaliacao.delete({ where: { id } })
  return NextResponse.json({ message: 'Ficha eliminada com sucesso.' })
}
