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
      comentarios: true,
      pontuacaoTotal: true,
      dataSubmissao: true,
      updatedAt: true,
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

// ── PATCH /api/submissoes/[id] ────────────────────────────────
// Permite ao Chefe corrigir a submissão enquanto a ficha ainda
// está em AvaliadoPorChefe (antes de o Director validar)
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, ['Master', 'ChefeDepartamento'])
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

  // Só o próprio avaliador ou Master podem editar
  if (payload.role !== 'Master' && submissao.avaliadorId !== payload.sub) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  // Só é possível editar enquanto o Director ainda não validou
  if (submissao.ficha.estado === 'ValidadoPorDirector') {
    return NextResponse.json(
      {
        error: 'Não é possível editar uma submissão já validada pelo Director.',
      },
      { status: 400 },
    )
  }

  const { comentarios, respostas } = await req.json()

  // Se vieram respostas novas, validar e recalcular pontuação
  let pontuacaoTotal: number | null = submissao.pontuacaoTotal ?? null

  if (Array.isArray(respostas) && respostas.length > 0) {
    for (const r of respostas) {
      if (!r.criterioId || typeof r.pontuacao !== 'number') {
        return NextResponse.json(
          { error: 'Cada resposta deve ter criterioId e pontuacao.' },
          { status: 400 },
        )
      }
      if (r.pontuacao < 1 || r.pontuacao > 5) {
        return NextResponse.json(
          { error: 'A pontuação deve estar entre 1 e 5.' },
          { status: 400 },
        )
      }
    }

    const criterios = await prisma.criterio.findMany({
      where: { id: { in: respostas.map((r: any) => r.criterioId) } },
      select: { id: true, peso: true },
    })

    const pesosMap = Object.fromEntries(criterios.map((c) => [c.id, c.peso]))
    const totalPeso = criterios.reduce((acc, c) => acc + c.peso, 0)
    pontuacaoTotal =
      totalPeso > 0
        ? Math.round(
            (respostas.reduce((acc: number, r: any) => {
              return acc + r.pontuacao * (pesosMap[r.criterioId] ?? 1)
            }, 0) /
              totalPeso) *
              100,
          ) / 100
        : null
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Actualizar respostas se vieram novas
    if (Array.isArray(respostas) && respostas.length > 0) {
      // Apagar as existentes e recriar (mais simples que upsert por criterioId)
      await tx.criterioResposta.deleteMany({ where: { submissaoId: id } })
      await tx.criterioResposta.createMany({
        data: respostas.map((r: any) => ({
          submissaoId: id,
          criterioId: r.criterioId,
          pontuacao: r.pontuacao,
          observacao: r.observacao?.trim() || null,
        })),
      })
    }

    const sub = await tx.submissaoAvaliacao.update({
      where: { id },
      data: {
        ...(comentarios !== undefined && {
          comentarios: comentarios?.trim() || null,
        }),
        ...(pontuacaoTotal !== null && { pontuacaoTotal }),
      },
      include: {
        respostas: {
          include: {
            criterio: { select: { id: true, nome: true, peso: true } },
          },
        },
      },
    })

    // Actualizar pontuacaoFinal da ficha
    if (pontuacaoTotal !== null) {
      await tx.fichaAvaliacao.update({
        where: { id: submissao.fichaId },
        data: { pontuacaoFinal: pontuacaoTotal },
      })
    }

    return sub
  })

  return NextResponse.json(updated)
}

// ── DELETE /api/submissoes/[id] ───────────────────────────────
// Master: pode sempre eliminar
// Chefe: só pode eliminar a sua submissão se a ficha ainda
//        estiver em AvaliadoPorChefe (Director ainda não validou)
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, ['Master', 'ChefeDepartamento'])
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

  if (!isMaster) {
    if (submissao.avaliadorId !== payload.sub) {
      return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
    }
    if (submissao.ficha.estado === 'ValidadoPorDirector') {
      return NextResponse.json(
        {
          error:
            'Não é possível eliminar uma submissão já validada pelo Director.',
        },
        { status: 400 },
      )
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.submissaoAvaliacao.delete({ where: { id } })

    // Reverter ficha para Pendente — Chefe terá de avaliar novamente
    await tx.fichaAvaliacao.update({
      where: { id: submissao.fichaId },
      data: { estado: 'Pendente', pontuacaoFinal: null },
    })
  })

  return NextResponse.json({
    message: 'Submissão eliminada. A ficha voltou ao estado Pendente.',
  })
}
