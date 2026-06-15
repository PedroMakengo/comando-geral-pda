// app/api/fichas/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, getPayloadFromRequest } from '@/lib/permissions'

// ── GET /api/fichas ───────────────────────────────────────────
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

  const periodoId = searchParams.get('periodoId') ?? undefined
  const avaliadoId = searchParams.get('avaliadoId') ?? undefined
  const estado = searchParams.get('estado') ?? undefined
  const departamentoId = searchParams.get('departamentoId') ?? undefined
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(100, Number(searchParams.get('limit') ?? 20))
  const skip = (page - 1) * limit

  const avaliadoFiltro =
    payload.role === 'Tecnico' ? payload.sub : (avaliadoId ?? undefined)

  let direcaoFiltro: string | undefined
  if (payload.role === 'Director') {
    const director = await prisma.utilizador.findUnique({
      where: { id: payload.sub },
      select: { direcaoId: true },
    })
    direcaoFiltro = director?.direcaoId ?? undefined
  }

  let chefeDeptFiltro: string | undefined
  if (payload.role === 'ChefeDepartamento') {
    const chefe = await prisma.utilizador.findUnique({
      where: { id: payload.sub },
      select: { departamentoId: true },
    })
    chefeDeptFiltro = chefe?.departamentoId ?? undefined
  }

  const where = {
    ...(avaliadoFiltro && { avaliadoId: avaliadoFiltro }),
    ...(periodoId && { periodoId }),
    ...(estado && { estado: estado as any }),
    ...((departamentoId || chefeDeptFiltro) && {
      avaliado: { departamentoId: departamentoId ?? chefeDeptFiltro },
    }),
    ...(direcaoFiltro &&
      !avaliadoFiltro && {
        avaliado: {
          direcaoId: direcaoFiltro,
          ...(departamentoId && { departamentoId }),
        },
      }),
  }

  const [total, fichas] = await Promise.all([
    prisma.fichaAvaliacao.count({ where }),
    prisma.fichaAvaliacao.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
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
            role: true,
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
        // submissao singular — inclui respostas para o card expansível
        submissao: {
          select: {
            id: true,
            comentarios: true,
            pontuacaoTotal: true,
            dataSubmissao: true,
            avaliador: { select: { id: true, nomeCompleto: true } },
            respostas: {
              select: {
                id: true,
                pontuacao: true,
                observacao: true,
                criterio: {
                  select: { id: true, nome: true, peso: true, descricao: true },
                },
              },
              orderBy: { criterio: { nome: 'asc' } },
            },
          },
        },
        validacao: {
          select: {
            aprovado: true,
            comentarios: true,
            dataValidacao: true,
            director: { select: { id: true, nomeCompleto: true } },
          },
        },
      },
    }),
  ])

  return NextResponse.json({
    data: fichas,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  })
}

// ── POST /api/fichas ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ['Master'])
  if (auth instanceof NextResponse) return auth

  try {
    const { avaliadoId, periodoId } = await req.json()

    if (!avaliadoId || !periodoId) {
      return NextResponse.json(
        { error: 'avaliadoId e periodoId são obrigatórios.' },
        { status: 400 },
      )
    }

    const avaliado = await prisma.utilizador.findUnique({
      where: { id: avaliadoId },
    })
    if (!avaliado) {
      return NextResponse.json(
        { error: 'Utilizador não encontrado.' },
        { status: 404 },
      )
    }
    if (avaliado.role === 'Master') {
      return NextResponse.json(
        { error: 'Masters não podem ser avaliados.' },
        { status: 400 },
      )
    }

    const periodo = await prisma.periodoAvaliacao.findUnique({
      where: { id: periodoId },
    })
    if (!periodo) {
      return NextResponse.json(
        { error: 'Período não encontrado.' },
        { status: 404 },
      )
    }
    if (!periodo.activo) {
      return NextResponse.json(
        { error: 'Só é possível criar fichas num período activo.' },
        { status: 400 },
      )
    }

    const existe = await prisma.fichaAvaliacao.findUnique({
      where: { avaliadoId_periodoId: { avaliadoId, periodoId } },
    })
    if (existe) {
      return NextResponse.json(
        { error: 'Já existe uma ficha para este utilizador neste período.' },
        { status: 409 },
      )
    }

    const ficha = await prisma.fichaAvaliacao.create({
      data: { avaliadoId, periodoId },
      select: {
        id: true,
        estado: true,
        createdAt: true,
        avaliado: {
          select: { id: true, nomeCompleto: true, cargo: true, role: true },
        },
        periodo: { select: { id: true, nome: true } },
      },
    })

    return NextResponse.json(ficha, { status: 201 })
  } catch (error) {
    console.error('[FICHAS_POST]', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 },
    )
  }
}
