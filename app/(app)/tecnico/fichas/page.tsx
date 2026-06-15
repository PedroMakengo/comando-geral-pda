'use client'

import { useEffect, useState } from 'react'
import {
  CalendarX,
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  Star,
  ChevronDown,
  ChevronUp,
  Printer,
} from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────
interface CriterioResposta {
  id: string
  pontuacao: number
  observacao?: string | null
  criterio: {
    id: string
    nome: string
    peso: number
    descricao?: string | null
  }
}
interface Submissao {
  id: string
  comentarios?: string | null
  pontuacaoTotal?: number | null
  dataSubmissao: string
  avaliador: { id: string; nomeCompleto: string }
  respostas: CriterioResposta[]
}
interface Validacao {
  aprovado: boolean
  comentarios?: string | null
  dataValidacao: string
  director: { id: string; nomeCompleto: string }
}
interface Ficha {
  id: string
  estado: string
  pontuacaoFinal?: number | null
  createdAt: string
  periodo: {
    id: string
    nome: string
    dataInicio: string
    dataFim: string
    activo: boolean
  }
  submissao?: Submissao | null
  validacao?: Validacao | null
}

// ── Helpers ───────────────────────────────────────────────────
function toArray<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res
  if (res && typeof res === 'object' && Array.isArray((res as any).data))
    return (res as any).data
  return []
}
async function safeFetch(url: string): Promise<{ ok: boolean; data: unknown }> {
  try {
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) {
      console.error(`[safeFetch] ${url} → ${res.status}`, await res.text())
      return { ok: false, data: null }
    }
    return { ok: true, data: await res.json() }
  } catch (e) {
    console.error(`[safeFetch] ${url} →`, e)
    return { ok: false, data: null }
  }
}
function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-zinc-100 rounded-md animate-pulse ${className}`} />
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-AO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const estadoConfig: Record<
  string,
  { label: string; color: string; dot: string }
> = {
  Pendente: {
    label: 'Aguarda avaliação do chefe',
    color: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    dot: 'bg-zinc-400',
  },
  AvaliadoPorChefe: {
    label: 'Avaliado · Aguarda validação',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  ValidadoPorDirector: {
    label: 'Validado pelo Director',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
}

// ── Botão imprimir ────────────────────────────────────────────
function PrintButton({ fichaId }: { fichaId: string }) {
  const [loading, setLoading] = useState(false)

  const handlePrint = async () => {
    setLoading(true)
    try {
      // Abre a rota HTML numa nova janela — o utilizador usa Ctrl+P ou o botão na página
      window.open(`/api/fichas/${fichaId}/pdf`, '_blank')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 border border-zinc-200 bg-white hover:bg-zinc-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      <Printer className="h-3.5 w-3.5" />
      {loading ? 'A abrir...' : 'Imprimir ficha'}
    </button>
  )
}

// ── Card de uma ficha ─────────────────────────────────────────
function FichaCard({ ficha }: { ficha: Ficha }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = estadoConfig[ficha.estado] ?? estadoConfig['Pendente']

  // Só permite imprimir se já foi avaliada
  const podeImprimir = ficha.estado !== 'Pendente'

  return (
    <div className="rounded-md border border-zinc-200 bg-white overflow-hidden">
      {/* Cabeçalho */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-zinc-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900 truncate">
              {ficha.periodo.nome}
            </span>
            {ficha.periodo.activo && (
              <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full shrink-0">
                Activo
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            {formatDate(ficha.periodo.dataInicio)} –{' '}
            {formatDate(ficha.periodo.dataFim)}
          </p>
        </div>

        {ficha.pontuacaoFinal != null && (
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-lg font-bold text-zinc-900">
              {ficha.pontuacaoFinal.toFixed(1)}
            </span>
            <span className="text-xs text-zinc-400">/5</span>
          </div>
        )}

        <span
          className={`hidden sm:flex items-center gap-1.5 text-xs font-medium border rounded-full px-2.5 py-1 shrink-0 ${cfg.color}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>

        {expanded ? (
          <ChevronUp className="h-4 w-4 text-zinc-400 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
        )}
      </button>

      {/* Estado mobile */}
      <div
        className={`sm:hidden px-4 pb-2 ${expanded ? '' : 'border-b border-zinc-100'}`}
      >
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium border rounded-full px-2.5 py-1 ${cfg.color}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      {/* Detalhe expandível */}
      {expanded && (
        <div className="border-t border-zinc-100">
          {/* Botão imprimir — barra de acções */}
          {podeImprimir && (
            <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-100 flex justify-end">
              <PrintButton fichaId={ficha.id} />
            </div>
          )}

          {/* Pendente */}
          {ficha.estado === 'Pendente' && (
            <div className="px-4 py-6 text-center">
              <Clock className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">
                O chefe de departamento ainda não submeteu a avaliação.
              </p>
            </div>
          )}

          {/* Submissão do chefe */}
          {ficha.submissao && (
            <div>
              <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-100">
                <p className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
                  Avaliação do chefe
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {ficha.submissao.avaliador.nomeCompleto} ·{' '}
                  {formatDate(ficha.submissao.dataSubmissao)}
                </p>
              </div>

              <div className="divide-y divide-zinc-100">
                {ficha.submissao.respostas.map((r) => (
                  <div
                    key={r.id}
                    className="px-4 py-2.5 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-800 font-medium truncate">
                        {r.criterio.nome}
                      </p>
                      {r.observacao && (
                        <p className="text-xs text-zinc-400 mt-0.5 truncate">
                          {r.observacao}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-zinc-400">
                        ×{r.criterio.peso}
                      </span>
                      <span
                        className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                          r.pontuacao >= 4
                            ? 'bg-emerald-50 text-emerald-700'
                            : r.pontuacao === 3
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {r.pontuacao}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {ficha.submissao.pontuacaoTotal != null && (
                <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between">
                  <span className="text-xs text-zinc-500 font-medium">
                    Pontuação ponderada
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-bold text-zinc-900">
                      {ficha.submissao.pontuacaoTotal.toFixed(1)}
                    </span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`h-3.5 w-3.5 ${
                            n <= Math.round(ficha.submissao!.pontuacaoTotal!)
                              ? 'fill-zinc-900 text-zinc-900'
                              : 'text-zinc-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {ficha.submissao.comentarios && (
                <div className="px-4 py-3 border-t border-zinc-100">
                  <p className="text-xs text-zinc-500 font-medium mb-1">
                    Comentário
                  </p>
                  <p className="text-sm text-zinc-700 italic">
                    "{ficha.submissao.comentarios}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Validação */}
          {ficha.validacao && (
            <div
              className={`mx-4 my-3 rounded-md border p-3 ${
                ficha.validacao.aprovado
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-center gap-2">
                {ficha.validacao.aprovado ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                )}
                <p
                  className={`text-sm font-semibold ${
                    ficha.validacao.aprovado
                      ? 'text-emerald-800'
                      : 'text-red-700'
                  }`}
                >
                  {ficha.validacao.aprovado ? 'Aprovado' : 'Rejeitado'} pelo
                  Director
                </p>
                <span
                  className={`ml-auto text-xs shrink-0 ${
                    ficha.validacao.aprovado
                      ? 'text-emerald-600'
                      : 'text-red-500'
                  }`}
                >
                  {formatDate(ficha.validacao.dataValidacao)}
                </span>
              </div>
              {ficha.validacao.comentarios && (
                <p
                  className={`text-xs mt-1.5 italic ${
                    ficha.validacao.aprovado
                      ? 'text-emerald-700'
                      : 'text-red-600'
                  }`}
                >
                  "{ficha.validacao.comentarios}"
                </p>
              )}
              <p
                className={`text-xs mt-1 ${
                  ficha.validacao.aprovado ? 'text-emerald-600' : 'text-red-500'
                }`}
              >
                — {ficha.validacao.director.nomeCompleto}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────
export default function MinhaAvaliacaoPage() {
  const [loading, setLoading] = useState(true)
  const [fichas, setFichas] = useState<Ficha[]>([])
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setErro(null)

      const { ok: okMe, data: dataMe } = await safeFetch('/api/auth/me')
      if (!okMe || !(dataMe as any)?.id) {
        setErro('Não foi possível carregar os seus dados.')
        setLoading(false)
        return
      }
      const me = dataMe as { id: string }

      const { ok: okFichas, data: dataFichas } = await safeFetch(
        `/api/fichas?avaliadoId=${me.id}&limit=50`,
      )
      if (!okFichas) {
        setErro('Não foi possível carregar as suas avaliações.')
        setLoading(false)
        return
      }

      setFichas(toArray<Ficha>(dataFichas))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl p-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    )
  }

  if (erro) {
    return (
      <div className="space-y-6 max-w-6xl">
        <h1 className="text-lg font-semibold text-zinc-900">
          As minhas avaliações
        </h1>
        <div className="rounded-md border border-red-200 bg-red-50 p-6 text-center">
          <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-red-700">{erro}</p>
        </div>
      </div>
    )
  }

  if (fichas.length === 0) {
    return (
      <div className="space-y-6 max-w-6xl">
        <h1 className="text-lg font-semibold text-zinc-900">
          As minhas avaliações
        </h1>
        <div className="rounded-md border border-zinc-200 bg-white p-12 text-center">
          <CalendarX className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-600">
            Sem avaliações registadas
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Quando o director criar um período de avaliação e atribuir fichas,
            estas aparecerão aqui.
          </p>
        </div>
      </div>
    )
  }

  const fichaActiva = fichas.find((f) => f.periodo.activo)
  const fichasAntigas = fichas.filter((f) => !f.periodo.activo)

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">
          As minhas avaliações
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {fichas.length} avaliação{fichas.length !== 1 ? 'ões' : ''} registada
          {fichas.length !== 1 ? 's' : ''}
        </p>
      </div>

      {fichaActiva && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
            Período actual
          </p>
          <FichaCard ficha={fichaActiva} />
        </div>
      )}

      {fichasAntigas.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
            Histórico
          </p>
          <div className="space-y-2">
            {fichasAntigas.map((f) => (
              <FichaCard key={f.id} ficha={f} />
            ))}
          </div>
        </div>
      )}

      {!fichaActiva && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700">
            Não há nenhum período de avaliação activo de momento.
          </p>
        </div>
      )}
    </div>
  )
}
