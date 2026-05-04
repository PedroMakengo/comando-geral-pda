'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Eye,
  Download,
  FileText,
  FileSpreadsheet,
  Loader2,
  History,
  CheckCircle2,
  XCircle,
  Filter,
  TrendingUp,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

// ── Tipos ─────────────────────────────────────────────────────
interface Ficha {
  id: string
  estado: string
  pontuacaoFinal?: number | null
  createdAt: string
  avaliado: {
    id: string
    nomeCompleto: string
    cargo: string
    avatarUrl?: string
    departamento?: { id: string; nome: string } | null
  }
  periodo: { id: string; nome: string; dataInicio: string; dataFim: string }
  _count?: { submissoes: number }
  validacao?: { aprovado: boolean; dataValidacao: string } | null
}
interface FichaDetalhe extends Ficha {
  submissoes: {
    id: string
    tipo: string
    comentarios?: string | null
    pontuacaoTotal?: number | null
    dataSubmissao: string
    avaliador: { id: string; nomeCompleto: string; role: string }
    respostas: {
      id: string
      pontuacao: number
      observacao?: string | null
      criterio: { id: string; nome: string; peso: number }
    }[]
  }[]
  validacao?: {
    aprovado: boolean
    comentarios?: string | null
    dataValidacao: string
    director: { id: string; nomeCompleto: string }
  } | null
}
interface Periodo {
  id: string
  nome: string
}
interface Meta {
  total: number
  page: number
  limit: number
  totalPages: number
}
type SortKey = 'avaliado' | 'periodo' | 'estado' | 'pontuacao' | 'data'
interface SortState {
  key: SortKey | null
  direction: 'asc' | 'desc'
}

// ── Helpers ───────────────────────────────────────────────────
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
const tipoLabel: Record<string, string> = {
  AutoAvaliacao: 'Auto-avaliação',
  AvaliacaoChefe: 'Avaliação do Chefe',
  Reavaliacao: 'Reavaliação',
}

