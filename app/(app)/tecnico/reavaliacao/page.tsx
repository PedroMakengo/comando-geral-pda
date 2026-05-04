'use client'

import { useEffect, useState } from 'react'
import { RotateCcw, CheckCircle2, Loader2, ClipboardList } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

// ── Tipos ─────────────────────────────────────────────────────
interface AuthUser {
  id: string
  nomeCompleto: string
}
interface ReavaliacaoPendente {
  id: string
  motivacao?: string | null
  dataIndicacao: string
  ficha: {
    id: string
    estado: string
    avaliado: {
      id: string
      nomeCompleto: string
      cargo: string
      departamento?: { id: string; nome: string } | null
    }
    periodo: { id: string; nome: string }
  }
  indicadoPor: { id: string; nomeCompleto: string; role: string }
}
interface Criterio {
  id: string
  nome: string
  descricao?: string | null
  peso: number
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

function RatingInput({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const labels = ['', 'Insuficiente', 'Fraco', 'Suficiente', 'Bom', 'Excelente']
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          title={labels[n]}
          onClick={() => onChange(n)}
          className={`h-9 w-9 rounded-lg text-sm font-semibold border transition-all duration-150 ${
            value === n
              ? 'bg-amber-500 border-amber-500 text-white shadow-sm shadow-amber-200'
              : 'bg-zinc-50 border-zinc-200 text-zinc-400 hover:border-amber-300 hover:text-amber-500 hover:bg-amber-50'
          }`}
        >
          {n}
        </button>
      ))}
      {value > 0 && (
        <span className="ml-1.5 text-xs text-zinc-400 font-medium">
          {labels[value]}
        </span>
      )}
    </div>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-zinc-100 rounded-xl animate-pulse ${className}`} />
}

// ── Componente ────────────────────────────────────────────────
export default function ReavaliacaoPageTecnico() {
  const [reavaliacoes, setReavaliacoes] = useState<ReavaliacaoPendente[]>([])
  const [loading, setLoading] = useState(true)
  const [pontuacoes, setPontuacoes] = useState<
    Record<string, Record<string, number>>
  >({})
  const [comentarios, setComentarios] = useState<Record<string, string>>({})
  const [criterios, setCriterios] = useState<Record<string, Criterio[]>>({})
  const [loadingCrits, setLoadingCrits] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [concluidas, setConcluidas] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const me: AuthUser = await fetch('/api/auth/me', {
          credentials: 'include',
        }).then((r) => r.json())
        if (!me.id) return
        const data = await fetch(
          `/api/reavaliacoes?reavaliadorId=${me.id}&concluida=false`,
          { credentials: 'include' },
        ).then((r) => r.json())
        const lista: ReavaliacaoPendente[] = toArray(data)
        setReavaliacoes(lista)
        await Promise.all(
          lista.map(async (r) => {
            const avaliado = r.ficha.avaliado
            const deptId = avaliado.departamento?.id
            setLoadingCrits((prev) => ({ ...prev, [r.id]: true }))
            const [resDept, resInd] = await Promise.all([
              deptId
                ? fetch(`/api/criterios?departamentoId=${deptId}&limit=100`, {
                    credentials: 'include',
                  }).then((x) => x.json())
                : Promise.resolve([]),
              fetch(`/api/criterios?tecnicoId=${avaliado.id}&limit=100`, {
                credentials: 'include',
              }).then((x) => x.json()),
            ])
            const deptArr: Criterio[] = toArray(resDept),
              indArr: Criterio[] = toArray(resInd)
            const ids = new Set(deptArr.map((c) => c.id))
            const todos = [...deptArr, ...indArr.filter((c) => !ids.has(c.id))]
            setCriterios((prev) => ({ ...prev, [r.id]: todos }))
            const init: Record<string, number> = {}
            todos.forEach((c) => {
              init[c.id] = 3
            })
            setPontuacoes((prev) => ({ ...prev, [r.id]: init }))
            setComentarios((prev) => ({ ...prev, [r.id]: '' }))
            setLoadingCrits((prev) => ({ ...prev, [r.id]: false }))
          }),
        )
      } catch (e) {
        console.error('[REAVALIACAO]', e)
        toast.error('Não foi possível carregar as reavaliações.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSubmit = async (r: ReavaliacaoPendente) => {
    const crits = criterios[r.id] ?? [],
      ponts = pontuacoes[r.id] ?? {}
    if (crits.length === 0) {
      toast.error('Sem critérios para avaliar.')
      return
    }
    if (crits.some((c) => !ponts[c.id])) {
      toast.error('Avalie todos os critérios antes de submeter.')
      return
    }
    setSubmitting(r.id)
    try {
      const res = await fetch('/api/submissoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fichaId: r.ficha.id,
          tipo: 'Reavaliacao',
          comentarios: comentarios[r.id]?.trim() || null,
          respostas: crits.map((c) => ({
            criterioId: c.id,
            pontuacao: ponts[c.id],
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao submeter.')
        return
      }
      toast.success('Reavaliação submetida com sucesso!')
      setConcluidas((prev) => new Set([...prev, r.id]))
    } finally {
      setSubmitting(null)
    }
  }

  if (loading)
    return (
      <div className="space-y-5 max-w-2xl">
        <Skeleton className="h-10 w-64" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    )

  const pendentes = reavaliacoes.filter((r) => !concluidas.has(r.id))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
          Reavaliações
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {pendentes.length === 0
            ? 'Sem reavaliações pendentes'
            : `${pendentes.length} reavaliação${pendentes.length !== 1 ? 'ões' : ''} pendente${pendentes.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {pendentes.length === 0 ? (
        <Card className="border-dashed border-zinc-300 shadow-none">
          <CardContent className="p-14 text-center">
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-zinc-700">
              Nenhuma reavaliação pendente
            </p>
            <p className="text-xs text-zinc-400 mt-1.5">
              Será notificado quando for indicado para reavaliar um colega.
            </p>
          </CardContent>
        </Card>
      ) : (
        pendentes.map((r) => (
          <Card
            key={r.id}
            className="border-zinc-200 shadow-sm overflow-hidden"
          >
            {/* Header */}
            <div className="h-[3px] bg-gradient-to-r from-amber-400 to-orange-400" />
            <div className="p-4 border-b border-zinc-100 bg-amber-50/50">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 shrink-0 ring-1 ring-amber-200">
                  <AvatarFallback className="bg-amber-100 text-amber-700 text-xs font-bold">
                    {getInitials(r.ficha.avaliado.nomeCompleto)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-zinc-900">
                    {r.ficha.avaliado.nomeCompleto}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {r.ficha.avaliado.cargo}
                    {r.ficha.avaliado.departamento?.nome
                      ? ` · ${r.ficha.avaliado.departamento.nome}`
                      : ''}{' '}
                    · {r.ficha.periodo.nome}
                  </p>
                </div>
                <span className="text-[11px] text-zinc-400 shrink-0">
                  {formatDate(r.dataIndicacao)}
                </span>
              </div>
              {r.motivacao && (
                <p className="text-xs text-amber-700 italic mt-2.5 border-l-2 border-amber-300 pl-2.5">
                  "{r.motivacao}"
                </p>
              )}
              <p className="text-[11px] text-zinc-400 mt-2">
                Indicado por:{' '}
                <span className="font-medium text-zinc-600">
                  {r.indicadoPor.nomeCompleto}
                </span>
              </p>
            </div>

            {/* Critérios */}
            <CardContent className="p-5 space-y-5">
              {/* Legenda */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5">
                {[
                  ['1', 'Insuficiente'],
                  ['2', 'Fraco'],
                  ['3', 'Suficiente'],
                  ['4', 'Bom'],
                  ['5', 'Excelente'],
                ].map(([n, l]) => (
                  <span key={n}>
                    <span className="font-semibold text-zinc-600">{n}</span> {l}
                  </span>
                ))}
              </div>

              {loadingCrits[r.id] ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))
              ) : (criterios[r.id] ?? []).length === 0 ? (
                <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-5 text-center">
                  <ClipboardList className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm text-zinc-400">
                    Nenhum critério definido para este técnico.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(criterios[r.id] ?? []).map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl border border-zinc-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-900">
                            {c.nome}
                          </p>
                          {c.descricao && (
                            <p className="text-xs text-zinc-400 mt-0.5">
                              {c.descricao}
                            </p>
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full shrink-0">
                          ×{c.peso}
                        </span>
                      </div>
                      <RatingInput
                        value={pontuacoes[r.id]?.[c.id] ?? 3}
                        onChange={(v) =>
                          setPontuacoes((prev) => ({
                            ...prev,
                            [r.id]: { ...(prev[r.id] ?? {}), [c.id]: v },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-zinc-700">
                  Comentários{' '}
                  <span className="text-zinc-400 font-normal">(opcional)</span>
                </Label>
                <Textarea
                  value={comentarios[r.id] ?? ''}
                  onChange={(e) =>
                    setComentarios((prev) => ({
                      ...prev,
                      [r.id]: e.target.value,
                    }))
                  }
                  placeholder="Comentário sobre o desempenho do colega..."
                  className="rounded-lg border-zinc-200 text-sm resize-none"
                  rows={3}
                />
              </div>

              <Button
                onClick={() => handleSubmit(r)}
                disabled={
                  submitting === r.id ||
                  loadingCrits[r.id] ||
                  (criterios[r.id] ?? []).length === 0
                }
                className="w-full h-10 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold shadow-sm gap-2"
              >
                {submitting === r.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> A submeter...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" /> Submeter reavaliação
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))
      )}

      {concluidas.size > 0 && (
        <Card className="border-emerald-200 shadow-none bg-emerald-50">
          <CardContent className="p-5 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-emerald-800">
              {concluidas.size} reavaliação{concluidas.size !== 1 ? 'ões' : ''}{' '}
              submetida{concluidas.size !== 1 ? 's' : ''} com sucesso.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
