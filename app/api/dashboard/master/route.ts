import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ['Master'])
  if (auth instanceof NextResponse) return auth

  // Período activo
  const periodo = await prisma.periodoAvaliacao.findFirst({
    where: { activo: true },
    select: {
      id: true,
      nome: true,
      dataInicio: true,
      dataFim: true,
      activo: true,
    },
  })

  // Total de funcionários
  const totalFuncionarios = await prisma.utilizador.count()

  if (!periodo) {
    return NextResponse.json({
      periodo: null,
      totalFuncionarios,
      fichasConcluidas: 0,
      fichasPendentes: 0,
      semFicha: [],
      avaliacoesPorEstado: [],
      porDepartamento: [],
      progresso: 0,
    })
  }

  // Todas as fichas do período activo (só os campos necessários)
  const fichas = await prisma.fichaAvaliacao.findMany({
    where: { periodoId: periodo.id },
    select: {
      estado: true,
      avaliado: {
        select: {
          id: true,
          nomeCompleto: true,
          numeroMecanografico: true,
          avatarUrl: true,
          departamento: { select: { id: true, nome: true } },
        },
      },
    },
  })

  // Utilizadores sem ficha
  const comFicha = new Set(fichas.map((f) => f.avaliado.id))
  const semFicha = await prisma.utilizador.findMany({
    where: { id: { notIn: [...comFicha] } },
    select: {
      id: true,
      nomeCompleto: true,
      numeroMecanografico: true,
      avatarUrl: true,
      departamento: { select: { id: true, nome: true } },
    },
    take: 20, // só mostramos os primeiros 20 no dashboard
  })

  // Métricas calculadas no servidor
  const fichasConcluidas = fichas.filter(
    (f) => f.estado === 'ValidadoPorDirector',
  ).length
  const fichasPendentes = fichas.filter(
    (f) => f.estado !== 'ValidadoPorDirector',
  ).length

  // Agrupamento por estado
  const estadoCount: Record<string, number> = {}
  fichas.forEach((f) => {
    estadoCount[f.estado] = (estadoCount[f.estado] ?? 0) + 1
  })

  const estadoFillMap: Record<string, string> = {
    Pendente: '#6b7280',
    AutoAvaliacao: '#3b82f6',
    AvaliadoPorChefe: '#8b5cf6',
    EmReavaliacao: '#f59e0b',
    Reavaliado: '#06b6d4',
    ValidadoPorDirector: '#10b981',
  }
  const estadoLabelMap: Record<string, string> = {
    Pendente: 'Pendente',
    AutoAvaliacao: 'Auto-avaliação',
    AvaliadoPorChefe: 'Avaliado p/ Chefe',
    EmReavaliacao: 'Em Reavaliação',
    Reavaliado: 'Reavaliado',
    ValidadoPorDirector: 'Validado p/ Director',
  }

  const avaliacoesPorEstado = Object.entries(estadoCount).map(
    ([estado, total]) => ({
      estado: estadoLabelMap[estado] ?? estado,
      total,
      fill: estadoFillMap[estado] ?? '#6b7280',
    }),
  )

  // Agrupamento por departamento
  const deptMap: Record<string, { total: number; concluidas: number }> = {}
  fichas.forEach((f) => {
    const dept = f.avaliado.departamento?.nome ?? 'Sem dept.'
    if (!deptMap[dept]) deptMap[dept] = { total: 0, concluidas: 0 }
    deptMap[dept].total++
    if (f.estado === 'ValidadoPorDirector') deptMap[dept].concluidas++
  })
  const porDepartamento = Object.entries(deptMap).map(([departamento, v]) => ({
    departamento,
    ...v,
  }))

  const progresso =
    totalFuncionarios > 0
      ? Math.round((fichasConcluidas / totalFuncionarios) * 100)
      : 0

  return NextResponse.json({
    periodo,
    totalFuncionarios,
    fichasConcluidas,
    fichasPendentes,
    semFicha,
    avaliacoesPorEstado,
    porDepartamento,
    progresso,
  })
}
