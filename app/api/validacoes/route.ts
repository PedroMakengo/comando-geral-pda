// app/api/validacoes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, getPayloadFromRequest } from '@/lib/permissions'

// ── GET /api/validacoes ───────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ['Master', 'Director'])
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const fichaId = searchParams.get('fichaId') ?? undefined
  const directorId = searchParams.get('directorId') ?? undefined
  const aprovado = searchParams.get('aprovado')

  const validacoes = await prisma.validacaoDirector.findMany({
    where: {
      ...(fichaId && { fichaId }),
      ...(directorId && { directorId }),
      ...(aprovado !== null &&
        aprovado !== undefined && {
          aprovado: aprovado === 'true',
        }),
    },
    orderBy: { dataValidacao: 'desc' },
    select: {
      id: true,
      aprovado: true,
      comentarios: true,
      dataValidacao: true,
      director: { select: { id: true, nomeCompleto: true } },
      ficha: {
        select: {
          id: true,
          estado: true,
          pontuacaoFinal: true,
          avaliado: { select: { id: true, nomeCompleto: true, cargo: true } },
          periodo: { select: { id: true, nome: true } },
        },
      },
    },
  })

  return NextResponse.json(validacoes)
}

// ── POST /api/validacoes ──────────────────────────────────────
// Director aprova ou rejeita uma ficha no estado AvaliadoPorChefe.
// Se rejeitada, a ficha volta a Pendente para o Chefe reaviar.
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ['Director', 'Master'])
  if (auth instanceof NextResponse) return auth

  const payload = getPayloadFromRequest(req)!

  try {
    const { fichaId, aprovado, comentarios } = await req.json()

    if (!fichaId || aprovado === undefined || aprovado === null) {
      return NextResponse.json(
        { error: 'fichaId e aprovado são obrigatórios.' },
        { status: 400 },
      )
    }
    if (typeof aprovado !== 'boolean') {
      return NextResponse.json(
        { error: '"aprovado" deve ser true ou false.' },
        { status: 400 },
      )
    }

    const ficha = await prisma.fichaAvaliacao.findUnique({
      where: { id: fichaId },
      include: {
        validacao: true,
        // submissao singular — @unique fichaId
        submissao: { select: { pontuacaoTotal: true } },
        avaliado: {
          select: {
            id: true,
            role: true,
            direcaoId: true,
            departamento: { select: { direcaoId: true } },
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

    // Director só pode validar fichas da sua Direção
    if (payload.role !== 'Master') {
      const director = await prisma.utilizador.findUnique({
        where: { id: payload.sub },
        select: { direcaoId: true },
      })
      const direcaoAvaliado =
        ficha.avaliado.direcaoId ?? ficha.avaliado.departamento?.direcaoId
      if (director?.direcaoId && direcaoAvaliado !== director.direcaoId) {
        return NextResponse.json(
          { error: 'Sem permissão para validar fichas fora da sua Direção.' },
          { status: 403 },
        )
      }
    }

    // Só é possível validar fichas no estado AvaliadoPorChefe
    if (ficha.estado !== 'AvaliadoPorChefe') {
      return NextResponse.json(
        {
          error: `A ficha deve estar em "AvaliadoPorChefe" para ser validada. Estado actual: ${ficha.estado}.`,
        },
        { status: 400 },
      )
    }

    if (ficha.validacao) {
      return NextResponse.json(
        { error: 'Esta ficha já foi validada.' },
        { status: 409 },
      )
    }

    // Pontuação final vem directamente da submissão do chefe
    const pontuacaoFinal = ficha.submissao?.pontuacaoTotal ?? null

    const validacao = await prisma.$transaction(async (tx) => {
      const val = await tx.validacaoDirector.create({
        data: {
          fichaId,
          directorId: payload.sub,
          aprovado,
          comentarios: comentarios?.trim() || null,
        },
        select: {
          id: true,
          aprovado: true,
          comentarios: true,
          dataValidacao: true,
          director: { select: { id: true, nomeCompleto: true } },
        },
      })

      await tx.fichaAvaliacao.update({
        where: { id: fichaId },
        data: {
          // Aprovado → ValidadoPorDirector | Rejeitado → Pendente (Chefe reavalia)
          estado: aprovado ? 'ValidadoPorDirector' : 'Pendente',
          pontuacaoFinal: aprovado ? pontuacaoFinal : null,
        },
      })

      // Se rejeitado, apagar a submissão anterior para o Chefe poder submeter de novo
      if (!aprovado && ficha.submissao) {
        await tx.submissaoAvaliacao.delete({
          where: { fichaId },
        })
      }

      return val
    })

    return NextResponse.json(validacao, { status: 201 })
  } catch (error) {
    console.error('[VALIDACOES_POST]', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 },
    )
  }
}
