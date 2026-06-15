'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Eye,
  CheckCircle2,
  XCircle,
  Filter,
  FileText,
  ClipboardList,
  Download,
  Loader2,
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
import { ExportMenu } from '../../../../components/export-menu'

// ── Tipos ─────────────────────────────────────────────────────
interface Ficha {
  id: string
  estado: string
  pontuacaoFinal?: number | null
  createdAt: string
  updatedAt: string
  avaliado: {
    id: string
    nomeCompleto: string
    cargo: string
    email: string
    numeroMecanografico: string
    avatarUrl?: string
    departamento?: { id: string; nome: string } | null
    direcao?: { id: string; nome: string } | null
  }
  periodo: {
    id: string
    nome: string
    dataInicio: string
    dataFim: string
    activo: boolean
  }
  submissao?: { pontuacaoTotal?: number | null } | null
  validacao?: { aprovado: boolean; dataValidacao: string } | null
}
interface FichaDetalhe {
  id: string
  estado: string
  pontuacaoFinal?: number | null
  createdAt: string
  avaliado: {
    id: string
    nomeCompleto: string
    cargo: string
    email: string
    numeroMecanografico: string
    avatarUrl?: string
    departamento?: { id: string; nome: string } | null
    direcao?: { id: string; nome: string } | null
  }
  periodo: {
    id: string
    nome: string
    dataInicio: string
    dataFim: string
    activo: boolean
  }
  // submissao singular — schema novo
  submissao?: {
    id: string
    comentarios?: string | null
    pontuacaoTotal?: number | null
    dataSubmissao: string
    updatedAt: string
    avaliador: { id: string; nomeCompleto: string; role: string }
    respostas: {
      id: string
      pontuacao: number
      observacao?: string | null
      criterio: { id: string; nome: string; peso: number }
    }[]
  } | null
  validacao?: {
    id: string
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
interface Departamento {
  id: string
  nome: string
}
interface Meta {
  total: number
  page: number
  limit: number
  totalPages: number
}
type SortKey = 'avaliado' | 'departamento' | 'periodo' | 'estado' | 'pontuacao'
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
async function safeFetch(url: string) {
  try {
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) {
      console.error(`[safeFetch] ${url} → ${res.status}`)
      return null
    }
    return res.json()
  } catch (e) {
    console.error(`[safeFetch]`, e)
    return null
  }
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

const estadoConfig: Record<string, { label: string; cls: string }> = {
  Pendente: {
    label: 'Pendente',
    cls: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  },
  AvaliadoPorChefe: {
    label: 'Av. p/ Chefe',
    cls: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  ValidadoPorDirector: {
    label: 'Validado',
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
}

function getSortValue(f: Ficha, key: SortKey): string | number {
  switch (key) {
    case 'avaliado':
      return f.avaliado.nomeCompleto ?? ''
    case 'departamento':
      return f.avaliado.departamento?.nome ?? ''
    case 'periodo':
      return f.periodo.nome ?? ''
    case 'estado':
      return estadoConfig[f.estado]?.label ?? f.estado
    case 'pontuacao':
      return f.pontuacaoFinal ?? -1
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

function PontuacaoBar({ valor }: { valor: number }) {
  const pct = Math.min(100, (valor / 5) * 100)
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
      <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden min-w-[50px]">
        <div
          className={`h-full rounded-full ${cor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-zinc-700 w-7 text-right shrink-0">
        {valor.toFixed(1)}
      </span>
    </div>
  )
}

// ── Download ficha PDF ────────────────────────────────────────
function DownloadFichaBtn({
  fichaId,
  mecanografico,
  periodoNome,
}: {
  fichaId: string
  mecanografico: string
  periodoNome: string
}) {
  const [loading, setLoading] = useState(false)
  const handleDownload = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/fichas/${fichaId}/pdf`, {
        credentials: 'include',
      })
      if (!res.ok) {
        toast.error('Não foi possível gerar o PDF.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ficha-${mecanografico}-${periodoNome.replace(/\s+/g, '-')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Erro ao gerar o PDF.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs font-semibold bg-zinc-950 hover:bg-zinc-800 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 shrink-0"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      {loading ? 'A gerar...' : 'Baixar PDF'}
    </button>
  )
}

// ── Página ────────────────────────────────────────────────────
export default function FichasPage() {
  const [fichas, setFichas] = useState<Ficha[]>([])
  const [meta, setMeta] = useState<Meta>({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('_all')
  const [filtroPeriodo, setFiltroPeriodo] = useState('_all')
  const [filtroDept, setFiltroDept] = useState('_all')
  const [page, setPage] = useState(1)
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
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
      if (filtroDept !== '_all') params.set('departamentoId', filtroDept)
      const data = await safeFetch(`/api/fichas?${params}`)
      setFichas(toArray<Ficha>(data))
      if (data?.meta) setMeta(data.meta)
    } catch {
      toast.error('Não foi possível carregar as fichas.')
    } finally {
      setLoading(false)
    }
  }, [page, filtroEstado, filtroPeriodo, filtroDept])

  useEffect(() => {
    fetchFichas()
  }, [fetchFichas])

  useEffect(() => {
    safeFetch('/api/periodos?limit=100').then((d) => setPeriodos(toArray(d)))
    safeFetch('/api/departamentos?limit=100').then((d) =>
      setDepartamentos(toArray(d)),
    )
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
      const data = await safeFetch(`/api/fichas/${f.id}`)
      setFichaDetalhe(data)
    } catch {
      toast.error('Não foi possível carregar o detalhe da ficha.')
    } finally {
      setLoadingSheet(false)
    }
  }

  const fichasFiltradas = sortFichas(
    search
      ? fichas.filter(
          (f) =>
            f.avaliado.nomeCompleto
              ?.toLowerCase()
              .includes(search.toLowerCase()) ||
            f.avaliado.email?.toLowerCase().includes(search.toLowerCase()),
        )
      : fichas,
    sort,
  )

  const validadas = fichas.filter(
    (f) => f.estado === 'ValidadoPorDirector',
  ).length
  const emProcesso = fichas.filter(
    (f) => f.estado === 'AvaliadoPorChefe',
  ).length
  const pendentes = fichas.filter((f) => f.estado === 'Pendente').length

  // Download disponível apenas quando ValidadoPorDirector
  const podeDownload = fichaDetalhe?.estado === 'ValidadoPorDirector'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            Fichas de Avaliação
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {meta.total} {meta.total === 1 ? 'ficha' : 'fichas'} registadas
          </p>
        </div>
        <ExportMenu tipo="fichas" />
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Total',
            value: meta.total,
            icon: <ClipboardList className="h-4 w-4" />,
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
            label: 'Av. Chefe',
            value: emProcesso,
            icon: <FileText className="h-4 w-4" />,
            bg: 'bg-purple-50 border-purple-200',
            color: 'text-purple-600',
          },
          {
            label: 'Pendentes',
            value: pendentes,
            icon: <FileText className="h-4 w-4" />,
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
                placeholder="Pesquisar nome ou email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 h-9 text-sm border-zinc-200 rounded-lg bg-zinc-50 focus:bg-white transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
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
                <SelectTrigger className="h-9 w-44 text-sm border-zinc-200 rounded-lg">
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
              <Select
                value={filtroDept}
                onValueChange={(v) => {
                  setFiltroDept(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-44 text-sm border-zinc-200 rounded-lg">
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
                <SortHeader
                  label="Técnico"
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
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100/80">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div
                          className={`h-3.5 bg-zinc-100 rounded-full animate-pulse ${j === 0 ? 'w-40' : 'w-20'}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : fichasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center">
                        <ClipboardList className="h-6 w-6 text-zinc-300" />
                      </div>
                      <p className="text-sm font-medium text-zinc-500">
                        Nenhuma ficha encontrada
                      </p>
                      <p className="text-xs text-zinc-400">
                        Ajuste os filtros para ver resultados
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                fichasFiltradas.map((f) => {
                  const est = estadoConfig[f.estado] ?? {
                    label: f.estado,
                    cls: 'bg-zinc-100 text-zinc-600 border-zinc-200',
                  }
                  return (
                    <tr
                      key={f.id}
                      onClick={() => abrirFicha(f)}
                      className="group hover:bg-zinc-50/60 transition-colors cursor-pointer"
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
                            <p className="font-medium text-zinc-900 truncate max-w-[150px] leading-tight">
                              {f.avaliado.nomeCompleto}
                            </p>
                            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                              {f.avaliado.departamento?.nome ?? '—'}
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
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${est.cls}`}
                        >
                          {est.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 min-w-[130px]">
                        {f.pontuacaoFinal != null ? (
                          <PontuacaoBar valor={f.pontuacaoFinal} />
                        ) : (
                          <span className="text-zinc-300 text-xs">—</span>
                        )}
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
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                  <ClipboardList className="h-4 w-4 text-zinc-500" />
                </div>
                <div className="min-w-0">
                  <SheetTitle className="text-base font-semibold text-zinc-900">
                    Ficha de Avaliação
                  </SheetTitle>
                  <SheetDescription className="text-[12px] text-zinc-500 mt-0.5 truncate">
                    {fichaDetalhe?.avaliado.nomeCompleto} ·{' '}
                    {fichaDetalhe?.periodo.nome}
                  </SheetDescription>
                </div>
              </div>
              {/* Botão download — apenas quando ValidadoPorDirector */}
              {podeDownload && fichaDetalhe && (
                <DownloadFichaBtn
                  fichaId={fichaDetalhe.id}
                  mecanografico={fichaDetalhe.avaliado.numeroMecanografico}
                  periodoNome={fichaDetalhe.periodo.nome}
                />
              )}
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
                {/* Avaliado */}
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
                  <Avatar className="h-10 w-10 shrink-0 ring-1 ring-zinc-200">
                    <AvatarImage src={fichaDetalhe.avaliado.avatarUrl} />
                    <AvatarFallback className="bg-zinc-200 text-zinc-600 text-xs font-semibold">
                      {getInitials(fichaDetalhe.avaliado.nomeCompleto)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-900">
                      {fichaDetalhe.avaliado.nomeCompleto}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {fichaDetalhe.avaliado.cargo} ·{' '}
                      {fichaDetalhe.avaliado.departamento?.nome ?? '—'}
                    </p>
                  </div>
                  {(() => {
                    const est = estadoConfig[fichaDetalhe.estado]
                    return est ? (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${est.cls}`}
                      >
                        {est.label}
                      </span>
                    ) : null
                  })()}
                </div>

                {/* Pontuação */}
                {fichaDetalhe.pontuacaoFinal != null && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                      <span className="text-lg font-bold text-emerald-700">
                        {fichaDetalhe.pontuacaoFinal.toFixed(1)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">
                        Pontuação Final
                      </p>
                      <p className="text-xs text-emerald-600 mt-0.5">
                        {fichaDetalhe.validacao?.aprovado
                          ? 'Aprovado'
                          : 'Registado'}{' '}
                        pelo Director
                        {fichaDetalhe.validacao
                          ? ` · ${formatDate(fichaDetalhe.validacao.dataValidacao)}`
                          : ''}
                      </p>
                    </div>
                  </div>
                )}

                {/* Avaliação do chefe — submissao singular */}
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-3">
                    Avaliação do chefe
                  </p>
                  {!fichaDetalhe.submissao ? (
                    <p className="text-sm text-zinc-400 text-center py-4">
                      Sem avaliação submetida ainda.
                    </p>
                  ) : (
                    <div className="rounded-xl border border-zinc-200 p-4 bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-zinc-500">
                          Por:{' '}
                          <span className="font-medium text-zinc-700">
                            {fichaDetalhe.submissao.avaliador.nomeCompleto}
                          </span>
                        </p>
                        <div className="flex items-center gap-2">
                          {fichaDetalhe.submissao.pontuacaoTotal != null && (
                            <span className="text-sm font-bold text-zinc-900">
                              {fichaDetalhe.submissao.pontuacaoTotal.toFixed(1)}
                              <span className="text-xs font-normal text-zinc-400">
                                {' '}
                                /5
                              </span>
                            </span>
                          )}
                          <span className="text-[11px] text-zinc-400">
                            {formatDate(fichaDetalhe.submissao.dataSubmissao)}
                          </span>
                        </div>
                      </div>
                      {fichaDetalhe.submissao.comentarios && (
                        <p className="text-xs text-zinc-600 italic border-l-2 border-zinc-200 pl-2.5">
                          "{fichaDetalhe.submissao.comentarios}"
                        </p>
                      )}
                      {(fichaDetalhe.submissao.respostas ?? []).length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {fichaDetalhe.submissao.respostas.map((r) => (
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
                  )}
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
