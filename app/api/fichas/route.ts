// app/api/fichas/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, getPayloadFromRequest } from '@/lib/permissions'

// ── GET /api/fichas ───────────────────────────────────────────
// ?periodoId= ?avaliadoId= ?estado= ?departamentoId= ?page= ?limit=
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

  // ── Filtro base por avaliado ──────────────────────────────
  // Técnico só vê as próprias fichas
  const avaliadoFiltro =
    payload.role === 'Tecnico' ? payload.sub : (avaliadoId ?? undefined)

  // ── Director: filtrar pela sua Direção ────────────────────
  // O Director vê fichas de todos os utilizadores da sua Direção
  // (inclui Técnicos e Chefes de Departamento da direção dele)
  let direcaoFiltro: string | undefined = undefined
  if (payload.role === 'Director') {
    const director = await prisma.utilizador.findUnique({
      where: { id: payload.sub },
      select: { direcaoId: true },
    })
    if (director?.direcaoId) {
      direcaoFiltro = director.direcaoId
    }
  }

  // ── Chefe de Departamento: filtrar pelo seu departamento ──
  let chefeDeptFiltro: string | undefined = undefined
  if (payload.role === 'ChefeDepartamento') {
    const chefe = await prisma.utilizador.findUnique({
      where: { id: payload.sub },
      select: { departamentoId: true },
    })
    if (chefe?.departamentoId) {
      chefeDeptFiltro = chefe.departamentoId
    }
  }

  const where = {
    // Filtro por avaliado específico (ou próprio utilizador se Técnico)
    ...(avaliadoFiltro && { avaliadoId: avaliadoFiltro }),

    // Filtro por período
    ...(periodoId && { periodoId }),

    // Filtro por estado
    ...(estado && { estado: estado as any }),

    // Filtro por departamento (passado via query param, ou do Chefe)
    ...((departamentoId || chefeDeptFiltro) && {
      avaliado: {
        departamentoId: departamentoId ?? chefeDeptFiltro,
      },
    }),

    // Filtro por direção (Director vê toda a sua direção)
    ...(direcaoFiltro &&
      !avaliadoFiltro && {
        avaliado: {
          direcaoId: direcaoFiltro,
          // Aplicar departamentoId se passado via query param
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
          select: { id: true, nome: true, dataInicio: true, dataFim: true },
        },
        _count: { select: { submissoes: true } },
        validacao: { select: { aprovado: true, dataValidacao: true } },
        reavaliacao: { select: { concluida: true, reavaliadorId: true } },
      },
    }),
  ])

  return NextResponse.json({
    data: fichas,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  })
}

// ── POST /api/fichas ──────────────────────────────────────────
// Apenas Master cria fichas (no início do período)
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
    if (!['Tecnico', 'ChefeDepartamento', 'Director'].includes(avaliado.role)) {
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
        { error: 'Já existe uma ficha para este técnico neste período.' },
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
