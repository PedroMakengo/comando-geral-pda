'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Info,
  AlertTriangle,
  Zap,
  SlidersHorizontal,
  X,
  ChevronDown,
  User,
  RefreshCw,
  Download,
  FileText,
  FileSpreadsheet,
  Loader2,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

// ── Tipos ─────────────────────────────────────────────────────
type LogNivel = 'Info' | 'Aviso' | 'Erro' | 'Critico'
type LogCategoria =
  | 'Autenticacao'
  | 'Utilizador'
  | 'Organizacao'
  | 'Criterio'
  | 'Avaliacao'
  | 'Validacao'
  | 'Periodo'
  | 'Sistema'

interface LogUtilizador {
  id: string
  nomeCompleto: string
  email: string
  role: string
  avatarUrl?: string
}
interface Log {
  id: string
  categoria: LogCategoria
  nivel: LogNivel
  accao: string
  descricao: string
  entidadeId?: string | null
  payload?: Record<string, unknown> | null
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: string
  utilizador?: LogUtilizador | null
}
interface Meta {
  total: number
  page: number
  limit: number
  totalPages: number
}

// ── Helpers ───────────────────────────────────────────────────
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
    month: '2-digit',
    year: 'numeric',
  })
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
function formatDateTime(iso: string) {
  return `${formatDate(iso)} ${formatTime(iso)}`
}

const nivelConfig: Record<
  LogNivel,
  { label: string; icon: React.ReactNode; dot: string; badge: string }
