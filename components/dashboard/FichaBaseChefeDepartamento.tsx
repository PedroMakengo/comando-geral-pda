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
  Loader2,
  RotateCcw,
  Download,
  FileText,
  FileSpreadsheet,
  Filter,
  ClipboardList,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
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
interface AuthUser {
  id: string
  departamento?: { id: string; nome: string } | null
}
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
      criterio: { id: string; nome: string; peso: number }
    }[]
  }[]
  reavaliacao?: {
    id: string
    motivacao?: string | null
    concluida: boolean
    dataIndicacao: string
    reavaliador: { id: string; nomeCompleto: string }
    indicadoPor: { id: string; nomeCompleto: string }
  } | null
  validacao?: {
    id: string
    aprovado: boolean
    comentarios?: string | null
    dataValidacao: string
    director: { id: string; nomeCompleto: string }
  } | null
}
interface Utilizador {
  id: string
  nomeCompleto: string
  cargo: string
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
type FichaSortKey = 'avaliado' | 'periodo' | 'estado' | 'metrica' | 'data'
type SortDir = 'asc' | 'desc'

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
const estadoOrder: Record<string, number> = {
  Pendente: 0,
  AutoAvaliacao: 1,
  AvaliadoPorChefe: 2,
  EmReavaliacao: 3,
  Reavaliado: 4,
  ValidadoPorDirector: 5,
}
const tipoLabel: Record<string, string> = {
  AutoAvaliacao: 'Auto-avaliação',
  AvaliacaoChefe: 'Avaliação do Chefe',
  Reavaliacao: 'Reavaliação',
}

const EXPORT_COLS = [
  {
    header: 'Tecnico',
    value: (r: Ficha) => r.avaliado.nomeCompleto,
    flex: 2.2,
  },
  { header: 'Cargo', value: (r: Ficha) => r.avaliado.cargo, flex: 1.8 },
  {
    header: 'Departamento',
    value: (r: Ficha) => r.avaliado.departamento?.nome ?? '-',
    flex: 1.8,
  },
  { header: 'Periodo', value: (r: Ficha) => r.periodo.nome, flex: 1.8 },
  {
    header: 'Estado',
    value: (r: Ficha) => estadoConfig[r.estado]?.label ?? r.estado,
    flex: 1.5,
  },
  {
    header: 'Pontuacao',
    value: (r: Ficha) =>
      r.pontuacaoFinal != null ? r.pontuacaoFinal.toFixed(2) : '-',
    flex: 1,
  },
  {
    header: 'Submissoes',
    value: (r: Ficha) => String(r._count?.submissoes ?? 0),
    flex: 1,
  },
  { header: 'Data', value: (r: Ficha) => formatDate(r.createdAt), flex: 1.2 },
]

function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((me) => {
        if (me?.id) setUser(me)
      })
      .finally(() => setReady(true))
  }, [])
  return { user, ready }
}

