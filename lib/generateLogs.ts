// lib/generateLogs.ts
// Gera logs dinamicamente a partir dos dados reais do Prisma.
// Não requer nenhuma tabela de logs — infere os eventos a partir
// dos registos existentes (createdAt, updatedAt, estado, etc.)

import { prisma } from '@/lib/prisma'

export interface LogEntry {
  id: string
  createdAt: Date
  categoria: string
  nivel: string
  accao: string
  descricao: string
  entidadeId: string
  utilizador: {
    id: string
    nomeCompleto: string
    email: string
    role: string
    avatarUrl?: string | null
  } | null
}

interface GenerateLogsOptions {
  startDate?: Date
  endDate?: Date
  entityType?: string
}

function dateFilter(startDate?: Date, endDate?: Date) {
  if (!startDate && !endDate) return undefined
  return {
    ...(startDate && { gte: startDate }),
    ...(endDate && { lte: endDate }),
  }
}

export async function generateLogsFromData(
  opts: GenerateLogsOptions = {},
): Promise<LogEntry[]> {
  const { startDate, endDate, entityType } = opts
  const df = dateFilter(startDate, endDate)
  const logs: LogEntry[] = []

  // ── Utilizadores criados ──────────────────────────────────
  if (!entityType || entityType === 'utilizadores') {
    const utilizadores = await prisma.utilizador.findMany({
      where: { createdAt: df },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nomeCompleto: true,
        email: true,
        role: true,
        cargo: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        estado: true,
        departamento: { select: { nome: true } },
      },
    })

    for (const u of utilizadores) {
      logs.push({
        id: `utilizador-criado-${u.id}`,
        createdAt: u.createdAt,
        categoria: 'Utilizador',
        nivel: 'Info',
        accao: 'UTILIZADOR_CRIADO',
        descricao: `Utilizador "${u.nomeCompleto}" (${u.role}) registado${u.departamento ? ` no departamento "${u.departamento.nome}"` : ''}.`,
        entidadeId: u.id,
        utilizador: null,
      })

      if (
        u.estado === 'Inactivo' &&
        u.updatedAt.getTime() !== u.createdAt.getTime()
      ) {
        const inRange =
          (!startDate || u.updatedAt >= startDate) &&
          (!endDate || u.updatedAt <= endDate)
        if (inRange) {
          logs.push({
            id: `utilizador-desactivado-${u.id}`,
            createdAt: u.updatedAt,
            categoria: 'Utilizador',
            nivel: 'Aviso',
            accao: 'UTILIZADOR_DESACTIVADO',
            descricao: `Utilizador "${u.nomeCompleto}" foi desactivado.`,
            entidadeId: u.id,
            utilizador: null,
          })
        }
      }
    }
  }

  // ── Departamentos criados ─────────────────────────────────
  if (!entityType || entityType === 'departamentos') {
    const departamentos = await prisma.departamento.findMany({
      where: { dataCriacao: df },
      orderBy: { dataCriacao: 'desc' },
      select: {
        id: true,
        nome: true,
        dataCriacao: true,
        direcao: { select: { nome: true } },
        chefe: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
    })

    for (const d of departamentos) {
      logs.push({
        id: `departamento-criado-${d.id}`,
        createdAt: d.dataCriacao,
        categoria: 'Organizacao',
        nivel: 'Info',
        accao: 'DEPARTAMENTO_CRIADO',
        descricao: `Departamento "${d.nome}" criado na direção "${d.direcao.nome}".`,
        entidadeId: d.id,
        utilizador: d.chefe ?? null,
      })
    }
  }

  // ── Direcções criadas ─────────────────────────────────────
  if (!entityType || entityType === 'direcoes') {
    const direcoes = await prisma.direcao.findMany({
      where: { dataCriacao: df },
      orderBy: { dataCriacao: 'desc' },
      select: {
        id: true,
        nome: true,
        dataCriacao: true,
        pelouro: { select: { nome: true } },
      },
    })

    for (const d of direcoes) {
      logs.push({
        id: `direcao-criada-${d.id}`,
        createdAt: d.dataCriacao,
        categoria: 'Organizacao',
        nivel: 'Info',
        accao: 'DIRECAO_CRIADA',
        descricao: `Direção "${d.nome}" criada no pelouro "${d.pelouro.nome}".`,
        entidadeId: d.id,
        utilizador: null,
      })
    }
  }

  // ── Pelouros criados ──────────────────────────────────────
  if (!entityType || entityType === 'pelouros') {
    const pelouros = await prisma.pelouro.findMany({
      where: { dataCriacao: df },
      orderBy: { dataCriacao: 'desc' },
      select: { id: true, nome: true, dataCriacao: true },
    })

    for (const p of pelouros) {
      logs.push({
        id: `pelouro-criado-${p.id}`,
        createdAt: p.dataCriacao,
        categoria: 'Organizacao',
        nivel: 'Info',
        accao: 'PELOURO_CRIADO',
        descricao: `Pelouro "${p.nome}" criado.`,
        entidadeId: p.id,
        utilizador: null,
      })
    }
  }

  // ── Critérios criados ─────────────────────────────────────
  if (!entityType || entityType === 'criterios') {
    const criterios = await prisma.criterio.findMany({
      where: { createdAt: df },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nome: true,
        peso: true,
        createdAt: true,
        // Pivot M:N — lista os departamentos associados
        departamentos: {
          select: {
            departamento: { select: { nome: true } },
          },
        },
        tecnico: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
    })

    for (const c of criterios) {
      let ambito: string
      if (c.tecnico) {
        ambito = `atribuído ao técnico "${c.tecnico.nomeCompleto}"`
      } else if (c.departamentos.length === 1) {
        ambito = `para o departamento "${c.departamentos[0].departamento.nome}"`
      } else if (c.departamentos.length > 1) {
        const nomes = c.departamentos.map((d) => d.departamento.nome).join(', ')
        ambito = `para os departamentos "${nomes}"`
      } else {
        ambito = 'geral'
      }

      logs.push({
        id: `criterio-criado-${c.id}`,
        createdAt: c.createdAt,
        categoria: 'Criterio',
        nivel: 'Info',
        accao: 'CRITERIO_CRIADO',
        descricao: `Critério "${c.nome}" (peso ×${c.peso}) criado ${ambito}.`,
        entidadeId: c.id,
        utilizador: c.tecnico ?? null,
      })
    }
  }

  // ── Períodos de avaliação criados ─────────────────────────
  if (!entityType || entityType === 'periodos') {
    const periodos = await prisma.periodoAvaliacao.findMany({
      where: { createdAt: df },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nome: true,
        dataInicio: true,
        dataFim: true,
        activo: true,
        createdAt: true,
      },
    })

    for (const p of periodos) {
      logs.push({
        id: `periodo-criado-${p.id}`,
        createdAt: p.createdAt,
        categoria: 'Periodo',
        nivel: 'Info',
        accao: 'PERIODO_CRIADO',
        descricao: `Período de avaliação "${p.nome}" criado (${p.dataInicio.toLocaleDateString('pt-PT')} – ${p.dataFim.toLocaleDateString('pt-PT')}).`,
        entidadeId: p.id,
        utilizador: null,
      })
    }
  }

  // ── Fichas de avaliação ───────────────────────────────────
  if (!entityType || entityType === 'fichas') {
    const fichas = await prisma.fichaAvaliacao.findMany({
      where: { createdAt: df },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        estado: true,
        createdAt: true,
        avaliado: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        },
        periodo: { select: { nome: true } },
      },
    })

    for (const f of fichas) {
      logs.push({
        id: `ficha-criada-${f.id}`,
        createdAt: f.createdAt,
        categoria: 'Avaliacao',
        nivel: 'Info',
        accao: 'FICHA_CRIADA',
        descricao: `Ficha de avaliação criada para "${f.avaliado.nomeCompleto}" no período "${f.periodo.nome}".`,
        entidadeId: f.id,
        utilizador: f.avaliado,
      })
    }
  }

  // ── Submissões de avaliação ───────────────────────────────
  if (!entityType || entityType === 'submissoes') {
    const submissoes = await prisma.submissaoAvaliacao.findMany({
      where: { dataSubmissao: df },
      orderBy: { dataSubmissao: 'desc' },
      select: {
        id: true,
        tipo: true,
        pontuacaoTotal: true,
        dataSubmissao: true,
        avaliador: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        },
        ficha: {
          select: {
            avaliado: { select: { nomeCompleto: true } },
            periodo: { select: { nome: true } },
          },
        },
      },
    })

    const tipoLabel: Record<string, string> = {
      AutoAvaliacao: 'Auto-avaliação',
      AvaliacaoChefe: 'Avaliação do chefe',
      Reavaliacao: 'Reavaliação',
    }

    for (const s of submissoes) {
      logs.push({
        id: `submissao-${s.id}`,
        createdAt: s.dataSubmissao,
        categoria: 'Avaliacao',
        nivel: 'Info',
        accao: `SUBMISSAO_${s.tipo.toUpperCase()}`,
        descricao: `${tipoLabel[s.tipo] ?? s.tipo} submetida por "${s.avaliador.nomeCompleto}" para "${s.ficha.avaliado.nomeCompleto}" (${s.ficha.periodo.nome})${s.pontuacaoTotal != null ? ` — pontuação: ${s.pontuacaoTotal}` : ''}.`,
        entidadeId: s.id,
        utilizador: s.avaliador,
      })
    }
  }

  // ── Validações do Director ────────────────────────────────
  if (!entityType || entityType === 'validacoes') {
    const validacoes = await prisma.validacaoDirector.findMany({
      where: { dataValidacao: df },
      orderBy: { dataValidacao: 'desc' },
      select: {
        id: true,
        aprovado: true,
        dataValidacao: true,
        director: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        },
        ficha: {
          select: {
            avaliado: { select: { nomeCompleto: true } },
            periodo: { select: { nome: true } },
          },
        },
      },
    })

    for (const v of validacoes) {
      logs.push({
        id: `validacao-${v.id}`,
        createdAt: v.dataValidacao,
        categoria: 'Validacao',
        nivel: v.aprovado ? 'Info' : 'Aviso',
        accao: v.aprovado ? 'VALIDACAO_APROVADA' : 'VALIDACAO_REJEITADA',
        descricao: `Avaliação de "${v.ficha.avaliado.nomeCompleto}" (${v.ficha.periodo.nome}) ${v.aprovado ? 'aprovada' : 'rejeitada'} pelo director "${v.director.nomeCompleto}".`,
        entidadeId: v.id,
        utilizador: v.director,
      })
    }
  }

  // ── Reavaliações indicadas ────────────────────────────────
  if (!entityType || entityType === 'reavaliacao') {
    const reavs = await prisma.reavaliacaoIndicada.findMany({
      where: { dataIndicacao: df },
      orderBy: { dataIndicacao: 'desc' },
      select: {
        id: true,
        concluida: true,
        dataIndicacao: true,
        reavaliador: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        },
        indicadoPor: { select: { nomeCompleto: true } },
        ficha: {
          select: {
            avaliado: { select: { nomeCompleto: true } },
            periodo: { select: { nome: true } },
          },
        },
      },
    })

    for (const r of reavs) {
      logs.push({
        id: `reavaliacao-${r.id}`,
        createdAt: r.dataIndicacao,
        categoria: 'Avaliacao',
        nivel: 'Info',
        accao: 'REAVALIACAO_INDICADA',
        descricao: `Reavaliação de "${r.ficha.avaliado.nomeCompleto}" (${r.ficha.periodo.nome}) indicada por "${r.indicadoPor.nomeCompleto}" ao técnico "${r.reavaliador.nomeCompleto}".`,
        entidadeId: r.id,
        utilizador: r.reavaliador,
      })
    }
  }

  // Ordenar todos os logs por data decrescente
  return logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}
