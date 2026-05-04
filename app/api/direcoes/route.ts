// app/api/direcoes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/permissions'

// ── GET /api/direcoes ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ['Master', 'Director', 'ChefeDepartamento'])
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const search = searchParams.get('search') ?? undefined
  const pelouroId = searchParams.get('pelouroId') ?? undefined

  const direcoes = await prisma.direcao.findMany({
    where: {
      ...(pelouroId && { pelouroId }),
      ...(search && {
        OR: [
          { nome: { contains: search } },
          { descricao: { contains: search } },
        ],
      }),
    },
    orderBy: { nome: 'asc' },
    select: {
      id: true,
      nome: true,
      descricao: true,
      dataCriacao: true,
      updatedAt: true,
      pelouroId: true,
      pelouro: { select: { id: true, nome: true } },
      _count: { select: { departamentos: true, utilizadores: true } },
    },
  })

  return NextResponse.json(direcoes)
}

// ── POST /api/direcoes ────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ['Master'])
  if (auth instanceof NextResponse) return auth

  try {
    const { nome, descricao, pelouroId } = await req.json()

    if (!nome?.trim() || !pelouroId) {
      return NextResponse.json(
        { error: 'Nome e pelouro são obrigatórios.' },
        { status: 400 },
      )
    }

    const pelouro = await prisma.pelouro.findUnique({
      where: { id: pelouroId },
    })
    if (!pelouro) {
      return NextResponse.json(
        { error: 'Pelouro não encontrado.' },
        { status: 404 },
      )
    }

    const existe = await prisma.direcao.findUnique({ where: { nome } })
    if (existe) {
      return NextResponse.json(
        { error: 'Já existe uma direção com este nome.' },
        { status: 409 },
      )
    }

    const direcao = await prisma.direcao.create({
      data: {
        nome: nome.trim(),
        descricao: descricao?.trim() || null,
        pelouroId,
      },
      select: {
        id: true,
        nome: true,
        descricao: true,
        dataCriacao: true,
        pelouro: { select: { id: true, nome: true } },
      },
    })

    return NextResponse.json(direcao, { status: 201 })
  } catch (error) {
    console.error('[DIRECOES_POST]', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 },
    )
  }
}