function getSortValue(f: Ficha, key: SortKey): string | number {
  switch (key) {
    case 'avaliado':
      return f.avaliado.nomeCompleto ?? ''
    case 'periodo':
      return f.periodo.nome ?? ''
    case 'estado':
      return estadoConfig[f.estado]?.label ?? f.estado
    case 'pontuacao':
      return f.pontuacaoFinal ?? -1
    case 'data':
      return f.createdAt ?? ''
  }
}
function sortFichas(list: Ficha[], sort: SortState): Ficha[] {
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

// ── Export ────────────────────────────────────────────────────
interface ExportCol<T> {
  header: string
  value: (r: T) => string
  flex?: number
}
const EXPORT_COLS: ExportCol<Ficha>[] = [
  { header: 'Funcionario', value: (r) => r.avaliado.nomeCompleto, flex: 2.2 },
  { header: 'Cargo', value: (r) => r.avaliado.cargo, flex: 1.8 },
  {
    header: 'Departamento',
    value: (r) => r.avaliado.departamento?.nome ?? '-',
    flex: 1.8,
  },
  { header: 'Periodo', value: (r) => r.periodo.nome, flex: 1.8 },
  {
    header: 'Estado',
    value: (r) => estadoConfig[r.estado]?.label ?? r.estado,
    flex: 1.5,
  },
  {
    header: 'Pontuacao',
    value: (r) =>
      r.pontuacaoFinal != null ? r.pontuacaoFinal.toFixed(2) : '-',
    flex: 1,
  },
  { header: 'Data', value: (r) => formatDate(r.createdAt), flex: 1.2 },
]

function ExportBtn<T>({
  data,
  cols,
  titulo,
  filename,
  disabled,
}: {
  data: T[]
  cols: ExportCol<T>[]
  titulo: string
  filename: string
  disabled?: boolean
}) {
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [loadingXlsx, setLoadingXlsx] = useState(false)
  const isLoading = loadingPdf || loadingXlsx

  const handle = (formato: 'pdf' | 'excel') => async () => {
    const set = formato === 'pdf' ? setLoadingPdf : setLoadingXlsx
    set(true)
    try {
      const rows = data.map((row) => {
        const obj: Record<string, string> = {}
        for (const c of cols) obj[c.header] = c.value(row)
        return obj
      })
      const res = await fetch('/api/exportar/inline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          rows,
          cols: cols.map(({ header, flex }) => ({ header, flex })),
          titulo,
          filename,
          formato,
        }),
      })
      if (!res.ok)
        throw new Error(
          (await res.json().catch(() => ({}))).error ?? `Erro ${res.status}`,
        )
      const blob = await res.blob(),
        ext = formato === 'pdf' ? 'pdf' : 'xlsx'
      const url = URL.createObjectURL(blob),
        a = document.createElement('a')
      a.href = url
      a.download = `${filename}_${new Date().toISOString().split('T')[0]}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(formato === 'pdf' ? 'PDF gerado.' : 'Excel gerado.')
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao exportar.')
    } finally {
      set(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isLoading || data.length === 0}
          className="gap-2 h-9 border-zinc-200 text-zinc-600 hover:text-zinc-900 rounded-lg text-sm"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48 rounded-xl shadow-xl border-zinc-200"
      >
        <DropdownMenuLabel className="text-xs text-zinc-400 font-normal">
          {data.length} {data.length === 1 ? 'registo' : 'registos'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handle('pdf')}
          disabled={loadingPdf}
          className="gap-2.5 text-sm cursor-pointer rounded-lg"
        >
          {loadingPdf ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          ) : (
            <FileText className="h-4 w-4 text-red-500" />
          )}
          <div className="flex flex-col">
            <span className="font-medium">PDF</span>
            <span className="text-[11px] text-zinc-400">
              Relatório imprimível
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handle('excel')}
          disabled={loadingXlsx}
          className="gap-2.5 text-sm cursor-pointer rounded-lg"
        >
          {loadingXlsx ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          ) : (
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          )}
          <div className="flex flex-col">
            <span className="font-medium">Excel</span>
            <span className="text-[11px] text-zinc-400">Folha de cálculo</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Página ────────────────────────────────────────────────────
export default function HistoricoPage() {
  const [fichas, setFichas] = useState<Ficha[]>([])
  const [meta, setMeta] = useState<Meta>({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState('_all')
  const [filtroEstado, setFiltroEstado] = useState('ValidadoPorDirector')
  const [page, setPage] = useState(1)
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [sort, setSort] = useState<SortState>({ key: null, direction: 'asc' })
  const [sheetOpen, setSheetOpen] = useState(false)
  const [fichaDetalhe, setFichaDetalhe] = useState<FichaDetalhe | null>(null)
  const [loadingSheet, setLoadingSheet] = useState(false)

  const handleSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )

  const fetchFichas = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '15')
      if (filtroEstado !== '_all') params.set('estado', filtroEstado)
      if (filtroPeriodo !== '_all') params.set('periodoId', filtroPeriodo)
      const res = await fetch(`/api/fichas?${params}`, {
        credentials: 'include',
      })
      const data = await res.json()
      setFichas(toArray<Ficha>(data))
      if (data.meta) setMeta(data.meta)
    } catch {
      toast.error('Não foi possível carregar o histórico.')
    } finally {
      setLoading(false)
    }
  }, [page, filtroEstado, filtroPeriodo])

  useEffect(() => {
    fetchFichas()
  }, [fetchFichas])
  useEffect(() => {
    fetch('/api/periodos?limit=100', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setPeriodos(toArray(d)))
      .catch(() => {})
  }, [])
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const abrirFicha = async (f: Ficha) => {
    setSheetOpen(true)
    setFichaDetalhe(null)
    setLoadingSheet(true)
    try {
      const res = await fetch(`/api/fichas/${f.id}`, { credentials: 'include' })
      setFichaDetalhe(await res.json())
    } catch {
      toast.error('Não foi possível carregar o detalhe.')
    } finally {
      setLoadingSheet(false)
    }
  }

  const fichasFiltradas = sortFichas(
    search
      ? fichas.filter((f) =>
          f.avaliado.nomeCompleto.toLowerCase().includes(search.toLowerCase()),
        )
      : fichas,
    sort,
  )

  // Mini stats
  const validadas = fichas.filter(
    (f) => f.estado === 'ValidadoPorDirector',
  ).length
  const comPontuacao = fichas.filter((f) => f.pontuacaoFinal != null)
  const mediaPontuacao =
    comPontuacao.length > 0
      ? comPontuacao.reduce((s, f) => s + (f.pontuacaoFinal ?? 0), 0) /
        comPontuacao.length
      : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            Histórico de Avaliações
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {meta.total} avaliação{meta.total !== 1 ? 'ões' : ''} no registo
          </p>
        </div>
        <ExportBtn
          data={fichasFiltradas}
          cols={EXPORT_COLS}
          titulo="Historico de Avaliacoes"
          filename="historico_avaliacoes"
          disabled={loading}
        />
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          {
            label: 'Total',
            value: meta.total,
            icon: <History className="h-4 w-4" />,
            bg: 'bg-zinc-50 border-zinc-200',
            color: 'text-zinc-500',
          },
          {
            label: 'Validadas',
            value: validadas,
            icon: <CheckCircle2 className="h-4 w-4" />,
            bg: 'bg-emerald-50 border-emerald-200',
            color: 'text-emerald-600',
          },
          {
            label: 'Média',
            value:
              mediaPontuacao != null ? `${mediaPontuacao.toFixed(1)} / 5` : '—',
            icon: <TrendingUp className="h-4 w-4" />,
            bg: 'bg-blue-50 border-blue-200',
            color: 'text-blue-600',
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
                placeholder="Pesquisar funcionário..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 h-9 text-sm border-zinc-200 rounded-lg bg-zinc-50 focus:bg-white transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <Select
                value={filtroEstado}
                onValueChange={(v) => {
                  setFiltroEstado(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-44 text-sm border-zinc-200 rounded-lg">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos os estados</SelectItem>
                  {Object.entries(estadoConfig).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filtroPeriodo}
                onValueChange={(v) => {
                  setFiltroPeriodo(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-48 text-sm border-zinc-200 rounded-lg">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos os períodos</SelectItem>
                  {periodos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
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
                <SortHeader
                  label="Funcionário"
                  sortKey="avaliado"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Período"
                  sortKey="periodo"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Estado"
                  sortKey="estado"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Pontuação"
                  sortKey="pontuacao"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Data"
                  sortKey="data"
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
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div
                          className={`h-3.5 bg-zinc-100 rounded-full animate-pulse ${j === 0 ? 'w-40' : 'w-24'}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : fichasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center">
                        <History className="h-6 w-6 text-zinc-300" />
                      </div>
                      <p className="text-sm font-medium text-zinc-500">
                        Nenhum registo encontrado
                      </p>
                      <p className="text-xs text-zinc-400">
                        Ajuste os filtros para ver mais resultados
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                fichasFiltradas.map((f) => {
                  const est = estadoConfig[f.estado] ?? {
                    label: f.estado,
                    class: 'bg-zinc-100 text-zinc-600 border-zinc-200',
                  }
                  return (
                    <tr
                      key={f.id}
                      onClick={() => abrirFicha(f)}
                      className="group hover:bg-zinc-50/60 transition-colors duration-100 cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 shrink-0 ring-1 ring-zinc-200/80">
                            <AvatarImage src={f.avaliado.avatarUrl} />
                            <AvatarFallback className="bg-zinc-100 text-zinc-600 text-[11px] font-semibold">
                              {getInitials(f.avaliado.nomeCompleto)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-zinc-900 truncate max-w-[160px] leading-tight">
                              {f.avaliado.nomeCompleto}
                            </p>
                            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                              {f.avaliado.cargo}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[12px] text-zinc-600 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded-md">
                          {f.periodo.nome}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${est.class}`}
                        >
                          {est.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 min-w-[140px]">
                        {f.pontuacaoFinal != null ? (
                          <PontuacaoBar valor={f.pontuacaoFinal} />
                        ) : (
                          <span className="text-zinc-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-zinc-400">
                        {formatDate(f.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Eye className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
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

      {/* Sheet detalhe */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0 overflow-hidden">
          <SheetHeader className="px-6 py-5 border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                <History className="h-4 w-4 text-zinc-500" />
              </div>
              <div>
                <SheetTitle className="text-base font-semibold text-zinc-900">
                  Detalhe da Avaliação
                </SheetTitle>
                <SheetDescription className="text-[12px] text-zinc-500 mt-0.5">
                  {fichaDetalhe?.avaliado.nomeCompleto} ·{' '}
                  {fichaDetalhe?.periodo.nome}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {loadingSheet ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-zinc-100 rounded-xl animate-pulse"
                />
              ))
            ) : fichaDetalhe ? (
              <>
                {/* Pontuação */}
                {fichaDetalhe.pontuacaoFinal != null && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="h-14 w-14 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                        <span className="text-xl font-bold text-emerald-700">
                          {fichaDetalhe.pontuacaoFinal.toFixed(1)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-800">
                          Pontuação Final
                        </p>
                        <p className="text-xs text-emerald-600 mt-0.5">
                          Validado ·{' '}
                          {fichaDetalhe.validacao
                            ? formatDate(fichaDetalhe.validacao.dataValidacao)
                            : ''}
                        </p>
                      </div>
                    </div>
                    <PontuacaoBar valor={fichaDetalhe.pontuacaoFinal} />
                  </div>
                )}

                {/* Submissões */}
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-3">
                    Submissões ({fichaDetalhe.submissoes.length})
                  </p>
                  <div className="space-y-3">
                    {fichaDetalhe.submissoes.map((s) => (
                      <div
                        key={s.id}
                        className="rounded-xl border border-zinc-200 p-4 bg-white"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-md">
                            {tipoLabel[s.tipo] ?? s.tipo}
                          </span>
                          <div className="flex items-center gap-2">
                            {s.pontuacaoTotal != null && (
                              <span className="text-sm font-bold text-zinc-900">
                                {s.pontuacaoTotal.toFixed(1)}
                                <span className="text-xs font-normal text-zinc-400">
                                  {' '}
                                  /5
                                </span>
                              </span>
                            )}
                            <span className="text-[11px] text-zinc-400">
                              {formatDate(s.dataSubmissao)}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-zinc-500 mb-3">
                          Por:{' '}
                          <span className="font-medium text-zinc-700">
                            {s.avaliador.nomeCompleto}
                          </span>
                        </p>
                        {s.comentarios && (
                          <p className="text-xs text-zinc-600 italic border-l-2 border-zinc-200 pl-2.5 mb-3">
                            "{s.comentarios}"
                          </p>
                        )}
                        {s.respostas.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            {s.respostas.map((r) => (
                              <div
                                key={r.id}
                                className="flex items-center justify-between text-xs"
                              >
                                <span className="text-zinc-500 truncate max-w-[180px]">
                                  {r.criterio.nome}
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="flex gap-0.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <div
                                        key={i}
                                        className={`h-1.5 w-4 rounded-full ${i < r.pontuacao ? 'bg-blue-500' : 'bg-zinc-200'}`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-zinc-600 font-semibold w-4 text-right">
                                    {r.pontuacao}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Validação */}
                {fichaDetalhe.validacao && (
                  <div
                    className={`rounded-xl border p-4 ${fichaDetalhe.validacao.aprovado ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <p
                        className={`text-sm font-semibold ${fichaDetalhe.validacao.aprovado ? 'text-emerald-800' : 'text-red-800'}`}
                      >
                        {fichaDetalhe.validacao.director.nomeCompleto}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${fichaDetalhe.validacao.aprovado ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
                      >
                        {fichaDetalhe.validacao.aprovado ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" /> Aprovado
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" /> Rejeitado
                          </>
                        )}
                      </span>
                    </div>
                    <p
                      className={`text-xs ${fichaDetalhe.validacao.aprovado ? 'text-emerald-600' : 'text-red-500'}`}
                    >
                      {formatDate(fichaDetalhe.validacao.dataValidacao)}
                    </p>
                    {fichaDetalhe.validacao.comentarios && (
                      <p
                        className={`text-xs mt-2 italic border-l-2 pl-2.5 ${fichaDetalhe.validacao.aprovado ? 'border-emerald-300 text-emerald-700' : 'border-red-300 text-red-700'}`}
                      >
                        "{fichaDetalhe.validacao.comentarios}"
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
