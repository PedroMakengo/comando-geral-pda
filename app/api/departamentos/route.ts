// app/api/departamentos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/permissions'
import { sendChefeDepartamentoEmail } from '@/lib/mailer'

// ── GET /api/departamentos ────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ['Master', 'Director', 'ChefeDepartamento'])
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const direcaoId = searchParams.get('direcaoId') ?? undefined
  const search = searchParams.get('search') ?? undefined
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(100, Number(searchParams.get('limit') ?? 20))
  const skip = (page - 1) * limit

  const where = {
    ...(direcaoId && { direcaoId }),
    ...(search && { nome: { contains: search } }),
  }

  const [total, departamentos] = await Promise.all([
    prisma.departamento.count({ where }),
    prisma.departamento.findMany({
      where,
      skip,
      take: limit,
      orderBy: { dataCriacao: 'desc' },
      select: {
        id: true,
        nome: true,
        dataCriacao: true,
        updatedAt: true,
        direcaoId: true,
        direcao: { select: { id: true, nome: true } },
        chefe: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
            cargo: true,
            avatarUrl: true,
          },
        },
        _count: { select: { utilizadores: true, criterios: true } },
      },
    }),
  ])

  return NextResponse.json({
    data: departamentos,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  })
}

// ── POST /api/departamentos ───────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ['Master'])
  if (auth instanceof NextResponse) return auth

  try {
    const { nome, direcaoId, chefeId } = await req.json()

    if (!nome || !direcaoId) {
      return NextResponse.json(
        { error: 'Nome e direção são obrigatórios.' },
        { status: 400 },
      )
    }

    const direcao = await prisma.direcao.findUnique({
      where: { id: direcaoId },
    })
    if (!direcao) {
      return NextResponse.json(
        { error: 'Direção não encontrada.' },
        { status: 404 },
      )
    }

    // ── Validar chefe ────────────────────────────────────────
    let chefe = null
    if (chefeId) {
      chefe = await prisma.utilizador.findUnique({ where: { id: chefeId } })
      if (!chefe) {
        return NextResponse.json(
          { error: 'Utilizador indicado como chefe não encontrado.' },
          { status: 404 },
        )
      }

      // Verificar se já é chefe de outro departamento
      const jaEChefe = await prisma.departamento.findFirst({
        where: { chefeId },
      })
      if (jaEChefe) {
        return NextResponse.json(
          {
            error: `Este utilizador já é chefe do departamento "${jaEChefe.nome}".`,
          },
          { status: 409 },
        )
      }
    }

    // ── Criar departamento + sincronizar utilizador numa transacção ──
    const departamento = await prisma.$transaction(async (tx) => {
      const dept = await tx.departamento.create({
        data: {
          nome,
          direcaoId,
          chefeId: chefeId || null,
        },
        select: {
          id: true,
          nome: true,
          dataCriacao: true,
          direcao: { select: { id: true, nome: true } },
          chefe: {
            select: { id: true, nomeCompleto: true, email: true, cargo: true },
          },
        },
      })

      // Actualizar role e departamento do chefe automaticamente
      if (chefeId) {
        await tx.utilizador.update({
          where: { id: chefeId },
          data: {
            role: 'ChefeDepartamento',
            departamentoId: dept.id,
            direcaoId,
          },
        })
      }

      return dept
    })

    // Enviar email ao chefe
    if (chefe) {
      await sendChefeDepartamentoEmail({
        nome: chefe.nomeCompleto,
        email: chefe.email,
        departamentoNome: nome,
        direcaoNome: direcao.nome,
      })
    }

    return NextResponse.json(departamento, { status: 201 })
  } catch (error) {
    console.error('[DEPARTAMENTOS_POST]', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 },
    )
  }
}
