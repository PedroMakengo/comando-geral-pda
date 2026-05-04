// app/api/logs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/permissions'
import { generateLogsFromData } from '@/lib/generateLogs'

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ['Master'])
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl

  const page = Math.max(1, Number(searchParams.get('page') ?? 1))
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get('limit') ?? 20)),
  )
  const search = searchParams.get('search') ?? ''
  const categoria = searchParams.get('categoria') ?? ''
  const nivel = searchParams.get('nivel') ?? ''
  const accao = searchParams.get('accao') ?? ''
  const entityType = searchParams.get('entityType') ?? ''
  const dataInicio = searchParams.get('dataInicio')
  const dataFim = searchParams.get('dataFim')

  // Gerar logs a partir dos dados reais
  let logs = await generateLogsFromData({
    startDate: dataInicio ? new Date(dataInicio) : undefined,
    endDate: dataFim ? new Date(dataFim) : undefined,
    entityType: entityType || undefined,
  })

  // Filtros em memória
  if (search) {
    const s = search.toLowerCase()
    logs = logs.filter(
      (l) =>
        l.descricao.toLowerCase().includes(s) ||
        l.accao.toLowerCase().includes(s) ||
        l.utilizador?.nomeCompleto.toLowerCase().includes(s) ||
        l.utilizador?.email.toLowerCase().includes(s),
    )
  }

  if (categoria) {
    logs = logs.filter((l) => l.categoria === categoria)
  }

  if (nivel) {
    logs = logs.filter((l) => l.nivel === nivel)
  }

  if (accao) {
    logs = logs.filter((l) => l.accao.includes(accao.toUpperCase()))
  }

  // Paginação
  const total = logs.length
  const start = (page - 1) * limit
  const paginated = logs.slice(start, start + limit)

  return NextResponse.json({
    data: paginated,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  })
}
