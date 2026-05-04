// app/api/utilizadores/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { requireRole } from '@/lib/permissions'
import { sendWelcomeEmail } from '@/lib/mailer'

function gerarSenha(tamanho = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!'
  return Array.from(
    { length: tamanho },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join('')
}

// ── GET /api/utilizadores ─────────────────────────────────────
// Suporta: ?role=&departamentoId=&estado=&search=&page=&limit=
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ['Master', 'Director', 'ChefeDepartamento'])
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const role = searchParams.get('role') ?? undefined
  const departamentoId = searchParams.get('departamentoId') ?? undefined
  const estado = searchParams.get('estado') ?? undefined
  const search = searchParams.get('search') ?? undefined
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(100, Number(searchParams.get('limit') ?? 20))
  const skip = (page - 1) * limit

  const where = {
    ...(role && { role: role as any }),
    ...(departamentoId && { departamentoId }),
    ...(estado && { estado: estado as any }),
    ...(search && {
      OR: [
        { nomeCompleto: { contains: search } },
        { email: { contains: search } },
        { numeroMecanografico: { contains: search } },
        { cargo: { contains: search } },
      ],
    }),
  }

  const [total, utilizadores] = await Promise.all([
    prisma.utilizador.count({ where }),
    prisma.utilizador.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nomeCompleto: true,
        email: true,
        numeroMecanografico: true,
        cargo: true,
        avatarUrl: true,
        role: true,
        estado: true,
        dataAdmissao: true,
        createdAt: true,
        pelouro: { select: { id: true, nome: true } },
        direcao: { select: { id: true, nome: true } },
        departamento: { select: { id: true, nome: true } },
      },
    }),
  ])

  return NextResponse.json({
    data: utilizadores,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  })
}

// ── POST /api/utilizadores ────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ['Master'])
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const {
      nomeCompleto,
      email,
      numeroMecanografico,
      cargo,
      role,
      pelouroId,
      direcaoId,
      departamentoId,
    } = body

    // Validações
    if (!nomeCompleto || !email || !numeroMecanografico || !cargo || !role) {
      return NextResponse.json(
        { error: 'Campos obrigatórios em falta.' },
        { status: 400 },
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
    }

    // Verificar duplicados
    const existe = await prisma.utilizador.findFirst({
      where: { OR: [{ email }, { numeroMecanografico }] },
    })
    if (existe) {
      const campo = existe.email === email ? 'email' : 'número mecanográfico'
      return NextResponse.json(
        { error: `Este ${campo} já está em uso.` },
        { status: 409 },
      )
    }

    // Gerar senha e hash
    const senhaGerada = gerarSenha(8)
    const passwordHash = await hashPassword(senhaGerada)

    const utilizador = await prisma.utilizador.create({
      data: {
        nomeCompleto,
        email,
        numeroMecanografico,
        cargo,
        role,
        passwordHash,
        avatarUrl: '',
        estado: 'Activo',
        pelouroId: pelouroId || null,
        direcaoId: direcaoId || null,
        departamentoId: departamentoId || null,
      },
      select: {
        id: true,
        nomeCompleto: true,
        email: true,
        numeroMecanografico: true,
        cargo: true,
        role: true,
        estado: true,
        createdAt: true,
      },
    })

    // Enviar email com credenciais
    await sendWelcomeEmail({
      nome: nomeCompleto,
      email,
      numeroMecanografico,
      password: senhaGerada,
      role,
    })

    return NextResponse.json(utilizador, { status: 201 })
  } catch (error) {
    console.error('[UTILIZADORES_POST]', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 },
    )
  }
}
