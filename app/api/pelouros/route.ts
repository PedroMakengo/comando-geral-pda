// app/api/pelouros/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/permissions'

// ── GET /api/pelouros ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ['Master', 'Director', 'ChefeDepartamento'])
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const search = searchParams.get('search') ?? undefined

  const pelouros = await prisma.pelouro.findMany({
    where: search
      ? {
          OR: [
            { nome: { contains: search } },
            { descricao: { contains: search } },
          ],
        }
      : undefined,
    orderBy: { dataCriacao: 'desc' },
    select: {
      id: true,
      nome: true,
      descricao: true,
      dataCriacao: true,
      updatedAt: true,
      _count: {
        select: { direcoes: true, utilizadores: true },
      },
    },
  })

  return NextResponse.json(pelouros)
}

// ── POST /api/pelouros ────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ['Master'])
  if (auth instanceof NextResponse) return auth

  try {
    const { nome, descricao } = await req.json()

    if (!nome?.trim()) {
      return NextResponse.json(
        { error: 'Nome é obrigatório.' },
        { status: 400 },
      )
    }

    const existe = await prisma.pelouro.findUnique({ where: { nome } })
    if (existe) {
      return NextResponse.json(
        { error: 'Já existe um pelouro com este nome.' },
        { status: 409 },
      )
    }

    const pelouro = await prisma.pelouro.create({
      data: { nome: nome.trim(), descricao: descricao?.trim() || null },
    })

    return NextResponse.json(pelouro, { status: 201 })
  } catch (error) {
    console.error('[PELOUROS_POST]', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 },
    )
  }
}
