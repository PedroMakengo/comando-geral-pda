'use client'

import { useEffect, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Eye,
  FileText,
  CheckCircle2,
  ClipboardList,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

// ── Tipos ─────────────────────────────────────────────────────
interface AuthUser {
  id: string
  nomeCompleto: string
}
interface Ficha {
  id: string
  estado: string
  pontuacaoFinal?: number | null
  createdAt: string
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
  reavaliacao?: {
    concluida: boolean
    reavaliador: { nomeCompleto: string }
  } | null
  validacao?: {
    aprovado: boolean
    comentarios?: string | null
    dataValidacao: string
    director: { nomeCompleto: string }
  } | null
}
interface Meta {
  total: number
  page: number
  limit: number
  totalPages: number
}
type SortKey = 'periodo' | 'estado' | 'submissoes' | 'pontuacao' | 'data'
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
const estadoOrder: Record<string, number> = {
  Pendente: 0,
  AutoAvaliacao: 1,
  AvaliadoPorChefe: 2,
  EmReavaliacao: 3,
  Reavaliado: 4,
  ValidadoPorDirector: 5,
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
function getSortValue(f: Ficha, key: SortKey): string | number {
  switch (key) {
    case 'periodo':
      return f.periodo.nome
    case 'estado':
      return estadoOrder[f.estado] ?? 99
    case 'submissoes':
      return f._count?.submissoes ?? 0
    case 'pontuacao':
      return f.pontuacaoFinal ?? -1
    case 'data':
      return f.createdAt
    default:
      return ''
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

// ── Componente partilhado (Fichas + Histórico) ────────────────
export function FichasBase({ modo }: { modo: 'fichas' | 'historico' }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [fichas, setFichas] = useState<Ficha[]>([])
  const [meta, setMeta] = useState<Meta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<SortState>({ key: null, direction: 'asc' })
  const [sheetOpen, setSheetOpen] = useState(false)
  const [fichaDetalhe, setFichaDetalhe] = useState<FichaDetalhe | null>(null)
  const [loadingSheet, setLoadingSheet] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((me) => {
        if (me.id) setUser(me)
      })
  }, [])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const params = new URLSearchParams()
    params.set('avaliadoId', user.id)
    params.set('page', String(page))
    params.set('limit', '10')
    if (modo === 'historico') params.set('estado', 'ValidadoPorDirector')
    fetch(`/api/fichas?${params}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        setFichas(toArray<Ficha>(data))
        if (data.meta) setMeta(data.meta)
      })
      .catch(() => toast.error('Não foi possível carregar as fichas.'))
      .finally(() => setLoading(false))
  }, [user, page, modo])

  const handleSort = (key: SortKey) =>
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
      toast.error('Não foi possível carregar o detalhe.')
    } finally {
      setLoadingSheet(false)
    }
  }

  const fichasOrdenadas = sortFichas(fichas, sort)

  // Mini stats (só fichas, não historico)
  const validadas = fichas.filter(
    (f) => f.estado === 'ValidadoPorDirector',
  ).length
  const comNota = fichas.filter((f) => f.pontuacaoFinal != null)
  const media =
    comNota.length > 0
      ? comNota.reduce((s, f) => s + f.pontuacaoFinal!, 0) / comNota.length
      : null

  const titulo = modo === 'fichas' ? 'Minhas Fichas' : 'Histórico de Avaliações'
  const subtitulo =
    modo === 'fichas'
      ? `${meta.total} ficha${meta.total !== 1 ? 's' : ''} de avaliação`
      : `${meta.total} avaliação${meta.total !== 1 ? 'ões' : ''} concluída${meta.total !== 1 ? 's' : ''}`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
          {titulo}
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">{subtitulo}</p>
      </div>

      {/* Mini stats */}
      {modo === 'fichas' && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: 'Total',
              value: meta.total,
              icon: <ClipboardList className="h-4 w-4" />,
              bg: 'bg-white border-zinc-200',
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
              value: media != null ? `${media.toFixed(1)} / 5` : '—',
              icon: <FileText className="h-4 w-4" />,
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
      )}

      {/* Tabela */}
      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80">
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
                  label={modo === 'historico' ? 'Pontuação' : 'Submissões'}
                  sortKey={modo === 'historico' ? 'pontuacao' : 'submissoes'}
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
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div
                          className={`h-3.5 bg-zinc-100 rounded-full animate-pulse ${j === 0 ? 'w-36' : 'w-20'}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : fichasOrdenadas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-zinc-300" />
                      </div>
                      <p className="text-sm font-medium text-zinc-500">
                        {modo === 'historico'
                          ? 'Sem avaliações concluídas ainda.'
                          : 'Sem fichas de avaliação ainda.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                fichasOrdenadas.map((f) => {
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
                        <p className="font-semibold text-zinc-900 leading-tight">
                          {f.periodo.nome}
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {formatDate(f.periodo.dataInicio)} →{' '}
                          {formatDate(f.periodo.dataFim)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${est.class}`}
                        >
                          {est.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 min-w-[120px]">
                        {modo === 'historico' ? (
                          f.pontuacaoFinal != null ? (
                            <PontuacaoBar valor={f.pontuacaoFinal} />
                          ) : (
                            <span className="text-zinc-300 text-xs">—</span>
                          )
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
                <FileText className="h-4 w-4 text-zinc-500" />
              </div>
              <div>
                <SheetTitle className="text-base font-semibold text-zinc-900">
                  Detalhe da Ficha
                </SheetTitle>
                <SheetDescription className="text-[12px] text-zinc-500 mt-0.5">
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
                {/* Estado + data */}
                <div className="flex items-center gap-2.5">
                  {(() => {
                    const est = estadoConfig[fichaDetalhe.estado]
                    return est ? (
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${est.class}`}
                      >
                        {est.label}
                      </span>
                    ) : null
                  })()}
                  <span className="text-xs text-zinc-400">
                    {formatDate(fichaDetalhe.createdAt)}
                  </span>
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
                        Validado pelo Director
                      </p>
                    </div>
                  </div>
                )}

                {/* Submissões */}
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-3">
                    Submissões ({fichaDetalhe.submissoes.length})
                  </p>
                  {fichaDetalhe.submissoes.length === 0 ? (
                    <p className="text-sm text-zinc-400">
                      Sem submissões ainda.
                    </p>
                  ) : (
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
                                  <span className="text-zinc-500 truncate max-w-[200px]">
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
                  )}
                </div>

                {/* Reavaliação */}
                {fichaDetalhe.reavaliacao && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
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
                    <p className="text-sm font-medium text-amber-800">
                      Reavaliador:{' '}
                      {fichaDetalhe.reavaliacao.reavaliador.nomeCompleto}
                    </p>
                  </div>
                )}

                {/* Validação */}
                {fichaDetalhe.validacao && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.12em] mb-1.5">
                      Validação do Director
                    </p>
                    <p className="text-sm font-semibold text-emerald-800">
                      {fichaDetalhe.validacao.director.nomeCompleto}
                    </p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      {formatDate(fichaDetalhe.validacao.dataValidacao)}
                    </p>
                    {fichaDetalhe.validacao.comentarios && (
                      <p className="text-xs text-emerald-700 mt-2 italic border-l-2 border-emerald-300 pl-2.5">
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