> = {
  Info: {
    label: 'Info',
    icon: <Info className="h-3.5 w-3.5" />,
    dot: 'bg-blue-400',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  Aviso: {
    label: 'Aviso',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    dot: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  Erro: {
    label: 'Erro',
    icon: <ShieldAlert className="h-3.5 w-3.5" />,
    dot: 'bg-red-400',
    badge: 'bg-red-50 text-red-700 border-red-200',
  },
  Critico: {
    label: 'Crítico',
    icon: <Zap className="h-3.5 w-3.5" />,
    dot: 'bg-red-600',
    badge: 'bg-red-100 text-red-800 border-red-300',
  },
}
const categoriaLabel: Record<LogCategoria, string> = {
  Autenticacao: 'Autenticação',
  Utilizador: 'Utilizador',
  Organizacao: 'Organização',
  Criterio: 'Critério',
  Avaliacao: 'Avaliação',
  Validacao: 'Validação',
  Periodo: 'Período',
  Sistema: 'Sistema',
}
const categoriaBadge: Record<LogCategoria, string> = {
  Autenticacao: 'bg-violet-50 text-violet-700 border-violet-200',
  Utilizador: 'bg-sky-50 text-sky-700 border-sky-200',
  Organizacao: 'bg-teal-50 text-teal-700 border-teal-200',
  Criterio: 'bg-orange-50 text-orange-700 border-orange-200',
  Avaliacao: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Validacao: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Periodo: 'bg-pink-50 text-pink-700 border-pink-200',
  Sistema: 'bg-zinc-100 text-zinc-600 border-zinc-200',
}
const EXPORT_COLS_LOGS = [
  {
    header: 'Data/Hora',
    value: (r: Log) => formatDateTime(r.createdAt),
    flex: 1.5,
  },
  {
    header: 'Nivel',
    value: (r: Log) => nivelConfig[r.nivel]?.label ?? r.nivel,
    flex: 0.9,
  },
  {
    header: 'Categoria',
    value: (r: Log) => categoriaLabel[r.categoria] ?? r.categoria,
    flex: 1.2,
  },
  { header: 'Accao', value: (r: Log) => r.accao, flex: 1.8 },
  { header: 'Descricao', value: (r: Log) => r.descricao, flex: 3 },
  {
    header: 'Utilizador',
    value: (r: Log) => r.utilizador?.nomeCompleto ?? 'Sistema',
    flex: 1.8,
  },
  { header: 'IP', value: (r: Log) => r.ipAddress ?? '-', flex: 1.2 },
]

// ── Export ────────────────────────────────────────────────────
interface ExportCol<T> {
  header: string
  value: (r: T) => string
  flex?: number
}
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
export default function AdminLogPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [meta, setMeta] = useState<Meta>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('_all')
  const [filtroNivel, setFiltroNivel] = useState('_all')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [page, setPage] = useState(1)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [logSelecionado, setLogSelecionado] = useState<Log | null>(null)
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)

  const fetchLogs = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      else setRefreshing(true)
      try {
        const params = new URLSearchParams()
        params.set('page', String(page))
        params.set('limit', '20')
        params.set('sortDir', 'desc')
        if (search) params.set('search', search)
        if (filtroCategoria !== '_all') params.set('categoria', filtroCategoria)
        if (filtroNivel !== '_all') params.set('nivel', filtroNivel)
        if (filtroDataInicio) params.set('dataInicio', filtroDataInicio)
        if (filtroDataFim) params.set('dataFim', filtroDataFim)
        const res = await fetch(`/api/logs?${params}`, {
          credentials: 'include',
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        setLogs(data.data ?? [])
        if (data.meta) setMeta(data.meta)
      } catch {
        toast.error('Não foi possível carregar os logs.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [
      page,
      search,
      filtroCategoria,
      filtroNivel,
      filtroDataInicio,
      filtroDataFim,
    ],
  )

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const filtrosActivos = [
    filtroCategoria !== '_all',
    filtroNivel !== '_all',
    !!filtroDataInicio,
    !!filtroDataFim,
  ].filter(Boolean).length
  const limparFiltros = () => {
    setFiltroCategoria('_all')
    setFiltroNivel('_all')
    setFiltroDataInicio('')
    setFiltroDataFim('')
    setSearchInput('')
    setPage(1)
  }

  // Mini stats
  const erros = logs.filter(
    (l) => l.nivel === 'Erro' || l.nivel === 'Critico',
  ).length
  const avisos = logs.filter((l) => l.nivel === 'Aviso').length
  const infos = logs.filter((l) => l.nivel === 'Info').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            Log de Operações
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {meta.total.toLocaleString('pt-PT')}{' '}
            {meta.total === 1 ? 'evento registado' : 'eventos registados'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportBtn
            data={logs}
            cols={EXPORT_COLS_LOGS}
            titulo="Log de Operacoes"
            filename="logs_sistema"
            disabled={loading}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-lg border-zinc-200 h-9"
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
            />{' '}
            Actualizar
          </Button>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Total',
            value: meta.total.toLocaleString('pt-PT'),
            icon: <Activity className="h-4 w-4" />,
            bg: 'bg-white border-zinc-200',
            color: 'text-zinc-500',
          },
          {
            label: 'Info',
            value: infos,
            icon: <Info className="h-4 w-4" />,
            bg: 'bg-blue-50 border-blue-200',
            color: 'text-blue-600',
          },
          {
            label: 'Avisos',
            value: avisos,
            icon: <AlertTriangle className="h-4 w-4" />,
            bg: 'bg-amber-50 border-amber-200',
            color: 'text-amber-600',
          },
          {
            label: 'Erros',
            value: erros,
            icon: <ShieldAlert className="h-4 w-4" />,
            bg:
              erros > 0
                ? 'bg-red-50 border-red-200'
                : 'bg-zinc-50 border-zinc-200',
            color: erros > 0 ? 'text-red-500' : 'text-zinc-400',
          },
        ].map((s, i) => (
          <Card key={i} className={`border shadow-none ${s.bg}`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                  {s.label}
                </p>
                <p
                  className={`font-bold text-zinc-900 mt-0.5 leading-none ${typeof s.value === 'string' ? 'text-xl' : 'text-2xl'}`}
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
      <Card className="border-zinc-200 shadow-none overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-wrap gap-3 p-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Pesquisar descrição..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 h-9 text-sm border-zinc-200 rounded-lg bg-zinc-50 focus:bg-white transition-colors"
              />
            </div>
            <Select
              value={filtroCategoria}
              onValueChange={(v) => {
                setFiltroCategoria(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-9 w-44 text-sm border-zinc-200 rounded-lg">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todas as categorias</SelectItem>
                {(Object.keys(categoriaLabel) as LogCategoria[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {categoriaLabel[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filtroNivel}
              onValueChange={(v) => {
                setFiltroNivel(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-9 w-36 text-sm border-zinc-200 rounded-lg">
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos os níveis</SelectItem>
                {(['Info', 'Aviso', 'Erro', 'Critico'] as LogNivel[]).map(
                  (n) => (
                    <SelectItem key={n} value={n}>
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${nivelConfig[n].dot}`}
                        />
                        {nivelConfig[n].label}
                      </span>
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            <button
              onClick={() => setFiltrosAbertos((v) => !v)}
              className={`flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm transition-all ${filtrosActivos > 0 || filtrosAbertos ? 'border-zinc-900 bg-zinc-950 text-white shadow-sm' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'}`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Datas
              {filtrosActivos > 0 && (
                <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-zinc-900">
                  {filtrosActivos}
                </span>
              )}
              <ChevronDown
                className={`h-3 w-3 transition-transform ${filtrosAbertos ? 'rotate-180' : ''}`}
              />
            </button>
            {(filtrosActivos > 0 || searchInput) && (
              <button
                onClick={limparFiltros}
                className="flex items-center gap-1 h-9 px-2.5 text-xs text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Limpar
              </button>
            )}
          </div>
          {filtrosAbertos && (
            <div className="px-4 py-4 flex flex-wrap gap-4 bg-zinc-50 border-t border-zinc-100">
              {[
                {
                  label: 'Data início',
                  value: filtroDataInicio,
                  set: setFiltroDataInicio,
                },
                {
                  label: 'Data fim',
                  value: filtroDataFim,
                  set: setFiltroDataFim,
                },
              ].map((f) => (
                <div key={f.label} className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em]">
                    {f.label}
                  </label>
                  <input
                    type="date"
                    value={f.value}
                    onChange={(e) => {
                      f.set(e.target.value)
                      setPage(1)
                    }}
                    className="h-9 px-3 text-sm rounded-lg border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80">
                {[
                  'Data / Hora',
                  'Nível',
                  'Categoria',
                  'Acção',
                  'Descrição',
                  'Utilizador',
                ].map((h) => (
                  <th
                    key={h}
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
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div
                          className={`h-3.5 bg-zinc-100 rounded-full animate-pulse ${j === 0 ? 'w-28' : 'w-20'}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center">
                        <Activity className="h-6 w-6 text-zinc-300" />
                      </div>
                      <p className="text-sm font-medium text-zinc-500">
                        Nenhum evento encontrado
                      </p>
                      <p className="text-xs text-zinc-400">
                        Ajuste os filtros para ver mais resultados
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const nConf = nivelConfig[log.nivel]
                  return (
                    <tr
                      key={log.id}
                      onClick={() => {
                        setLogSelecionado(log)
                        setSheetOpen(true)
                      }}
                      className="group hover:bg-zinc-50/60 transition-colors duration-100 cursor-pointer"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs font-semibold text-zinc-700">
                          {formatDate(log.createdAt)}
                        </p>
                        <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                          {formatTime(log.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${nConf.badge}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${nConf.dot}`}
                          />
                          {nConf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${categoriaBadge[log.categoria]}`}
                        >
                          {categoriaLabel[log.categoria]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-[11px] font-mono bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md">
                          {log.accao}
                        </code>
                      </td>
                      <td className="px-4 py-3 max-w-[260px]">
                        <p className="text-xs text-zinc-600 truncate">
                          {log.descricao}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {log.utilizador ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 shrink-0 ring-1 ring-zinc-200">
                              <AvatarImage src={log.utilizador.avatarUrl} />
                              <AvatarFallback className="bg-zinc-100 text-zinc-600 text-[10px] font-semibold">
                                {getInitials(log.utilizador.nomeCompleto)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-zinc-700 truncate max-w-[100px]">
                                {log.utilizador.nomeCompleto}
                              </p>
                              <p className="text-[10px] text-zinc-400">
                                {log.utilizador.role}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded-md">
                            <User className="h-3 w-3" /> Sistema
                          </span>
                        )}
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
              de{' '}
              <span className="font-medium text-zinc-600">
                {meta.total.toLocaleString('pt-PT')}
              </span>
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
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
          <SheetHeader className="px-6 py-5 border-b border-zinc-100 shrink-0">
            {logSelecionado && (
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${nivelConfig[logSelecionado.nivel].badge}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${nivelConfig[logSelecionado.nivel].dot}`}
                  />
                  {nivelConfig[logSelecionado.nivel].label}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${categoriaBadge[logSelecionado.categoria]}`}
                >
                  {categoriaLabel[logSelecionado.categoria]}
                </span>
              </div>
            )}
            <SheetTitle className="text-base font-semibold font-mono text-zinc-900">
              {logSelecionado?.accao}
            </SheetTitle>
            <SheetDescription className="text-[12px] text-zinc-500 mt-0.5 font-sans">
              {logSelecionado?.descricao}
            </SheetDescription>
          </SheetHeader>
          {logSelecionado && (
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-[0.12em] font-bold mb-1.5">
                    Data e Hora
                  </p>
                  <p className="text-xs font-semibold text-zinc-800">
                    {formatDateTime(logSelecionado.createdAt)}
                  </p>
                </div>
                {logSelecionado.entidadeId && (
                  <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-[0.12em] font-bold mb-1.5">
                      ID Entidade
                    </p>
                    <p className="text-[11px] font-mono text-zinc-600 break-all">
                      {logSelecionado.entidadeId}
                    </p>
                  </div>
                )}
              </div>
              <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3.5">
                <p className="text-[10px] text-zinc-400 uppercase tracking-[0.12em] font-bold mb-2.5">
                  Executado por
                </p>
                {logSelecionado.utilizador ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 shrink-0 ring-1 ring-zinc-200">
                      <AvatarImage src={logSelecionado.utilizador.avatarUrl} />
                      <AvatarFallback className="bg-zinc-200 text-zinc-600 text-xs font-semibold">
                        {getInitials(logSelecionado.utilizador.nomeCompleto)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {logSelecionado.utilizador.nomeCompleto}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {logSelecionado.utilizador.email} ·{' '}
                        {logSelecionado.utilizador.role}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-zinc-300" /> Sistema
                    (automático)
                  </p>
                )}
              </div>
              {(logSelecionado.ipAddress || logSelecionado.userAgent) && (
                <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3.5 space-y-2.5">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-[0.12em] font-bold">
                    Contexto Técnico
                  </p>
                  {logSelecionado.ipAddress && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">IP</span>
                      <code className="text-[11px] font-mono bg-white border border-zinc-200 px-2 py-0.5 rounded-md text-zinc-700">
                        {logSelecionado.ipAddress}
                      </code>
                    </div>
                  )}
                  {logSelecionado.userAgent && (
                    <div>
                      <span className="text-xs text-zinc-500">User Agent</span>
                      <p className="text-[11px] text-zinc-500 mt-0.5 break-all leading-relaxed">
                        {logSelecionado.userAgent}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {logSelecionado.payload && (
                <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-[0.12em] font-bold mb-2.5">
                    Payload (JSON)
                  </p>
                  <pre className="text-[11px] font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                    {JSON.stringify(logSelecionado.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
