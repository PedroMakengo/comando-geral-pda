// app/api/reavaliacoes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, getPayloadFromRequest } from '@/lib/permissions'

// ── GET /api/reavaliacoes ─────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = requireRole(req, [
    'Master',
    'Director',
    'ChefeDepartamento',
    'Tecnico',
  ])
  if (auth instanceof NextResponse) return auth

  const payload = getPayloadFromRequest(req)!
  const { searchParams } = req.nextUrl

  const fichaId = searchParams.get('fichaId') ?? undefined
  const reavaliadorId = searchParams.get('reavaliadorId') ?? undefined
  const departamentoId = searchParams.get('departamentoId') ?? undefined
  const concluida = searchParams.get('concluida')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.max(1, parseInt(searchParams.get('limit') ?? '15'))
  const skip = (page - 1) * limit

  const reavaliadorFiltro =
    payload.role === 'Tecnico' ? payload.sub : (reavaliadorId ?? undefined)

  const where = {
    ...(fichaId && { fichaId }),
    ...(reavaliadorFiltro && { reavaliadorId: reavaliadorFiltro }),
    ...(concluida !== null &&
      concluida !== undefined && {
        concluida: concluida === 'true',
      }),
    ...(departamentoId && {
      ficha: {
        avaliado: {
          departamentoId,
        },
      },
    }),
  }

  const select = {
    id: true,
    motivacao: true,
    dataIndicacao: true,
    concluida: true,
    ficha: {
      select: {
        id: true,
        estado: true,
        avaliado: {
          select: {
            id: true,
            nomeCompleto: true,
            cargo: true,
            departamento: { select: { id: true, nome: true } },
          },
        },
        periodo: { select: { id: true, nome: true } },
      },
    },
    reavaliador: { select: { id: true, nomeCompleto: true, cargo: true } },
    indicadoPor: { select: { id: true, nomeCompleto: true, role: true } },
  }

  const [reavaliacoes, total] = await prisma.$transaction([
    prisma.reavaliacaoIndicada.findMany({
      where,
      orderBy: { dataIndicacao: 'desc' },
      skip,
      take: limit,
      select,
    }),
    prisma.reavaliacaoIndicada.count({ where }),
  ])

  return NextResponse.json({
    data: reavaliacoes,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  })
}

// ── POST /api/reavaliacoes ────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ['Director', 'ChefeDepartamento'])
  if (auth instanceof NextResponse) return auth

  const payload = getPayloadFromRequest(req)!

  try {
    const { fichaId, reavaliadorId, motivacao } = await req.json()

    if (!fichaId || !reavaliadorId) {
      return NextResponse.json(
        { error: 'fichaId e reavaliadorId são obrigatórios.' },
        { status: 400 },
      )
    }

    const ficha = await prisma.fichaAvaliacao.findUnique({
      where: { id: fichaId },
      include: { reavaliacao: true },
    })

    if (!ficha) {
      return NextResponse.json(
        { error: 'Ficha não encontrada.' },
        { status: 404 },
      )
    }

    if (ficha.estado !== 'AvaliadoPorChefe') {
      return NextResponse.json(
        {
          error:
            'A reavaliação só pode ser indicada após a avaliação do chefe.',
        },
        { status: 400 },
      )
    }

    if (ficha.reavaliacao) {
      return NextResponse.json(
        { error: 'Já existe uma reavaliação indicada para esta ficha.' },
        { status: 409 },
      )
    }

    const reavaliador = await prisma.utilizador.findUnique({
      where: { id: reavaliadorId },
    })
    if (!reavaliador) {
      return NextResponse.json(
        { error: 'Reavaliador não encontrado.' },
        { status: 404 },
      )
    }
    if (reavaliador.role !== 'Tecnico') {
      return NextResponse.json(
        { error: 'O reavaliador deve ser um Técnico.' },
        { status: 400 },
      )
    }
    if (reavaliadorId === ficha.avaliadoId) {
      return NextResponse.json(
        { error: 'O reavaliador não pode ser o próprio avaliado.' },
        { status: 400 },
      )
    }

    const reavaliacao = await prisma.$transaction(async (tx) => {
      const rev = await tx.reavaliacaoIndicada.create({
        data: {
          fichaId,
          reavaliadorId,
          indicadoPorId: payload.sub,
          motivacao: motivacao?.trim() || null,
        },
        select: {
          id: true,
          motivacao: true,
          dataIndicacao: true,
          concluida: true,
          reavaliador: { select: { id: true, nomeCompleto: true } },
          indicadoPor: { select: { id: true, nomeCompleto: true, role: true } },
        },
      })

      await tx.fichaAvaliacao.update({
        where: { id: fichaId },
        data: { estado: 'EmReavaliacao' },
      })

      return rev
    })

    return NextResponse.json(reavaliacao, { status: 201 })
  } catch (error) {
    console.error('[REAVALIACOES_POST]', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 },
    )
  }
}
