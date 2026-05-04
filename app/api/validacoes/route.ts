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
// Director valida fichas de Técnicos E de Chefes de Departamento
// Para o Chefe de Departamento, aceita estado "AutoAvaliacao" (sem precisar de reavaliação)
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
        submissoes: { select: { tipo: true, pontuacaoTotal: true } },
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

    // Verificar que o Director é responsável pela direção do avaliado
    const director = await prisma.utilizador.findUnique({
      where: { id: payload.sub },
      select: { direcaoId: true },
    })

    const direcaoAvaliado =
      ficha.avaliado.direcaoId ?? ficha.avaliado.departamento?.direcaoId

    // Master pode validar qualquer ficha (incluindo Directores)
    // Director só pode validar fichas da sua Direção
    if (
      payload.role !== 'Master' &&
      director?.direcaoId &&
      direcaoAvaliado !== director.direcaoId
    ) {
      return NextResponse.json(
        { error: 'Sem permissão para validar fichas fora da sua Direção.' },
        { status: 403 },
      )
    }

    // ── Estados permitidos por role do avaliado ──────────────
    // Chefe de Departamento: Director valida directamente após a auto-avaliação
    //   → estados permitidos: AutoAvaliacao, AvaliadoPorChefe, Reavaliado
    // Técnico: fluxo normal
    //   → estados permitidos: AvaliadoPorChefe, Reavaliado
    const isChefe = ficha.avaliado.role === 'ChefeDepartamento'
    const isDirector = ficha.avaliado.role === 'Director'

    // Director auto-avaliação é validada pelo Master directamente (como Chefe pelo Director)
    // ChefeDepartamento: Director valida após AutoAvaliacao
    // Técnico: fluxo normal — AvaliadoPorChefe ou Reavaliado
    const estadosPermitidos =
      isChefe || isDirector
        ? ['AutoAvaliacao', 'AvaliadoPorChefe', 'Reavaliado']
        : ['AvaliadoPorChefe', 'Reavaliado']

    if (!estadosPermitidos.includes(ficha.estado)) {
      return NextResponse.json(
        {
          error: isChefe
            ? `Para Chefes de Departamento, a ficha deve estar em "Auto-avaliação", "Avaliado p/ Chefe" ou "Reavaliado". Estado actual: ${ficha.estado}`
            : `A ficha deve estar em "AvaliadoPorChefe" ou "Reavaliado". Estado actual: ${ficha.estado}`,
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

    // Calcular pontuação final — média ponderada das submissões
    const pontuacoes = ficha.submissoes
      .map((s) => s.pontuacaoTotal)
      .filter((p): p is number => p !== null)

    const pontuacaoFinal =
      pontuacoes.length > 0
        ? Math.round(
            (pontuacoes.reduce((a, b) => a + b, 0) / pontuacoes.length) * 100,
          ) / 100
        : null

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
          estado: 'ValidadoPorDirector',
          pontuacaoFinal: aprovado ? pontuacaoFinal : null,
        },
      })

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
