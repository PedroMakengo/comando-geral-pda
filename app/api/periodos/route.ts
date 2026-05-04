// app/api/periodos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/permissions'

// ── Função auxiliar: cria fichas para todos os avaliáveis ─────
// Chamada automaticamente sempre que um período é activado.
// Cria fichas (estado Pendente) para todos os utilizadores activos
// com role Tecnico ou ChefeDepartamento que ainda não têm ficha.
async function criarFichasParaPeriodo(
  periodoId: string,
): Promise<{ criadas: number }> {
  const avalaveis = await prisma.utilizador.findMany({
    where: {
      estado: 'Activo',
      role: { in: ['Tecnico', 'ChefeDepartamento', 'Director'] },
    },
    select: { id: true },
  })

  if (avalaveis.length === 0) return { criadas: 0 }

  // Verifica quais já têm ficha neste período (evita duplicados)
  const existentes = await prisma.fichaAvaliacao.findMany({
    where: { periodoId },
    select: { avaliadoId: true },
  })

  const idsComFicha = new Set(existentes.map((f) => f.avaliadoId))
  const semFicha = avalaveis.filter((u) => !idsComFicha.has(u.id))

  if (semFicha.length === 0) return { criadas: 0 }

  await prisma.fichaAvaliacao.createMany({
    data: semFicha.map((u) => ({
      avaliadoId: u.id,
      periodoId,
      estado: 'Pendente',
    })),
    skipDuplicates: true,
  })

  return { criadas: semFicha.length }
}

// ── GET /api/periodos ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = requireRole(req, [
    'Master',
    'Director',
    'ChefeDepartamento',
    'Tecnico',
  ])
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const apenasActivo = searchParams.get('activo') === 'true'

  const periodos = await prisma.periodoAvaliacao.findMany({
    where: apenasActivo ? { activo: true } : undefined,
    orderBy: { dataInicio: 'desc' },
    select: {
      id: true,
      nome: true,
      dataInicio: true,
      dataFim: true,
      activo: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { fichas: true } },
    },
  })

  return NextResponse.json(periodos)
}

// ── POST /api/periodos ────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ['Master'])
  if (auth instanceof NextResponse) return auth

  try {
    const { nome, dataInicio, dataFim, activo } = await req.json()

    if (!nome?.trim() || !dataInicio || !dataFim) {
      return NextResponse.json(
        { error: 'Nome, data de início e data de fim são obrigatórios.' },
        { status: 400 },
      )
    }

    const inicio = new Date(dataInicio)
    const fim = new Date(dataFim)

    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
      return NextResponse.json({ error: 'Datas inválidas.' }, { status: 400 })
    }
    if (fim <= inicio) {
      return NextResponse.json(
        { error: 'A data de fim deve ser posterior à data de início.' },
        { status: 400 },
      )
    }

    // Cria o período dentro de uma transacção
    const periodo = await prisma.$transaction(async (tx) => {
      // Desactiva períodos anteriores se este for activado
      if (activo) {
        await tx.periodoAvaliacao.updateMany({
          where: { activo: true },
          data: { activo: false },
        })
      }
      return tx.periodoAvaliacao.create({
        data: {
          nome: nome.trim(),
          dataInicio: inicio,
          dataFim: fim,
          activo: activo ?? false,
        },
      })
    })

    // Se o período foi activado, cria fichas automaticamente
    let fichasCriadas = 0
    if (activo) {
      const resultado = await criarFichasParaPeriodo(periodo.id)
      fichasCriadas = resultado.criadas
      console.log(
        `[PERIODOS] Período activado — ${fichasCriadas} fichas criadas automaticamente`,
      )
    }

    return NextResponse.json({ ...periodo, fichasCriadas }, { status: 201 })
  } catch (error) {
    console.error('[PERIODOS_POST]', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 },
    )
  }
}
