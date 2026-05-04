'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Eye,
  RotateCcw,
  Plus,
  Loader2,
  CheckCircle2,
  Filter,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

// ── Tipos ─────────────────────────────────────────────────────
interface Reavaliacao {
  id: string
  motivacao?: string | null
  dataIndicacao: string
  concluida: boolean
  ficha: {
    id: string
    estado: string
    avaliado: {
      id: string
      nomeCompleto: string
      cargo: string
      avatarUrl?: string
      departamento?: { id: string; nome: string } | null
    }
    periodo: { id: string; nome: string }
  }
  reavaliador: { id: string; nomeCompleto: string; cargo: string }
  indicadoPor: { id: string; nomeCompleto: string; role: string }
}
interface FichaParaReavaliacao {
  id: string
  estado: string
  avaliado: {
    id: string
    nomeCompleto: string
    cargo: string
    avatarUrl?: string
    departamento?: { id: string; nome: string } | null
  }
  periodo: { id: string; nome: string }
  reavaliacao?: { id: string } | null
}
interface Tecnico {
  id: string
  nomeCompleto: string
  cargo: string
}
interface Meta {
  total: number
  page: number
  limit: number
  totalPages: number
}
type SortKey = 'avaliado' | 'reavaliador' | 'periodo' | 'data' | 'situacao'
interface SortState {
  key: SortKey | null
  direction: 'asc' | 'desc'
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

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string
  sortKey: SortKey
  sort: SortState
  onSort: (k: SortKey) => void
}) {
  const active = sort.key === sortKey
  return (
    <th className="text-left px-4 py-3 font-medium text-zinc-400 text-[11px] uppercase tracking-wider">
      <button
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 hover:text-zinc-700 transition-colors group select-none"
      >
        {label}
        <span className="flex flex-col gap-[1px] ml-0.5">
          <ChevronUp
            className={`h-2.5 w-2.5 ${active && sort.direction === 'asc' ? 'text-zinc-800' : 'text-zinc-300 group-hover:text-zinc-400'}`}
          />
          <ChevronDown
            className={`h-2.5 w-2.5 ${active && sort.direction === 'desc' ? 'text-zinc-800' : 'text-zinc-300 group-hover:text-zinc-400'}`}
          />
        </span>
      </button>
    </th>
  )
}

function getSortValue(r: Reavaliacao, key: SortKey): string | number {
  switch (key) {
    case 'avaliado':
      return r.ficha.avaliado.nomeCompleto
    case 'reavaliador':
      return r.reavaliador.nomeCompleto
    case 'periodo':
      return r.ficha.periodo.nome
    case 'data':
      return r.dataIndicacao
    case 'situacao':
      return r.concluida ? 1 : 0
    default:
      return ''
  }
}
function sortReavaliacoes(list: Reavaliacao[], sort: SortState): Reavaliacao[] {
  if (!sort.key) return list
  return [...list].sort((a, b) => {
    const aV = getSortValue(a, sort.key!),
      bV = getSortValue(b, sort.key!)
    const cmp =
      typeof aV === 'number' && typeof bV === 'number'
        ? aV - bV
        : String(aV).toLowerCase().localeCompare(String(bV).toLowerCase(), 'pt')
    return sort.direction === 'asc' ? cmp : -cmp
  })
}

