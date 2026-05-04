// app/api/submissoes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, getPayloadFromRequest } from '@/lib/permissions'

type Params = { params: Promise<{ id: string }> }

// ── GET /api/submissoes/[id] ──────────────────────────────────
export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, [
    'Master',
    'Director',
    'ChefeDepartamento',
    'Tecnico',
  ])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const submissao = await prisma.submissaoAvaliacao.findUnique({
    where: { id },
    select: {
      id: true,
      tipo: true,
      comentarios: true,
      pontuacaoTotal: true,
      dataSubmissao: true,
      avaliador: {
        select: { id: true, nomeCompleto: true, role: true, cargo: true },
      },
      ficha: {
        select: {
          id: true,
          estado: true,
          periodo: { select: { id: true, nome: true } },
          avaliado: {
            select: {
              id: true,
              nomeCompleto: true,
              cargo: true,
              departamento: { select: { id: true, nome: true } },
            },
          },
        },
      },
      respostas: {
        select: {
          id: true,
          pontuacao: true,
          observacao: true,
          criterio: {
            select: { id: true, nome: true, descricao: true, peso: true },
          },
        },
        orderBy: { criterio: { nome: 'asc' } },
      },
    },
  })

  if (!submissao) {
    return NextResponse.json(
      { error: 'Submissão não encontrada.' },
      { status: 404 },
    )
  }

  return NextResponse.json(submissao)
}

// ── DELETE /api/submissoes/[id] ───────────────────────────────
// Apenas Master ou o próprio avaliador (se for AutoAvaliacao e a ficha ainda estiver nesse estado)
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, [
    'Master',
    'Director',
    'ChefeDepartamento',
    'Tecnico',
  ])
  if (auth instanceof NextResponse) return auth

  const payload = getPayloadFromRequest(req)!
  const { id } = await params

  const submissao = await prisma.submissaoAvaliacao.findUnique({
    where: { id },
    include: { ficha: true },
  })

  if (!submissao) {
    return NextResponse.json(
      { error: 'Submissão não encontrada.' },
      { status: 404 },
    )
  }

  const isMaster = payload.role === 'Master'
  const isProprioAvaliador = payload.sub === submissao.avaliadorId

  // Só Master pode eliminar qualquer submissão
  // O avaliador só pode eliminar a sua auto-avaliação se a ficha ainda estiver em AutoAvaliacao
  if (!isMaster) {
    if (!isProprioAvaliador) {
      return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
    }
    if (
      submissao.tipo !== 'AutoAvaliacao' ||
      submissao.ficha.estado !== 'AutoAvaliacao'
    ) {
      return NextResponse.json(
        {
          error:
            'Não é possível eliminar esta submissão no estado actual da ficha.',
        },
        { status: 400 },
      )
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.submissaoAvaliacao.delete({ where: { id } })

    // Reverter estado da ficha para Pendente se era AutoAvaliacao
    if (submissao.tipo === 'AutoAvaliacao') {
      await tx.fichaAvaliacao.update({
        where: { id: submissao.fichaId },
        data: { estado: 'Pendente' },
      })
    }
  })

  return NextResponse.json({ message: 'Submissão eliminada com sucesso.' })
}
