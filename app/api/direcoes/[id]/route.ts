// app/api/direcoes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/permissions'

type Params = { params: Promise<{ id: string }> }

// ── GET /api/direcoes/[id] ────────────────────────────────────
export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, ['Master', 'Director', 'ChefeDepartamento'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const direcao = await prisma.direcao.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      descricao: true,
      dataCriacao: true,
      updatedAt: true,
      pelouro: { select: { id: true, nome: true } },
      departamentos: {
        select: { id: true, nome: true },
        orderBy: { nome: 'asc' },
      },
      _count: { select: { departamentos: true, utilizadores: true } },
    },
  })

  if (!direcao) {
    return NextResponse.json(
      { error: 'Direção não encontrada.' },
      { status: 404 },
    )
  }

  return NextResponse.json(direcao)
}

// ── PATCH /api/direcoes/[id] ──────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, ['Master'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const direcao = await prisma.direcao.findUnique({ where: { id } })
  if (!direcao) {
    return NextResponse.json(
      { error: 'Direção não encontrada.' },
      { status: 404 },
    )
  }

  try {
    const { nome, descricao, pelouroId } = await req.json()

    if (nome && nome !== direcao.nome) {
      const existe = await prisma.direcao.findUnique({ where: { nome } })
      if (existe) {
        return NextResponse.json(
          { error: 'Já existe uma direção com este nome.' },
          { status: 409 },
        )
      }
    }

    if (pelouroId) {
      const pelouro = await prisma.pelouro.findUnique({
        where: { id: pelouroId },
      })
      if (!pelouro) {
        return NextResponse.json(
          { error: 'Pelouro não encontrado.' },
          { status: 404 },
        )
      }
    }

    const updated = await prisma.direcao.update({
      where: { id },
      data: {
        ...(nome !== undefined && { nome: nome.trim() }),
        ...(descricao !== undefined && {
          descricao: descricao?.trim() || null,
        }),
        ...(pelouroId !== undefined && { pelouroId }),
      },
      select: {
        id: true,
        nome: true,
        descricao: true,
        updatedAt: true,
        pelouro: { select: { id: true, nome: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[DIRECOES_PATCH]', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 },
    )
  }
}

// ── DELETE /api/direcoes/[id] ─────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, ['Master'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const direcao = await prisma.direcao.findUnique({
    where: { id },
    include: {
      _count: { select: { departamentos: true, utilizadores: true } },
    },
  })

  if (!direcao) {
    return NextResponse.json(
      { error: 'Direção não encontrada.' },
      { status: 404 },
    )
  }

  if (direcao._count.departamentos > 0) {
    return NextResponse.json(
      {
        error: `Não é possível eliminar: existem ${direcao._count.departamentos} departamento(s) associados.`,
      },
      { status: 400 },
    )
  }

  await prisma.direcao.delete({ where: { id } })

  return NextResponse.json({ message: 'Direção eliminada com sucesso.' })
}