// ── Componente ────────────────────────────────────────────────
export default function ReavaliacoesDirectorPage() {
  const [reavaliacoes, setReavaliacoes] = useState<Reavaliacao[]>([])
  const [meta, setMeta] = useState<Meta>({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filtroConcluida, setFiltroConcluida] = useState('_all')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<SortState>({ key: null, direction: 'asc' })
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [fichasElegiveis, setFichasElegiveis] = useState<
    FichaParaReavaliacao[]
  >([])
  const [sheetDetalhe, setSheetDetalhe] = useState(false)
  const [reavSelecionada, setReavSelecionada] = useState<Reavaliacao | null>(
    null,
  )
  const [sheetNova, setSheetNova] = useState(false)
  const [fichaId, setFichaId] = useState('')
  const [reavaliadorId, setReavaliadorId] = useState('')
  const [motivacao, setMotivacao] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchReavaliacoes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '15')
      if (filtroConcluida !== '_all') params.set('concluida', filtroConcluida)
      const res = await fetch(`/api/reavaliacoes?${params}`, {
        credentials: 'include',
      })
      const data = await res.json()
      setReavaliacoes(toArray<Reavaliacao>(data))
      if (data.meta) setMeta(data.meta)
    } catch {
      toast.error('Não foi possível carregar as reavaliações.')
    } finally {
      setLoading(false)
    }
  }, [page, filtroConcluida])

  useEffect(() => {
    fetchReavaliacoes()
  }, [fetchReavaliacoes])
  useEffect(() => {
    fetch('/api/utilizadores?limit=200&role=Tecnico', {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((d) => setTecnicos(toArray(d)))
      .catch(() => {})
    fetch('/api/fichas?estado=AvaliadoPorChefe&limit=100', {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((d) => {
        const fichas: FichaParaReavaliacao[] = toArray(d)
        setFichasElegiveis(fichas.filter((f) => !f.reavaliacao))
      })
      .catch(() => {})
  }, [])
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const handleSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )

  const submeterReavaliacao = async () => {
    if (!fichaId) {
      toast.error('Seleccione a ficha a reavaliar.')
      return
    }
    if (!reavaliadorId) {
      toast.error('Seleccione o técnico reavaliador.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/reavaliacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fichaId,
          reavaliadorId,
          motivacao: motivacao.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao indicar reavaliação.')
        return
      }
      toast.success('Reavaliação indicada com sucesso!')
      setSheetNova(false)
      setFichaId('')
      setReavaliadorId('')
      setMotivacao('')
      fetchReavaliacoes()
      setFichasElegiveis((prev) => prev.filter((f) => f.id !== fichaId))
    } finally {
      setSubmitting(false)
    }
  }

  const filtradas = sortReavaliacoes(
    search
      ? reavaliacoes.filter(
          (r) =>
            r.ficha.avaliado.nomeCompleto
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            r.reavaliador.nomeCompleto
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
      : reavaliacoes,
    sort,
  )

  const fichaSeleccionada = fichasElegiveis.find((f) => f.id === fichaId)
  const pendentes = reavaliacoes.filter((r) => !r.concluida).length
  const concluidas = reavaliacoes.filter((r) => r.concluida).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            Reavaliações
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {meta.total} reavaliação{meta.total !== 1 ? 'ões' : ''} registada
            {meta.total !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={() => setSheetNova(true)}
          disabled={fichasElegiveis.length === 0}
          size="sm"
          className="gap-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg h-9 px-4 shadow-sm"
          title={fichasElegiveis.length === 0 ? 'Sem fichas elegíveis' : ''}
        >
          <Plus className="h-4 w-4" />{' '}
          {fichasElegiveis.length === 0
            ? 'Sem fichas elegíveis'
            : 'Indicar Reavaliação'}
        </Button>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: 'Total',
            value: meta.total,
            icon: <RotateCcw className="h-4 w-4" />,
            bg: 'bg-zinc-50 border-zinc-200',
            color: 'text-zinc-500',
          },
          {
            label: 'Pendentes',
            value: pendentes,
            icon: <RotateCcw className="h-4 w-4" />,
            bg:
              pendentes > 0
                ? 'bg-amber-50 border-amber-200'
                : 'bg-zinc-50 border-zinc-200',
            color: pendentes > 0 ? 'text-amber-600' : 'text-zinc-400',
          },
          {
            label: 'Concluídas',
            value: concluidas,
            icon: <CheckCircle2 className="h-4 w-4" />,
            bg: 'bg-emerald-50 border-emerald-200',
            color: 'text-emerald-600',
          },
        ].map((s, i) => (
          <Card key={i} className={`border shadow-none ${s.bg}`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                  {s.label}
                </p>
                <p className="text-2xl font-bold text-zinc-900 mt-0.5 leading-none">
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
                placeholder="Pesquisar técnico ou reavaliador..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 h-9 text-sm border-zinc-200 rounded-lg bg-zinc-50 focus:bg-white transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <Select
                value={filtroConcluida}
                onValueChange={(v) => {
                  setFiltroConcluida(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-44 text-sm border-zinc-200 rounded-lg">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todas</SelectItem>
                  <SelectItem value="false">Pendentes</SelectItem>
                  <SelectItem value="true">Concluídas</SelectItem>
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
                <SortHeader
                  label="Técnico avaliado"
                  sortKey="avaliado"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Reavaliador"
                  sortKey="reavaliador"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Período"
                  sortKey="periodo"
                  sort={sort}
                  onSort={handleSort}
                />
                <th className="text-left px-4 py-3 font-medium text-zinc-400 text-[11px] uppercase tracking-wider">
                  Estado ficha
                </th>
                <SortHeader
                  label="Data"
                  sortKey="data"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Situação"
                  sortKey="situacao"
                  sort={sort}
                  onSort={handleSort}
                />
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100/80">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div
                          className={`h-3.5 bg-zinc-100 rounded-full animate-pulse ${j === 0 ? 'w-36' : 'w-20'}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center">
                        <RotateCcw className="h-6 w-6 text-zinc-300" />
                      </div>
                      <p className="text-sm font-medium text-zinc-500">
                        Nenhuma reavaliação encontrada
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtradas.map((r) => {
                  const est = estadoConfig[r.ficha.estado] ?? {
                    label: r.ficha.estado,
                    class: 'bg-zinc-100 text-zinc-600 border-zinc-200',
                  }
                  return (
                    <tr
                      key={r.id}
                      className="group hover:bg-zinc-50/60 transition-colors duration-100"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 shrink-0 ring-1 ring-zinc-200/80">
                            <AvatarImage src={r.ficha.avaliado.avatarUrl} />
                            <AvatarFallback className="bg-zinc-100 text-zinc-600 text-[11px] font-semibold">
                              {getInitials(r.ficha.avaliado.nomeCompleto)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-zinc-900 truncate max-w-[130px] leading-tight">
                              {r.ficha.avaliado.nomeCompleto}
                            </p>
                            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                              {r.ficha.avaliado.departamento?.nome ?? '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 shrink-0 ring-1 ring-blue-200">
                            <AvatarFallback className="bg-blue-50 text-blue-600 text-[10px] font-semibold">
                              {getInitials(r.reavaliador.nomeCompleto)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[12px] text-zinc-600 truncate max-w-[110px]">
                            {r.reavaliador.nomeCompleto}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[12px] text-zinc-600 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded-md">
                          {r.ficha.periodo.nome}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${est.class}`}
                        >
                          {est.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-zinc-400">
                        {formatDate(r.dataIndicacao)}
                      </td>
                      <td className="px-4 py-3">
                        {r.concluida ? (
                          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Concluída
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-amber-600">
                            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />{' '}
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setReavSelecionada(r)
                            setSheetDetalhe(true)
                          }}
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 bg-zinc-50/50">
            <p className="text-xs text-zinc-400">
              <span className="font-medium text-zinc-600">
                {(page - 1) * meta.limit + 1}–
                {Math.min(page * meta.limit, meta.total)}
              </span>{' '}
              de <span className="font-medium text-zinc-600">{meta.total}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-zinc-200 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-zinc-600 px-2 font-medium">
                {page} / {meta.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-zinc-200 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Sheet: Detalhe */}
      <Sheet open={sheetDetalhe} onOpenChange={setSheetDetalhe}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
          <SheetHeader className="px-6 py-5 border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <RotateCcw className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <SheetTitle className="text-base font-semibold text-zinc-900">
                  Detalhe da Reavaliação
                </SheetTitle>
                <SheetDescription className="text-[12px] text-zinc-500 mt-0.5">
                  {reavSelecionada?.ficha.periodo.nome}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          {reavSelecionada && (
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-2">
                  Técnico avaliado
                </p>
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
                  <Avatar className="h-10 w-10 shrink-0 ring-1 ring-zinc-200">
                    <AvatarImage
                      src={reavSelecionada.ficha.avaliado.avatarUrl}
                    />
                    <AvatarFallback className="bg-zinc-200 text-zinc-600 text-xs font-semibold">
                      {getInitials(reavSelecionada.ficha.avaliado.nomeCompleto)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-900">
                      {reavSelecionada.ficha.avaliado.nomeCompleto}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {reavSelecionada.ficha.avaliado.cargo} ·{' '}
                      {reavSelecionada.ficha.avaliado.departamento?.nome ?? '—'}
                    </p>
                  </div>
                  {(() => {
                    const e = estadoConfig[reavSelecionada.ficha.estado]
                    return e ? (
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${e.class}`}
                      >
                        {e.label}
                      </span>
                    ) : null
                  })()}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-2">
                  Reavaliador indicado
                </p>
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-200">
                  <Avatar className="h-9 w-9 shrink-0 ring-1 ring-blue-200">
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">
                      {getInitials(reavSelecionada.reavaliador.nomeCompleto)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-blue-900">
                      {reavSelecionada.reavaliador.nomeCompleto}
                    </p>
                    <p className="text-xs text-blue-600">
                      {reavSelecionada.reavaliador.cargo}
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3.5">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-[0.12em] font-bold mb-1.5">
                    Indicado em
                  </p>
                  <p className="text-sm font-semibold text-zinc-700">
                    {formatDate(reavSelecionada.dataIndicacao)}
                  </p>
                </div>
                <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3.5">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-[0.12em] font-bold mb-1.5">
                    Situação
                  </p>
                  {reavSelecionada.concluida ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" /> Concluída
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />{' '}
                      Pendente
                    </span>
                  )}
                </div>
              </div>
              <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3.5">
                <p className="text-[10px] text-zinc-400 uppercase tracking-[0.12em] font-bold mb-1.5">
                  Indicado por
                </p>
                <p className="text-sm font-medium text-zinc-700">
                  {reavSelecionada.indicadoPor.nomeCompleto}
                </p>
              </div>
              {reavSelecionada.motivacao && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5">
                  <p className="text-[10px] text-amber-600 uppercase tracking-[0.12em] font-bold mb-1.5">
                    Motivação
                  </p>
                  <p className="text-sm text-amber-800 italic">
                    "{reavSelecionada.motivacao}"
                  </p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet: Nova reavaliação */}
      <Sheet open={sheetNova} onOpenChange={setSheetNova}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
          <SheetHeader className="px-6 py-5 border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <Plus className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <SheetTitle className="text-base font-semibold text-zinc-900">
                  Indicar Reavaliação
                </SheetTitle>
                <SheetDescription className="text-[12px] text-zinc-500 mt-0.5">
                  Seleccione a ficha e o técnico que irá reavaliar.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-zinc-700">
                Ficha a reavaliar
              </Label>
              {fichasElegiveis.length === 0 ? (
                <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 text-center">
                  <p className="text-xs text-zinc-400">
                    Nenhuma ficha elegível. Fichas precisam estar no estado
                    "Avaliado p/ Chefe".
                  </p>
                </div>
              ) : (
                <Select value={fichaId} onValueChange={setFichaId}>
                  <SelectTrigger className="h-9 rounded-lg border-zinc-200 text-sm w-full">
                    <SelectValue placeholder="Seleccione uma ficha" />
                  </SelectTrigger>
                  <SelectContent>
                    {fichasElegiveis.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        <span className="font-medium">
                          {f.avaliado.nomeCompleto}
                        </span>
                        <span className="text-zinc-400 ml-1 text-xs">
                          · {f.periodo.nome}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {fichaSeleccionada && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
                <Avatar className="h-8 w-8 shrink-0 ring-1 ring-zinc-200">
                  <AvatarImage src={fichaSeleccionada.avaliado.avatarUrl} />
                  <AvatarFallback className="bg-zinc-100 text-zinc-600 text-xs font-semibold">
                    {getInitials(fichaSeleccionada.avaliado.nomeCompleto)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">
                    {fichaSeleccionada.avaliado.nomeCompleto}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {fichaSeleccionada.avaliado.cargo} ·{' '}
                    {fichaSeleccionada.avaliado.departamento?.nome ?? '—'}
                  </p>
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-zinc-700">
                Técnico reavaliador
              </Label>
              <Select value={reavaliadorId} onValueChange={setReavaliadorId}>
                <SelectTrigger className="h-9 rounded-lg border-zinc-200 text-sm w-full">
                  <SelectValue placeholder="Seleccione o técnico" />
                </SelectTrigger>
                <SelectContent>
                  {tecnicos
                    .filter((t) => t.id !== fichaSeleccionada?.avaliado.id)
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <span>{t.nomeCompleto}</span>
                        <span className="text-zinc-400 ml-1 text-xs">
                          · {t.cargo}
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {fichaSeleccionada && (
                <p className="text-[11px] text-zinc-400">
                  O próprio técnico avaliado está excluído da lista.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-zinc-700">
                Motivação{' '}
                <span className="text-zinc-400 font-normal">(opcional)</span>
              </Label>
              <Textarea
                value={motivacao}
                onChange={(e) => setMotivacao(e.target.value)}
                placeholder="Justifique o motivo da reavaliação..."
                className="rounded-lg border-zinc-200 text-sm resize-none"
                rows={3}
              />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-zinc-100 shrink-0 flex gap-2.5 bg-white">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-9 rounded-lg border-zinc-200 text-sm"
              onClick={() => setSheetNova(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={submeterReavaliacao}
              disabled={submitting || !fichaId || !reavaliadorId}
              className="flex-1 h-9 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium shadow-sm"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Indicar
                  reavaliação
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
