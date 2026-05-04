// app/api/pelouros/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/permissions'

type Params = { params: Promise<{ id: string }> }

// ── GET /api/pelouros/[id] ────────────────────────────────────
export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, ['Master', 'Director', 'ChefeDepartamento'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const pelouro = await prisma.pelouro.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      descricao: true,
      dataCriacao: true,
      updatedAt: true,
      direcoes: {
        select: { id: true, nome: true },
        orderBy: { nome: 'asc' },
      },
      _count: { select: { direcoes: true, utilizadores: true } },
    },
  })

  if (!pelouro) {
    return NextResponse.json(
      { error: 'Pelouro não encontrado.' },
      { status: 404 },
    )
  }

  return NextResponse.json(pelouro)
}

// ── PATCH /api/pelouros/[id] ──────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, ['Master'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const pelouro = await prisma.pelouro.findUnique({ where: { id } })
  if (!pelouro) {
    return NextResponse.json(
      { error: 'Pelouro não encontrado.' },
      { status: 404 },
    )
  }

  try {
    const { nome, descricao } = await req.json()

    if (nome && nome !== pelouro.nome) {
      const existe = await prisma.pelouro.findUnique({ where: { nome } })
      if (existe) {
        return NextResponse.json(
          { error: 'Já existe um pelouro com este nome.' },
          { status: 409 },
        )
      }
    }

    const updated = await prisma.pelouro.update({
      where: { id },
      data: {
        ...(nome !== undefined && { nome: nome.trim() }),
        ...(descricao !== undefined && {
          descricao: descricao?.trim() || null,
        }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PELOUROS_PATCH]', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 },
    )
  }
}

// ── DELETE /api/pelouros/[id] ─────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, ['Master'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const pelouro = await prisma.pelouro.findUnique({
    where: { id },
    include: { _count: { select: { direcoes: true, utilizadores: true } } },
  })

  if (!pelouro) {
    return NextResponse.json(
      { error: 'Pelouro não encontrado.' },
      { status: 404 },
    )
  }

  if (pelouro._count.direcoes > 0) {
    return NextResponse.json(
      {
        error: `Não é possível eliminar: existem ${pelouro._count.direcoes} direção(ões) associadas.`,
      },
      { status: 400 },
    )
  }

  await prisma.pelouro.delete({ where: { id } })

  return NextResponse.json({ message: 'Pelouro eliminado com sucesso.' })
}
