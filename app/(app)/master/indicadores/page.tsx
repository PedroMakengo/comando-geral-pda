'use client'

import { useEffect, useState } from 'react'
import {
  Search,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Users,
  Award,
  Filter,
  Activity,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { toast } from 'sonner'

// ── Tipos ─────────────────────────────────────────────────────
interface Utilizador {
  id: string
  nomeCompleto: string
  cargo: string
  email: string
  avatarUrl?: string
  departamento?: { id: string; nome: string } | null
}
interface FichaResumida {
  id: string
  estado: string
  pontuacaoFinal?: number | null
  periodo: { id: string; nome: string; dataInicio: string; dataFim: string }
  _count?: { submissoes: number }
}
interface Indicadores {
  utilizador: Utilizador
  fichas: FichaResumida[]
  totalFichas: number
  fichasConcluidas: number
  mediaPontuacao: number | null
  melhorPontuacao: number | null
  ultimaPontuacao: number | null
  tendencia: 'up' | 'down' | 'stable' | null
}
interface Departamento {
  id: string
  nome: string
}

function toArray<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res
  if (res && typeof res === 'object' && Array.isArray((res as any).data))
    return (res as any).data
  return []
}
function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function calcularIndicadores(
  u: Utilizador,
  fichas: FichaResumida[],
): Indicadores {
  const concluidas = fichas.filter(
    (f) => f.estado === 'ValidadoPorDirector' && f.pontuacaoFinal != null,
  )
  const pontuacoes = concluidas.map((f) => f.pontuacaoFinal!) as number[]
  const media =
    pontuacoes.length > 0
      ? pontuacoes.reduce((a, b) => a + b, 0) / pontuacoes.length
      : null
  const melhor = pontuacoes.length > 0 ? Math.max(...pontuacoes) : null
  const ultima =
    pontuacoes.length > 0 ? pontuacoes[pontuacoes.length - 1] : null
  let tendencia: 'up' | 'down' | 'stable' | null = null
  if (pontuacoes.length >= 2) {
    const diff =
      pontuacoes[pontuacoes.length - 1] - pontuacoes[pontuacoes.length - 2]
    tendencia = diff > 0.1 ? 'up' : diff < -0.1 ? 'down' : 'stable'
  }
  return {
    utilizador: u,
    fichas,
    totalFichas: fichas.length,
    fichasConcluidas: concluidas.length,
    mediaPontuacao: media,
    melhorPontuacao: melhor,
    ultimaPontuacao: ultima,
    tendencia,
  }
}

