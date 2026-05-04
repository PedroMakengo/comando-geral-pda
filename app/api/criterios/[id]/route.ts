// app/api/criterios/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/permissions'

type Params = { params: Promise<{ id: string }> }

const select = {
  id: true,
  nome: true,
  descricao: true,
  peso: true,
  createdAt: true,
  updatedAt: true,
  departamentos: {
    select: {
      departamento: { select: { id: true, nome: true } },
    },
  },
  tecnico: { select: { id: true, nomeCompleto: true, email: true } },
  _count: { select: { respostas: true } },
}

// ── GET /api/criterios/[id] ───────────────────────────────────
export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, [
    'Master',
    'Director',
    'ChefeDepartamento',
    'Tecnico',
  ])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const criterio = await prisma.criterio.findUnique({ where: { id }, select })

  if (!criterio) {
    return NextResponse.json(
      { error: 'Critério não encontrado.' },
      { status: 404 },
    )
  }

  return NextResponse.json(criterio)
}

// ── PATCH /api/criterios/[id] ─────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, ['Master', 'Director'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const criterio = await prisma.criterio.findUnique({ where: { id } })
  if (!criterio) {
    return NextResponse.json(
      { error: 'Critério não encontrado.' },
      { status: 404 },
    )
  }

  try {
    const { nome, descricao, peso, departamentoIds, tecnicoId } =
      await req.json()

    if (peso !== undefined && (typeof peso !== 'number' || peso <= 0)) {
      return NextResponse.json(
        { error: 'O peso deve ser um número positivo.' },
        { status: 400 },
      )
    }

    const temDepartamentos =
      departamentoIds !== undefined &&
      Array.isArray(departamentoIds) &&
      departamentoIds.length > 0

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

    if (tecnicoId) {
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

    const updated = await prisma.criterio.update({
      where: { id },
      data: {
        ...(nome !== undefined && { nome: nome.trim() }),
        ...(descricao !== undefined && {
          descricao: descricao?.trim() || null,
        }),
        ...(peso !== undefined && { peso }),
        ...(tecnicoId !== undefined && { tecnicoId: tecnicoId || null }),
        // substitui todos os departamentos: apaga os antigos e cria os novos
        ...(departamentoIds !== undefined && {
          departamentos: {
            deleteMany: {},
            ...(temDepartamentos && {
              create: departamentoIds.map((dId: string) => ({
                departamento: { connect: { id: dId } },
              })),
            }),
          },
        }),
      },
      select,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[CRITERIOS_PATCH]', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 },
    )
  }
}

// ── DELETE /api/criterios/[id] ────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, ['Master', 'Director'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const criterio = await prisma.criterio.findUnique({
    where: { id },
    include: { _count: { select: { respostas: true } } },
  })

  if (!criterio) {
    return NextResponse.json(
      { error: 'Critério não encontrado.' },
      { status: 404 },
    )
  }

  if (criterio._count.respostas > 0) {
    return NextResponse.json(
      {
        error: `Não é possível eliminar: existem ${criterio._count.respostas} resposta(s) associadas a este critério.`,
      },
      { status: 400 },
    )
  }

  // a tabela pivot (CriterioDepartamento) deve ter onDelete: Cascade no schema
  await prisma.criterio.delete({ where: { id } })

  return NextResponse.json({ message: 'Critério eliminado com sucesso.' })
}
