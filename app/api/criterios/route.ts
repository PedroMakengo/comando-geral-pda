// app/api/criterios/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/permissions'

// ── GET /api/criterios ────────────────────────────────────────
// ?departamentoId=  ?tecnicoId=  ?search=  ?page=  ?limit=
export async function GET(req: NextRequest) {
  const auth = requireRole(req, [
    'Master',
    'Director',
    'ChefeDepartamento',
    'Tecnico',
  ])
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const departamentoId = searchParams.get('departamentoId') ?? undefined
  const tecnicoId = searchParams.get('tecnicoId') ?? undefined
  const search = searchParams.get('search') ?? undefined

  const pageParam = searchParams.get('page')
  const limitParam = searchParams.get('limit')

  const paginar = pageParam !== null
  const page = Math.max(1, Number(pageParam ?? 1))
  const limit = Math.min(500, Number(limitParam ?? 15))
  const skip = (page - 1) * limit

  const where = {
    ...(departamentoId && {
      departamentos: { some: { departamentoId } },
    }),
    ...(tecnicoId && { tecnicoId }),
    ...(search && {
      OR: [{ nome: { contains: search } }, { descricao: { contains: search } }],
    }),
  }

  const select = {
    id: true,
    nome: true,
    descricao: true,
    peso: true,
    createdAt: true,
    updatedAt: true,
    // relação many-to-many com departamentos
    departamentos: {
      select: {
        departamento: { select: { id: true, nome: true } },
      },
    },
    tecnico: { select: { id: true, nomeCompleto: true, email: true } },
    _count: { select: { respostas: true } },
  }

  if (!paginar) {
    const criterios = await prisma.criterio.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select,
    })
    return NextResponse.json(criterios)
  }

  const [total, criterios] = await Promise.all([
    prisma.criterio.count({ where }),
    prisma.criterio.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select,
    }),
  ])

  return NextResponse.json({
    data: criterios,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  })
}

// ── POST /api/criterios ───────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ['Master', 'Director'])
  if (auth instanceof NextResponse) return auth

  try {
    const { nome, descricao, peso, departamentoIds, tecnicoId } =
      await req.json()

    if (!nome?.trim()) {
      return NextResponse.json(
        { error: 'Nome é obrigatório.' },
        { status: 400 },
      )
    }

    const temDepartamentos =
      Array.isArray(departamentoIds) && departamentoIds.length > 0
    const temTecnico = !!tecnicoId

    if (!temDepartamentos && !temTecnico) {
      return NextResponse.json(
        {
          error:
            'O critério deve estar associado a pelo menos um departamento ou a um técnico.',
        },
        { status: 400 },
      )
    }

    if (peso !== undefined && (typeof peso !== 'number' || peso <= 0)) {
      return NextResponse.json(
        { error: 'O peso deve ser um número positivo.' },
        { status: 400 },
      )
    }

    if (temDepartamentos) {
      const depts = await prisma.departamento.findMany({
        where: { id: { in: departamentoIds } },
        select: { id: true },
      })
      if (depts.length !== departamentoIds.length) {
        return NextResponse.json(
          { error: 'Um ou mais departamentos não foram encontrados.' },
          { status: 404 },
        )
      }
    }

    if (temTecnico) {
      const tecnico = await prisma.utilizador.findUnique({
        where: { id: tecnicoId },
      })
      if (!tecnico) {
        return NextResponse.json(
          { error: 'Técnico não encontrado.' },
          { status: 404 },
        )
      }
      if (tecnico.role !== 'Tecnico') {
        return NextResponse.json(
          { error: 'O utilizador indicado não é um Técnico.' },
          { status: 400 },
        )
      }
    }

    const criterio = await prisma.criterio.create({
      data: {
        nome: nome.trim(),
        descricao: descricao?.trim() || null,
        peso: peso ?? 1.0,
        tecnicoId: temTecnico ? tecnicoId : null,
        // cria as linhas na tabela pivot CriterioDepartamento
        ...(temDepartamentos && {
          departamentos: {
            create: departamentoIds.map((id: string) => ({
              departamento: { connect: { id } },
            })),
          },
        }),
      },
      select: {
        id: true,
        nome: true,
        descricao: true,
        peso: true,
        createdAt: true,
        departamentos: {
          select: { departamento: { select: { id: true, nome: true } } },
        },
        tecnico: { select: { id: true, nomeCompleto: true } },
      },
    })

    return NextResponse.json(criterio, { status: 201 })
  } catch (error) {
    console.error('[CRITERIOS_POST]', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 },
    )
  }
}
