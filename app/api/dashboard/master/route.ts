// app/api/dashboard/master/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ['Master'])
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const periodoIdParam = searchParams.get('periodoId') ?? undefined

  // ── Período ───────────────────────────────────────────────
  const periodo = periodoIdParam
    ? await prisma.periodoAvaliacao.findUnique({
        where: { id: periodoIdParam },
        select: {
          id: true,
          nome: true,
          dataInicio: true,
          dataFim: true,
          activo: true,
        },
      })
    : await prisma.periodoAvaliacao.findFirst({
        where: { activo: true },
        select: {
          id: true,
          nome: true,
          dataInicio: true,
          dataFim: true,
          activo: true,
        },
      })

  // Todos os períodos para o selector
  const todosOsPeriodos = await prisma.periodoAvaliacao.findMany({
    orderBy: { dataInicio: 'desc' },
    select: { id: true, nome: true, activo: true },
  })

  // Total de funcionários activos (excluindo Masters)
  const totalFuncionarios = await prisma.utilizador.count({
    where: { estado: 'Activo', role: { not: 'Master' } },
  })

  if (!periodo) {
    return NextResponse.json({
      periodo: null,
      todosOsPeriodos,
      totalFuncionarios,
      fichasConcluidas: 0,
      fichasPendentes: 0,
      semFicha: [],
      avaliacoesPorEstado: [],
      porDepartamento: [],
      porDirecao: [],
      distribuicaoPontuacao: { maxima: 0, media: 0, minima: 0 },
      alertasNegativos: [],
      progresso: 0,
    })
  }

  // ── Fichas do período com pontuação e dados do avaliado ───
  const fichas = await prisma.fichaAvaliacao.findMany({
    where: { periodoId: periodo.id },
    select: {
      id: true,
      estado: true,
      pontuacaoFinal: true,
      avaliado: {
        select: {
          id: true,
          nomeCompleto: true,
          numeroMecanografico: true,
          avatarUrl: true,
          departamento: { select: { id: true, nome: true } },
          direcao: { select: { id: true, nome: true } },
        },
      },
    },
  })

  // ── Funcionários sem ficha ────────────────────────────────
  const comFicha = new Set(fichas.map((f) => f.avaliado.id))
  const semFicha = await prisma.utilizador.findMany({
    where: {
      id: { notIn: [...comFicha] },
      estado: 'Activo',
      role: { not: 'Master' },
    },
    select: {
      id: true,
      nomeCompleto: true,
      numeroMecanografico: true,
      avatarUrl: true,
      departamento: { select: { id: true, nome: true } },
    },
    take: 20,
  })

  // ── Métricas base ─────────────────────────────────────────
  const fichasConcluidas = fichas.filter(
    (f) => f.estado === 'ValidadoPorDirector',
  ).length
  const fichasPendentes = fichas.filter(
    (f) => f.estado !== 'ValidadoPorDirector',
  ).length

  // ── Por estado ────────────────────────────────────────────
  const estadoFillMap: Record<string, string> = {
    Pendente: '#6b7280',
    AvaliadoPorChefe: '#8b5cf6',
    ValidadoPorDirector: '#10b981',
  }
  const estadoCount: Record<string, number> = {}
  fichas.forEach((f) => {
    estadoCount[f.estado] = (estadoCount[f.estado] ?? 0) + 1
  })
  const avaliacoesPorEstado = Object.entries(estadoCount).map(
    ([estado, total]) => ({
      estado,
      total,
      fill: estadoFillMap[estado] ?? '#6b7280',
    }),
  )

  // ── Por departamento ──────────────────────────────────────
  const deptMap: Record<
    string,
    { total: number; concluidas: number; pontuacoes: number[] }
  > = {}
  fichas.forEach((f) => {
    const dept = f.avaliado.departamento?.nome ?? 'Sem dept.'
    if (!deptMap[dept])
      deptMap[dept] = { total: 0, concluidas: 0, pontuacoes: [] }
    deptMap[dept].total++
    if (f.estado === 'ValidadoPorDirector') {
      deptMap[dept].concluidas++
      if (f.pontuacaoFinal != null)
        deptMap[dept].pontuacoes.push(f.pontuacaoFinal)
    }
  })
  const porDepartamento = Object.entries(deptMap)
    .map(([departamento, v]) => ({
      departamento,
      total: v.total,
      concluidas: v.concluidas,
      mediaPontuacao:
        v.pontuacoes.length > 0
          ? Math.round(
              (v.pontuacoes.reduce((a, b) => a + b, 0) / v.pontuacoes.length) *
                100,
            ) / 100
          : null,
    }))
    .sort((a, b) => b.total - a.total)

  // ── Por direcao ───────────────────────────────────────────
  const direcaoMap: Record<
    string,
    { total: number; concluidas: number; pontuacoes: number[] }
  > = {}
  fichas.forEach((f) => {
    const dir = f.avaliado.direcao?.nome ?? 'Sem direcção'
    if (!direcaoMap[dir])
      direcaoMap[dir] = { total: 0, concluidas: 0, pontuacoes: [] }
    direcaoMap[dir].total++
    if (f.estado === 'ValidadoPorDirector') {
      direcaoMap[dir].concluidas++
      if (f.pontuacaoFinal != null)
        direcaoMap[dir].pontuacoes.push(f.pontuacaoFinal)
    }
  })
  const porDirecao = Object.entries(direcaoMap)
    .map(([direcao, v]) => ({
      direcao,
      total: v.total,
      concluidas: v.concluidas,
      mediaPontuacao:
        v.pontuacoes.length > 0
          ? Math.round(
              (v.pontuacoes.reduce((a, b) => a + b, 0) / v.pontuacoes.length) *
                100,
            ) / 100
          : null,
    }))
    .sort((a, b) => b.total - a.total)

  // ── Distribuição de pontuação (só fichas validadas com nota) ─
  const fichasValidadas = fichas.filter(
    (f) => f.estado === 'ValidadoPorDirector' && f.pontuacaoFinal != null,
  )
  const pontuacoes = fichasValidadas.map((f) => f.pontuacaoFinal as number)

  // Positivo ≥ 3.0, Negativo < 3.0
  const positivas = pontuacoes.filter((p) => p >= 3.0).length
  const negativas = pontuacoes.filter((p) => p < 3.0).length
  const maxima = pontuacoes.length > 0 ? Math.max(...pontuacoes) : 0
  const minima = pontuacoes.length > 0 ? Math.min(...pontuacoes) : 0
  const media =
    pontuacoes.length > 0
      ? Math.round(
          (pontuacoes.reduce((a, b) => a + b, 0) / pontuacoes.length) * 100,
        ) / 100
      : 0

  // Bandas de pontuação: Excelente ≥4.5 | Bom 3.5–4.5 | Suficiente 2.5–3.5 | Fraco <2.5
  const bandas = [
    {
      banda: 'Excelente (≥4.5)',
      count: pontuacoes.filter((p) => p >= 4.5).length,
      fill: '#10b981',
    },
    {
      banda: 'Bom (3.5–4.4)',
      count: pontuacoes.filter((p) => p >= 3.5 && p < 4.5).length,
      fill: '#6366f1',
    },
    {
      banda: 'Suficiente (2.5–3.4)',
      count: pontuacoes.filter((p) => p >= 2.5 && p < 3.5).length,
      fill: '#f59e0b',
    },
    {
      banda: 'Fraco (<2.5)',
      count: pontuacoes.filter((p) => p < 2.5).length,
      fill: '#ef4444',
    },
  ].filter((b) => b.count > 0)

  // Top performers e bottom performers
  const fichasComNota = fichasValidadas
    .filter((f) => f.pontuacaoFinal != null)
    .sort((a, b) => (b.pontuacaoFinal ?? 0) - (a.pontuacaoFinal ?? 0))

  const topPerformers = fichasComNota.slice(0, 5).map((f) => ({
    id: f.avaliado.id,
    nomeCompleto: f.avaliado.nomeCompleto,
    numeroMecanografico: f.avaliado.numeroMecanografico,
    avatarUrl: f.avaliado.avatarUrl,
    departamento: f.avaliado.departamento,
    pontuacao: f.pontuacaoFinal,
  }))
  const bottomPerformers = fichasComNota
    .slice(-5)
    .reverse()
    .map((f) => ({
      id: f.avaliado.id,
      nomeCompleto: f.avaliado.nomeCompleto,
      numeroMecanografico: f.avaliado.numeroMecanografico,
      avatarUrl: f.avaliado.avatarUrl,
      departamento: f.avaliado.departamento,
      pontuacao: f.pontuacaoFinal,
    }))

  // ── Alertas: funcionários com 2+ avaliações negativas ─────
  // (pontuação < 3.0 em períodos diferentes — histórico)
  const historicoNegativo = await prisma.fichaAvaliacao.groupBy({
    by: ['avaliadoId'],
    where: { estado: 'ValidadoPorDirector', pontuacaoFinal: { lt: 3.0 } },
    _count: { id: true },
    having: { id: { _count: { gte: 2 } } },
  })

  const alertasNegativos =
    historicoNegativo.length > 0
      ? await prisma.utilizador
          .findMany({
            where: { id: { in: historicoNegativo.map((h) => h.avaliadoId) } },
            select: {
              id: true,
              nomeCompleto: true,
              numeroMecanografico: true,
              avatarUrl: true,
              cargo: true,
              departamento: { select: { id: true, nome: true } },
            },
          })
          .then((users) =>
            users.map((u) => ({
              ...u,
              totalNegativas:
                historicoNegativo.find((h) => h.avaliadoId === u.id)?._count
                  .id ?? 0,
            })),
          )
      : []

  const progresso =
    totalFuncionarios > 0
      ? Math.round((fichasConcluidas / totalFuncionarios) * 100)
      : 0

  return NextResponse.json({
    periodo,
    todosOsPeriodos,
    totalFuncionarios,
    fichasConcluidas,
    fichasPendentes,
    semFicha,
    avaliacoesPorEstado,
    porDepartamento,
    porDirecao,
    distribuicaoPontuacao: {
      maxima,
      minima,
      media,
      positivas,
      negativas,
      bandas,
    },
    topPerformers,
    bottomPerformers,
    alertasNegativos,
    progresso,
  })
}
