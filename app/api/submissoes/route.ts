// app/api/submissoes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, getPayloadFromRequest } from '@/lib/permissions'

// ── GET /api/submissoes ───────────────────────────────────────
// ?fichaId=  ?tipo=  ?avaliadorId=
export async function GET(req: NextRequest) {
  const auth = requireRole(req, [
    'Master',
    'Director',
    'ChefeDepartamento',
    'Tecnico',
  ])
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const fichaId = searchParams.get('fichaId') ?? undefined
  const tipo = searchParams.get('tipo') ?? undefined
  const avaliadorId = searchParams.get('avaliadorId') ?? undefined

  const submissoes = await prisma.submissaoAvaliacao.findMany({
    where: {
      ...(fichaId && { fichaId }),
      ...(tipo && { tipo: tipo as any }),
      ...(avaliadorId && { avaliadorId }),
    },
    orderBy: { dataSubmissao: 'desc' },
    select: {
      id: true,
      tipo: true,
      comentarios: true,
      pontuacaoTotal: true,
      dataSubmissao: true,
      avaliador: { select: { id: true, nomeCompleto: true, role: true } },
      ficha: {
        select: {
          id: true,
          estado: true,
          avaliado: { select: { id: true, nomeCompleto: true } },
        },
      },
      respostas: {
        select: {
          id: true,
          pontuacao: true,
          observacao: true,
          criterio: { select: { id: true, nome: true, peso: true } },
        },
      },
    },
  })

  return NextResponse.json(submissoes)
}

// ── POST /api/submissoes ──────────────────────────────────────
// Cria submissão + respostas aos critérios + actualiza estado da ficha
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ['Director', 'ChefeDepartamento', 'Tecnico'])
  if (auth instanceof NextResponse) return auth

  const payload = getPayloadFromRequest(req)!

  try {
    const { fichaId, tipo, comentarios, respostas } = await req.json()

    // respostas: [{ criterioId, pontuacao, observacao? }]
    if (
      !fichaId ||
      !tipo ||
      !Array.isArray(respostas) ||
      respostas.length === 0
    ) {
      return NextResponse.json(
        { error: 'fichaId, tipo e respostas são obrigatórios.' },
        { status: 400 },
      )
    }

    const tiposValidos = ['AutoAvaliacao', 'AvaliacaoChefe', 'Reavaliacao']
    if (!tiposValidos.includes(tipo)) {
      return NextResponse.json(
        { error: `Tipo inválido. Use: ${tiposValidos.join(', ')}.` },
        { status: 400 },
      )
    }

    // Verificar ficha
    const ficha = await prisma.fichaAvaliacao.findUnique({
      where: { id: fichaId },
      include: {
        reavaliacao: true,
        submissoes: { select: { tipo: true } },
      },
    })

    if (!ficha) {
      return NextResponse.json(
        { error: 'Ficha não encontrada.' },
        { status: 404 },
      )
    }

    // Verificar permissão por tipo
    if (tipo === 'AutoAvaliacao' && payload.sub !== ficha.avaliadoId) {
      return NextResponse.json(
        { error: 'Só o próprio técnico pode submeter a auto-avaliação.' },
        { status: 403 },
      )
    }

    if (tipo === 'Reavaliacao') {
      const indicacao = ficha.reavaliacao
      if (!indicacao || indicacao.reavaliadorId !== payload.sub) {
        return NextResponse.json(
          { error: 'Não tem permissão para reavaliar esta ficha.' },
          { status: 403 },
        )
      }
    }

    // Verificar se já existe submissão do mesmo tipo
    const jaExiste = ficha.submissoes.some((s) => s.tipo === tipo)
    if (jaExiste) {
      return NextResponse.json(
        { error: `Já existe uma submissão do tipo "${tipo}" para esta ficha.` },
        { status: 409 },
      )
    }

    // Validar pontuações (1–5)
    for (const r of respostas) {
      if (!r.criterioId || typeof r.pontuacao !== 'number') {
        return NextResponse.json(
          { error: 'Cada resposta deve ter criterioId e pontuacao.' },
          { status: 400 },
        )
      }
      if (r.pontuacao < 1 || r.pontuacao > 5) {
        return NextResponse.json(
          { error: 'A pontuação deve estar entre 1 e 5.' },
          { status: 400 },
        )
      }
    }

    // Calcular pontuação total ponderada
    const criterios = await prisma.criterio.findMany({
      where: { id: { in: respostas.map((r: any) => r.criterioId) } },
      select: { id: true, peso: true },
    })

    const pesosMap = Object.fromEntries(criterios.map((c) => [c.id, c.peso]))
    const totalPeso = criterios.reduce((acc, c) => acc + c.peso, 0)
    const pontuacaoTotal =
      totalPeso > 0
        ? respostas.reduce((acc: number, r: any) => {
            const peso = pesosMap[r.criterioId] ?? 1
            return acc + r.pontuacao * peso
          }, 0) / totalPeso
        : null

    // Estado da ficha após submissão
    const estadoMap: Record<string, string> = {
      AutoAvaliacao: 'AutoAvaliacao',
      AvaliacaoChefe: 'AvaliadoPorChefe',
      Reavaliacao: 'Reavaliado',
    }

    // Criar submissão + respostas numa transacção
    const submissao = await prisma.$transaction(async (tx) => {
      const sub = await tx.submissaoAvaliacao.create({
        data: {
          fichaId,
          avaliadorId: payload.sub,
          tipo,
          comentarios: comentarios?.trim() || null,
          pontuacaoTotal: pontuacaoTotal
            ? Math.round(pontuacaoTotal * 100) / 100
            : null,
          respostas: {
            create: respostas.map((r: any) => ({
              criterioId: r.criterioId,
              pontuacao: r.pontuacao,
              observacao: r.observacao?.trim() || null,
            })),
          },
        },
        include: {
          respostas: {
            include: {
              criterio: { select: { id: true, nome: true, peso: true } },
            },
          },
        },
      })

      // Actualizar estado da ficha
      await tx.fichaAvaliacao.update({
        where: { id: fichaId },
        data: { estado: estadoMap[tipo] as any },
      })

      // Se reavaliação concluída, marcar indicação como concluída
      if (tipo === 'Reavaliacao' && ficha.reavaliacao) {
        await tx.reavaliacaoIndicada.update({
          where: { id: ficha.reavaliacao.id },
          data: { concluida: true },
        })
      }

      return sub
    })

    return NextResponse.json(submissao, { status: 201 })
  } catch (error) {
    console.error('[SUBMISSOES_POST]', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 },
    )
  }
}