function PontuacaoBar({ valor, max = 5 }: { valor: number; max?: number }) {
  const pct = Math.min(100, (valor / max) * 100)
  const cor =
    pct >= 80
      ? 'bg-emerald-500'
      : pct >= 60
        ? 'bg-blue-500'
        : pct >= 40
          ? 'bg-amber-500'
          : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden min-w-[60px]">
        <div
          className={`h-full rounded-full ${cor} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-zinc-700 w-7 text-right shrink-0">
        {valor.toFixed(1)}
      </span>
    </div>
  )
}

const estadoConfig: Record<string, { label: string; class: string }> = {
  Pendente: {
    label: 'Pendente',
    class: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  },
  AutoAvaliacao: {
    label: 'Auto-avaliação',
    class: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  AvaliadoPorChefe: {
    label: 'Av. p/ Chefe',
    class: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  EmReavaliacao: {
    label: 'Em Reavaliação',
    class: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  Reavaliado: {
    label: 'Reavaliado',
    class: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  ValidadoPorDirector: {
    label: 'Validado',
    class: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
}

// ── Componente ────────────────────────────────────────────────
export default function IndicadoresPage() {
  const [indicadores, setIndicadores] = useState<Indicadores[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filtroDept, setFiltroDept] = useState('_all')
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [indSelecionado, setIndSelecionado] = useState<Indicadores | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [dataUtiliz, dataFichas] = await Promise.all([
          fetch('/api/utilizadores?limit=200', { credentials: 'include' }).then(
            (r) => r.json(),
          ),
          fetch('/api/fichas?limit=500', { credentials: 'include' }).then((r) =>
            r.json(),
          ),
        ])
        const todos: Utilizador[] = toArray(dataUtiliz)
        const fichas: FichaResumida[] = toArray(dataFichas)
        const fichasPorUtilizador: Record<string, FichaResumida[]> = {}
        fichas.forEach((f) => {
          const avaliado = (f as any).avaliado
          if (!avaliado?.id) return
          if (!fichasPorUtilizador[avaliado.id])
            fichasPorUtilizador[avaliado.id] = []
          fichasPorUtilizador[avaliado.id].push(f)
        })
        setIndicadores(
          todos.map((u) =>
            calcularIndicadores(u, fichasPorUtilizador[u.id] ?? []),
          ),
        )
      } catch {
        toast.error('Não foi possível carregar os indicadores.')
      } finally {
        setLoading(false)
      }
    }
    load()
    fetch('/api/departamentos?limit=100', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setDepartamentos(toArray(d)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  const filtrados = indicadores.filter((ind) => {
    const matchSearch =
      !search ||
      ind.utilizador.nomeCompleto
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      ind.utilizador.cargo.toLowerCase().includes(search.toLowerCase())
    const matchDept =
      filtroDept === '_all' || ind.utilizador.departamento?.id === filtroDept
    return matchSearch && matchDept
  })

  // Mini stats
  const comDados = filtrados.filter((i) => i.mediaPontuacao != null)
  const mediaGeral =
    comDados.length > 0
      ? comDados.reduce((s, i) => s + (i.mediaPontuacao ?? 0), 0) /
        comDados.length
      : null
  const emMelhoria = filtrados.filter((i) => i.tendencia === 'up').length
  const totalFichas = filtrados.reduce((s, i) => s + i.fichasConcluidas, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            Indicadores de Desempenho
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {filtrados.length} funcionário{filtrados.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Funcionários',
            value: filtrados.length,
            icon: <Users className="h-4 w-4" />,
            bg: 'bg-zinc-50 border-zinc-200',
            color: 'text-zinc-500',
          },
          {
            label: 'Média Geral',
            value: mediaGeral != null ? `${mediaGeral.toFixed(1)} / 5` : '—',
            icon: <Activity className="h-4 w-4" />,
            bg: 'bg-blue-50 border-blue-200',
            color: 'text-blue-600',
          },
          {
            label: 'Em Melhoria',
            value: emMelhoria,
            icon: <TrendingUp className="h-4 w-4" />,
            bg: 'bg-emerald-50 border-emerald-200',
            color: 'text-emerald-600',
          },
          {
            label: 'Av. Concluídas',
            value: totalFichas,
            icon: <Award className="h-4 w-4" />,
            bg: 'bg-amber-50 border-amber-200',
            color: 'text-amber-600',
          },
        ].map((s, i) => (
          <Card key={i} className={`border shadow-none ${s.bg}`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                  {s.label}
                </p>
                <p
                  className={`font-bold text-zinc-900 mt-0.5 leading-none ${typeof s.value === 'string' && s.value.includes('/') ? 'text-lg' : 'text-2xl'}`}
                >
                  {s.value}
                </p>
              </div>
              <div className={`${s.color} opacity-60`}>{s.icon}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Card className="border-zinc-200 shadow-none">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Pesquisar funcionário..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 h-9 text-sm border-zinc-200 rounded-lg bg-zinc-50 focus:bg-white transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <Select value={filtroDept} onValueChange={setFiltroDept}>
                <SelectTrigger className="h-9 w-48 text-sm border-zinc-200 rounded-lg">
                  <SelectValue placeholder="Departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos os dept.</SelectItem>
                  {departamentos.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80">
                {[
                  'Funcionário',
                  'Média',
                  'Melhor',
                  'Último',
                  'Fichas',
                  'Tendência',
                  '',
                ].map((h, i) => (
                  <th
                    key={i}
                    className="text-left px-4 py-3 font-medium text-zinc-400 text-[11px] uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100/80">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div
                          className={`h-3.5 bg-zinc-100 rounded-full animate-pulse ${j === 0 ? 'w-40' : 'w-16'}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center">
                        <Users className="h-6 w-6 text-zinc-300" />
                      </div>
                      <p className="text-sm font-medium text-zinc-500">
                        Nenhum funcionário encontrado
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtrados.map((ind) => (
                  <tr
                    key={ind.utilizador.id}
                    onClick={() => {
                      setIndSelecionado(ind)
                      setSheetOpen(true)
                    }}
                    className="group hover:bg-zinc-50/60 transition-colors duration-100 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 shrink-0 ring-1 ring-zinc-200/80">
                          <AvatarImage src={ind.utilizador.avatarUrl} />
                          <AvatarFallback className="bg-zinc-100 text-zinc-600 text-[11px] font-semibold">
                            {getInitials(ind.utilizador.nomeCompleto)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-900 truncate max-w-[150px] leading-tight">
                            {ind.utilizador.nomeCompleto}
                          </p>
                          <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                            {ind.utilizador.departamento?.nome ?? '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 min-w-[130px]">
                      {ind.mediaPontuacao != null ? (
                        <PontuacaoBar valor={ind.mediaPontuacao} />
                      ) : (
                        <span className="text-zinc-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {ind.melhorPontuacao != null ? (
                        <span className="text-sm font-bold text-zinc-700">
                          {ind.melhorPontuacao.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-zinc-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {ind.ultimaPontuacao != null ? (
                        <span className="text-sm font-bold text-zinc-700">
                          {ind.ultimaPontuacao.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-zinc-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${ind.fichasConcluidas > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-zinc-50 text-zinc-400 border border-zinc-100'}`}
                      >
                        {ind.fichasConcluidas}/{ind.totalFichas}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {ind.tendencia === 'up' && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                          <span className="text-[11px] text-emerald-600 font-medium">
                            Sobe
                          </span>
                        </div>
                      )}
                      {ind.tendencia === 'down' && (
                        <div className="flex items-center gap-1">
                          <TrendingDown className="h-4 w-4 text-red-400" />
                          <span className="text-[11px] text-red-500 font-medium">
                            Desce
                          </span>
                        </div>
                      )}
                      {ind.tendencia === 'stable' && (
                        <div className="flex items-center gap-1">
                          <Minus className="h-4 w-4 text-zinc-400" />
                          <span className="text-[11px] text-zinc-400 font-medium">
                            Estável
                          </span>
                        </div>
                      )}
                      {ind.tendencia === null && (
                        <span className="text-zinc-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Sheet detalhe */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
          <SheetHeader className="px-6 py-5 border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <SheetTitle className="text-base font-semibold text-zinc-900">
                  Indicadores de Desempenho
                </SheetTitle>
                <SheetDescription className="text-[12px] text-zinc-500 mt-0.5">
                  {indSelecionado?.utilizador.nomeCompleto}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {indSelecionado && (
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Funcionário */}
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
                <Avatar className="h-10 w-10 shrink-0 ring-1 ring-zinc-200">
                  <AvatarImage src={indSelecionado.utilizador.avatarUrl} />
                  <AvatarFallback className="bg-zinc-200 text-zinc-600 text-xs font-semibold">
                    {getInitials(indSelecionado.utilizador.nomeCompleto)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">
                    {indSelecionado.utilizador.nomeCompleto}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {indSelecionado.utilizador.cargo} ·{' '}
                    {indSelecionado.utilizador.departamento?.nome ?? '—'}
                  </p>
                </div>
              </div>

              {/* Métricas */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: 'Média Geral',
                    valor: indSelecionado.mediaPontuacao,
                    cor: 'text-blue-700',
                    bg: 'bg-blue-50 border-blue-200',
                  },
                  {
                    label: 'Melhor Nota',
                    valor: indSelecionado.melhorPontuacao,
                    cor: 'text-emerald-700',
                    bg: 'bg-emerald-50 border-emerald-200',
                  },
                  {
                    label: 'Última Nota',
                    valor: indSelecionado.ultimaPontuacao,
                    cor: 'text-zinc-700',
                    bg: 'bg-zinc-50 border-zinc-200',
                  },
                  {
                    label: 'Concluídas',
                    valor: null,
                    cor: 'text-purple-700',
                    bg: 'bg-purple-50 border-purple-200',
                    isCount: true,
                  },
                ].map((m, i) => (
                  <div key={i} className={`rounded-xl border p-3.5 ${m.bg}`}>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-[0.12em] font-bold mb-1.5">
                      {m.label}
                    </p>
                    <p className={`text-2xl font-bold ${m.cor}`}>
                      {m.isCount
                        ? `${indSelecionado.fichasConcluidas}/${indSelecionado.totalFichas}`
                        : m.valor != null
                          ? m.valor.toFixed(1)
                          : '—'}
                    </p>
                  </div>
                ))}
              </div>

              {/* Tendência */}
              {indSelecionado.tendencia && (
                <div
                  className={`flex items-center gap-3 p-3.5 rounded-xl border ${indSelecionado.tendencia === 'up' ? 'bg-emerald-50 border-emerald-200' : indSelecionado.tendencia === 'down' ? 'bg-red-50 border-red-200' : 'bg-zinc-50 border-zinc-200'}`}
                >
                  {indSelecionado.tendencia === 'up' && (
                    <TrendingUp className="h-5 w-5 text-emerald-600 shrink-0" />
                  )}
                  {indSelecionado.tendencia === 'down' && (
                    <TrendingDown className="h-5 w-5 text-red-500 shrink-0" />
                  )}
                  {indSelecionado.tendencia === 'stable' && (
                    <Minus className="h-5 w-5 text-zinc-500 shrink-0" />
                  )}
                  <p
                    className={`text-sm font-medium ${indSelecionado.tendencia === 'up' ? 'text-emerald-800' : indSelecionado.tendencia === 'down' ? 'text-red-700' : 'text-zinc-700'}`}
                  >
                    {indSelecionado.tendencia === 'up' &&
                      'Tendência de melhoria face ao período anterior'}
                    {indSelecionado.tendencia === 'down' &&
                      'Tendência de declínio face ao período anterior'}
                    {indSelecionado.tendencia === 'stable' &&
                      'Desempenho estável face ao período anterior'}
                  </p>
                </div>
              )}

              {/* Evolução */}
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-3">
                  Evolução por Período ({indSelecionado.fichas.length})
                </p>
                {indSelecionado.fichas.length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                    <p className="text-sm text-zinc-400">
                      Sem fichas de avaliação.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {indSelecionado.fichas.map((f) => {
                      const est = estadoConfig[f.estado] ?? {
                        label: f.estado,
                        class: 'bg-zinc-100 text-zinc-600 border-zinc-200',
                      }
                      return (
                        <div
                          key={f.id}
                          className="rounded-xl border border-zinc-200 p-3.5 bg-white"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-zinc-700">
                              {f.periodo.nome}
                            </p>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${est.class}`}
                            >
                              {est.label}
                            </span>
                          </div>
                          {f.pontuacaoFinal != null ? (
                            <PontuacaoBar valor={f.pontuacaoFinal} />
                          ) : (
                            <p className="text-xs text-zinc-400">
                              Sem pontuação final
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