// ── Export ────────────────────────────────────────────────────
function ExportBtn<T>({
  data,
  cols,
  titulo,
  filename,
  disabled,
}: {
  data: T[]
  cols: { header: string; value: (r: T) => string; flex?: number }[]
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
          className="gap-2.5 text-sm cursor-pointer"
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
          className="gap-2.5 text-sm cursor-pointer"
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

// ── Sort ──────────────────────────────────────────────────────
function SortHeader<K extends string>({
  label,
  sortKey,
  sortState,
  onSort,
}: {
  label: string
  sortKey: K
  sortState: { key: K | null; direction: SortDir }
  onSort: (k: K) => void
}) {
  const active = sortState.key === sortKey
  return (
    <th className="text-left px-4 py-3 font-medium text-zinc-400 text-[11px] uppercase tracking-wider">
      <button
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 hover:text-zinc-700 transition-colors group select-none"
      >
        {label}
        <span className="flex flex-col gap-[1px] ml-0.5">
          <ChevronUp
            className={`h-2.5 w-2.5 ${active && sortState.direction === 'asc' ? 'text-zinc-800' : 'text-zinc-300 group-hover:text-zinc-400'}`}
          />
          <ChevronDown
            className={`h-2.5 w-2.5 ${active && sortState.direction === 'desc' ? 'text-zinc-800' : 'text-zinc-300 group-hover:text-zinc-400'}`}
          />
        </span>
      </button>
    </th>
  )
}
function getSortValue(f: Ficha, key: FichaSortKey): string | number {
  switch (key) {
    case 'avaliado':
      return f.avaliado.nomeCompleto
    case 'periodo':
      return f.periodo.nome
    case 'estado':
      return estadoOrder[f.estado] ?? 99
    case 'metrica':
      return f.pontuacaoFinal ?? f._count?.submissoes ?? 0
    case 'data':
      return f.createdAt
    default:
      return ''
  }
}
function sortFichas(
  list: Ficha[],
  sort: { key: FichaSortKey | null; direction: SortDir },
): Ficha[] {
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
      <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden min-w-[60px]">
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

// ── ValidacaoBlock ────────────────────────────────────────────
function ValidacaoBlock({
  validacao,
}: {
  validacao: NonNullable<FichaDetalhe['validacao']>
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${validacao.aprovado ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.12em]">
          Validação do Director
        </p>
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${validacao.aprovado ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
        >
          {validacao.aprovado ? (
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
        className={`text-sm font-semibold ${validacao.aprovado ? 'text-emerald-800' : 'text-red-800'}`}
      >
        {validacao.director.nomeCompleto}
      </p>
      <p
        className={`text-xs mt-0.5 ${validacao.aprovado ? 'text-emerald-600' : 'text-red-500'}`}
      >
        {formatDate(validacao.dataValidacao)}
      </p>
      {validacao.comentarios && (
        <p
          className={`text-xs mt-2 italic border-l-2 pl-2.5 ${validacao.aprovado ? 'border-emerald-300 text-emerald-700' : 'border-red-300 text-red-700'}`}
        >
          "{validacao.comentarios}"
        </p>
      )}
    </div>
  )
}

// ── Sheet detalhe ─────────────────────────────────────────────
function FichaDetalheSheet({
  open,
  onOpenChange,
  fichaDetalhe,
  loadingSheet,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  fichaDetalhe: FichaDetalhe | null
  loadingSheet: boolean
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0 overflow-hidden">
        <SheetHeader className="px-6 py-5 border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
              <ClipboardList className="h-4 w-4 text-zinc-500" />
            </div>
            <div>
              <SheetTitle className="text-base font-semibold text-zinc-900">
                Ficha de Avaliação
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
                  const e = estadoConfig[fichaDetalhe.estado]
                  return e ? (
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${e.class}`}
                    >
                      {e.label}
                    </span>
                  ) : null
                })()}
              </div>
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
                      Validado pelo Director
                    </p>
                  </div>
                </div>
              )}
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
                      <p className="text-xs text-zinc-500 mb-2">
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
              {fichaDetalhe.reavaliacao && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-[0.12em]">
                      Reavaliação
                    </p>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${fichaDetalhe.reavaliacao.concluida ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                    >
                      {fichaDetalhe.reavaliacao.concluida
                        ? 'Concluída'
                        : 'Pendente'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-amber-800">
                    Reavaliador:{' '}
                    {fichaDetalhe.reavaliacao.reavaliador.nomeCompleto}
                  </p>
                  {fichaDetalhe.reavaliacao.motivacao && (
                    <p className="text-xs text-amber-700 mt-1 italic">
                      "{fichaDetalhe.reavaliacao.motivacao}"
                    </p>
                  )}
                </div>
              )}
              {fichaDetalhe.validacao && (
                <ValidacaoBlock validacao={fichaDetalhe.validacao} />
              )}
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── FichasBaseChefeDepartamento ───────────────────────────────
export function FichasBaseChefeDepartamento({
  modo,
}: {
  modo: 'fichas' | 'historico'
}) {
  const { user, ready } = useAuthUser()
  const [fichas, setFichas] = useState<Ficha[]>([])
  const [meta, setMeta] = useState<Meta>({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState(
    modo === 'historico' ? 'ValidadoPorDirector' : '_all',
  )
  const [filtroPeriodo, setFiltroPeriodo] = useState('_all')
  const [page, setPage] = useState(1)
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [tecnicos, setTecnicos] = useState<Utilizador[]>([])
  const [sort, setSort] = useState<{
    key: FichaSortKey | null
    direction: SortDir
  }>({ key: null, direction: 'asc' })
  const [sheetOpen, setSheetOpen] = useState(false)
  const [fichaDetalhe, setFichaDetalhe] = useState<FichaDetalhe | null>(null)
  const [loadingSheet, setLoadingSheet] = useState(false)
  const [sheetReav, setSheetReav] = useState(false)
  const [fichaParaReav, setFichaParaReav] = useState<Ficha | null>(null)
  const [reavaliadorId, setReavaliadorId] = useState('')
  const [motivacaoReav, setMotivacaoReav] = useState('')
  const [submittingReav, setSubmittingReav] = useState(false)

  useEffect(() => {
    fetch('/api/periodos?limit=100', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setPeriodos(toArray(d)))
  }, [])
  useEffect(() => {
    if (!user?.departamento?.id) return
    fetch(
      `/api/utilizadores?departamentoId=${user.departamento.id}&limit=100`,
      { credentials: 'include' },
    )
      .then((r) => r.json())
      .then((d) => {
        setTecnicos(toArray<Utilizador>(d).filter((t) => t.id !== user.id))
      })
  }, [user])

  const fetchFichas = useCallback(async () => {
    if (!user?.departamento?.id) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '15')
      params.set('departamentoId', user.departamento.id)
      if (filtroEstado !== '_all') params.set('estado', filtroEstado)
      if (filtroPeriodo !== '_all') params.set('periodoId', filtroPeriodo)
      const res = await fetch(`/api/fichas?${params}`, {
        credentials: 'include',
      })
      const data = await res.json()
      const todas: Ficha[] = toArray(data)
      setFichas(todas.filter((f) => f.avaliado.id !== user.id))
      if (data.meta) setMeta(data.meta)
    } catch {
      toast.error('Erro ao carregar fichas.')
    } finally {
      setLoading(false)
    }
  }, [user, page, filtroEstado, filtroPeriodo])

  useEffect(() => {
    if (ready) fetchFichas()
  }, [fetchFichas, ready])
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const handleSort = (key: FichaSortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )

  const abrirFicha = async (f: Ficha) => {
    setSheetOpen(true)
    setFichaDetalhe(null)
    setLoadingSheet(true)
    try {
      setFichaDetalhe(
        await fetch(`/api/fichas/${f.id}`, { credentials: 'include' }).then(
          (r) => r.json(),
        ),
      )
    } catch {
      toast.error('Erro ao carregar detalhe.')
    } finally {
      setLoadingSheet(false)
    }
  }

  const submeterReavaliacao = async () => {
    if (!fichaParaReav || !reavaliadorId) {
      toast.error('Seleccione um reavaliador.')
      return
    }
    setSubmittingReav(true)
    try {
      const res = await fetch('/api/reavaliacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fichaId: fichaParaReav.id,
          reavaliadorId,
          motivacao: motivacaoReav.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Erro.')
        return
      }
      toast.success('Reavaliação indicada com sucesso!')
      setSheetReav(false)
      setReavaliadorId('')
      setMotivacaoReav('')
      fetchFichas()
    } finally {
      setSubmittingReav(false)
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
  const paraAvaliar = fichas.filter((f) => f.estado === 'AutoAvaliacao').length
  const emReav = fichas.filter((f) => f.estado === 'EmReavaliacao').length

  const titulos = {
    fichas: {
      h1: 'Fichas de Avaliação',
      sub: user?.departamento ? `Departamento: ${user.departamento.nome}` : '—',
    },
    historico: {
      h1: 'Histórico',
      sub: `${meta.total} avaliação${meta.total !== 1 ? 'ões' : ''} concluída${meta.total !== 1 ? 's' : ''}`,
    },
  }

  if (!ready)
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-zinc-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  if (!user?.departamento?.id)
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-14 text-center">
        <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
          <ClipboardList className="h-6 w-6 text-zinc-300" />
        </div>
        <p className="text-sm font-semibold text-zinc-600">
          Sem departamento associado
        </p>
        <p className="text-xs text-zinc-400 mt-1">
          Contacte o administrador para associar o seu departamento.
        </p>
      </div>
    )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            {titulos[modo].h1}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">{titulos[modo].sub}</p>
        </div>
        <ExportBtn
          data={fichasFiltradas}
          cols={EXPORT_COLS}
          titulo={
            modo === 'historico'
              ? 'Historico do Departamento'
              : 'Fichas do Departamento'
          }
          filename={modo === 'historico' ? 'historico_dept' : 'fichas_dept'}
          disabled={loading}
        />
      </div>

      {/* Mini stats */}
      {modo === 'fichas' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Total',
              value: fichas.length,
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
              label: 'Para avaliar',
              value: paraAvaliar,
              icon: <ClipboardList className="h-4 w-4" />,
              bg:
                paraAvaliar > 0
                  ? 'bg-purple-50 border-purple-200'
                  : 'bg-zinc-50 border-zinc-200',
              color: paraAvaliar > 0 ? 'text-purple-600' : 'text-zinc-400',
            },
            {
              label: 'Em Reavaliação',
              value: emReav,
              icon: <RotateCcw className="h-4 w-4" />,
              bg:
                emReav > 0
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-zinc-50 border-zinc-200',
              color: emReav > 0 ? 'text-amber-600' : 'text-zinc-400',
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
      )}

      {/* Filtros */}
      <Card className="border-zinc-200 shadow-none">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Pesquisar técnico..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 h-9 text-sm border-zinc-200 rounded-lg bg-zinc-50 focus:bg-white transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              {modo !== 'historico' && (
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
              )}
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
                  label="Técnico"
                  sortKey="avaliado"
                  sortState={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Período"
                  sortKey="periodo"
                  sortState={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Estado"
                  sortKey="estado"
                  sortState={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label={modo === 'historico' ? 'Pontuação' : 'Submissões'}
                  sortKey="metrica"
                  sortState={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Data"
                  sortKey="data"
                  sortState={sort}
                  onSort={handleSort}
                />
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100/80">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div
                          className={`h-3.5 bg-zinc-100 rounded-full animate-pulse ${j === 0 ? 'w-36' : 'w-20'}`}
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
                        <ClipboardList className="h-6 w-6 text-zinc-300" />
                      </div>
                      <p className="text-sm font-medium text-zinc-500">
                        Nenhuma ficha encontrada no departamento
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
                      className="group hover:bg-zinc-50/60 transition-colors duration-100"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 shrink-0 ring-1 ring-zinc-200/80">
                            <AvatarImage src={f.avaliado.avatarUrl} />
                            <AvatarFallback className="bg-zinc-100 text-zinc-600 text-[11px] font-semibold">
                              {getInitials(f.avaliado.nomeCompleto)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-zinc-900 truncate max-w-[130px] leading-tight">
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
                      <td className="px-4 py-3 min-w-[110px]">
                        {modo === 'historico' && f.pontuacaoFinal != null ? (
                          <PontuacaoBar valor={f.pontuacaoFinal} />
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${(f._count?.submissoes ?? 0) > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-zinc-50 text-zinc-400 border border-zinc-100'}`}
                          >
                            {f._count?.submissoes ?? 0}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-zinc-400">
                        {formatDate(f.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {f.estado === 'AvaliadoPorChefe' && (
                            <button
                              onClick={() => {
                                setFichaParaReav(f)
                                setReavaliadorId('')
                                setMotivacaoReav('')
                                setSheetReav(true)
                              }}
                              title="Indicar reavaliação"
                              className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-300 hover:text-amber-500 hover:bg-amber-50 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => abrirFicha(f)}
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
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

      <FichaDetalheSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        fichaDetalhe={fichaDetalhe}
        loadingSheet={loadingSheet}
      />

      {/* Sheet reavaliação */}
      <Sheet open={sheetReav} onOpenChange={setSheetReav}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
          <SheetHeader className="px-6 py-5 border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <RotateCcw className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <SheetTitle className="text-base font-semibold text-zinc-900">
                  Indicar Reavaliação
                </SheetTitle>
                <SheetDescription className="text-[12px] text-zinc-500 mt-0.5">
                  {fichaParaReav?.avaliado.nomeCompleto} ·{' '}
                  {fichaParaReav?.periodo.nome}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
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
                    .filter((t) => t.id !== fichaParaReav?.avaliado.id)
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nomeCompleto} · {t.cargo}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-zinc-400">
                Apenas técnicos do departamento. O avaliado está excluído.
              </p>
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-zinc-700">
                Motivação{' '}
                <span className="text-zinc-400 font-normal">(opcional)</span>
              </Label>
              <Textarea
                value={motivacaoReav}
                onChange={(e) => setMotivacaoReav(e.target.value)}
                placeholder="Motivo da reavaliação..."
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
              onClick={() => setSheetReav(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={submeterReavaliacao}
              disabled={submittingReav || !reavaliadorId}
              className="flex-1 h-9 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium shadow-sm"
            >
              {submittingReav ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Indicar
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
