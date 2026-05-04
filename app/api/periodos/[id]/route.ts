// app/api/periodos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/permissions'

type Params = { params: Promise<{ id: string }> }

// ── Cria fichas para todos os utilizadores avaliáveis ─────────
async function criarFichasParaPeriodo(
  periodoId: string,
): Promise<{ criadas: number }> {
  const avalaveis = await prisma.utilizador.findMany({
    where: {
      estado: 'Activo',
      role: { in: ['Tecnico', 'ChefeDepartamento'] },
    },
    select: { id: true },
  })

  if (avalaveis.length === 0) return { criadas: 0 }

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

// ── GET /api/periodos/[id] ────────────────────────────────────
export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, [
    'Master',
    'Director',
    'ChefeDepartamento',
    'Tecnico',
  ])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const periodo = await prisma.periodoAvaliacao.findUnique({
    where: { id },
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

  if (!periodo) {
    return NextResponse.json(
      { error: 'Período não encontrado.' },
      { status: 404 },
    )
  }

  return NextResponse.json(periodo)
}

// ── PATCH /api/periodos/[id] ──────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, ['Master'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const periodo = await prisma.periodoAvaliacao.findUnique({ where: { id } })
  if (!periodo) {
    return NextResponse.json(
      { error: 'Período não encontrado.' },
      { status: 404 },
    )
  }

  try {
    const { nome, dataInicio, dataFim, activo, action } = await req.json()

    // ── Activar via dropdown (action: 'activar') ──────────────
    if (action === 'activar') {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.periodoAvaliacao.updateMany({
          where: { activo: true, id: { not: id } },
          data: { activo: false },
        })
        return tx.periodoAvaliacao.update({
          where: { id },
          data: { activo: true },
        })
      })

      // Cria fichas automaticamente para todos os avaliáveis
      const { criadas } = await criarFichasParaPeriodo(id)
      console.log(
        `[PERIODOS] Activado "${updated.nome}" — ${criadas} fichas criadas`,
      )

      return NextResponse.json({ ...updated, fichasCriadas: criadas })
    }

    // ── Desactivar via dropdown (action: 'desactivar') ────────
    if (action === 'desactivar') {
      const updated = await prisma.periodoAvaliacao.update({
        where: { id },
        data: { activo: false },
      })
      return NextResponse.json(updated)
    }

    // ── Edição geral (nome, datas, activo via sheet) ──────────
    const inicio = dataInicio ? new Date(dataInicio) : undefined
    const fim = dataFim ? new Date(dataFim) : undefined

    if (inicio && isNaN(inicio.getTime())) {
      return NextResponse.json(
        { error: 'Data de início inválida.' },
        { status: 400 },
      )
    }
    if (fim && isNaN(fim.getTime())) {
      return NextResponse.json(
        { error: 'Data de fim inválida.' },
        { status: 400 },
      )
    }

    const inicioFinal = inicio ?? periodo.dataInicio
    const fimFinal = fim ?? periodo.dataFim

    if (fimFinal <= inicioFinal) {
      return NextResponse.json(
        { error: 'A data de fim deve ser posterior à data de início.' },
        { status: 400 },
      )
    }

    // Se está a ser activado pela edição e ainda não estava activo
    const vaSerActivado = activo === true && !periodo.activo

    let updated
    if (vaSerActivado) {
      updated = await prisma.$transaction(async (tx) => {
        await tx.periodoAvaliacao.updateMany({
          where: { activo: true, id: { not: id } },
          data: { activo: false },
        })
        return tx.periodoAvaliacao.update({
          where: { id },
          data: {
            ...(nome !== undefined && { nome: nome.trim() }),
            ...(inicio !== undefined && { dataInicio: inicio }),
            ...(fim !== undefined && { dataFim: fim }),
            activo: true,
          },
        })
      })

      const { criadas } = await criarFichasParaPeriodo(id)
      console.log(
        `[PERIODOS] Activado via edição "${updated.nome}" — ${criadas} fichas criadas`,
      )

      return NextResponse.json({ ...updated, fichasCriadas: criadas })
    }

    // Actualização simples (sem activação)
    updated = await prisma.periodoAvaliacao.update({
      where: { id },
      data: {
        ...(nome !== undefined && { nome: nome.trim() }),
        ...(inicio !== undefined && { dataInicio: inicio }),
        ...(fim !== undefined && { dataFim: fim }),
        ...(activo !== undefined && { activo }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PERIODOS_PATCH]', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 },
    )
  }
}

// ── DELETE /api/periodos/[id] ─────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, ['Master'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const periodo = await prisma.periodoAvaliacao.findUnique({
    where: { id },
    include: { _count: { select: { fichas: true } } },
  })

  if (!periodo) {
    return NextResponse.json(
      { error: 'Período não encontrado.' },
      { status: 404 },
    )
  }

  if (periodo.activo) {
    return NextResponse.json(
      {
        error:
          'Não é possível eliminar o período activo. Desactive-o primeiro.',
      },
      { status: 400 },
    )
  }

  if (periodo._count.fichas > 0) {
    return NextResponse.json(
      {
        error: `Não é possível eliminar: existem ${periodo._count.fichas} ficha(s) associadas.`,
      },
      { status: 400 },
    )
  }

  await prisma.periodoAvaliacao.delete({ where: { id } })
  return NextResponse.json({ message: 'Período eliminado com sucesso.' })
}
