'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, ClipboardList, Loader2, ChevronLeft } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

// ── Tipos ─────────────────────────────────────────────────────
interface AuthUser {
  id: string
  nomeCompleto: string
  departamento?: { id: string; nome: string } | null
}
interface Criterio {
  id: string
  nome: string
  descricao?: string | null
  peso: number
}
interface Ficha {
  id: string
  estado: string
  avaliado: {
    id: string
    nomeCompleto: string
    cargo: string
    avatarUrl?: string
  }
  periodo: { id: string; nome: string }
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

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-zinc-100 rounded-md animate-pulse ${className}`} />
}

function RatingInput({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`h-9 w-9 rounded-lg text-sm font-semibold border transition-all ${
            value === n
              ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-200'
              : '...'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

// ── Componente ────────────────────────────────────────────────
export default function AvaliarTecnicosChefePage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [fichas, setFichas] = useState<Ficha[]>([])
  const [fichaActiva, setFichaActiva] = useState<Ficha | null>(null)
  const [criterios, setCriterios] = useState<Criterio[]>([])
  const [loadingCrits, setLoadingCrits] = useState(false)
  const [pontuacoes, setPontuacoes] = useState<Record<string, number>>({})
  const [comentarios, setComentarios] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [avaliadas, setAvaliadas] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // 1. Utilizador logado
        const resMe = await fetch('/api/auth/me', { credentials: 'include' })
        const me: AuthUser = await resMe.json()
        if (!me?.id) return
        setUser(me)

        // Sem departamento, não há técnicos a avaliar
        if (!me.departamento?.id) {
          setLoading(false)
          return
        }

        // 2. Período activo
        const dataPeriodo = await fetch('/api/periodos?activo=true&limit=1', {
          credentials: 'include',
        }).then((r) => r.json())
        const periodos: any[] = toArray(dataPeriodo)
        const periodo = periodos[0]
        if (!periodo) {
          setLoading(false)
          return
        }

        // 3. Fichas do departamento do chefe com estado AutoAvaliacao
        //    e que NÃO sejam do próprio chefe
        const params = new URLSearchParams()
        params.set('estado', 'AutoAvaliacao')
        params.set('periodoId', periodo.id)
        params.set('departamentoId', me.departamento.id) // ← filtro pelo dept do chefe
        params.set('limit', '100')

        const dataFichas = await fetch(`/api/fichas?${params}`, {
          credentials: 'include',
        }).then((r) => r.json())
        const todas: Ficha[] = toArray(dataFichas)

        // Excluir ficha do próprio chefe (ele é avaliado separadamente)
        setFichas(todas.filter((f) => f.avaliado.id !== me.id))
      } catch (e) {
        console.error('[AVALIAR_TECNICOS]', e)
        toast.error('Erro ao carregar as fichas.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const seleccionarFicha = async (f: Ficha) => {
    setFichaActiva(f)
    setCriterios([])
    setPontuacoes({})
    setComentarios('')
    setLoadingCrits(true)
    try {
      // Busca ficha completa para obter o departamentoId do avaliado
      const fichaDetalhe = await fetch(`/api/fichas/${f.id}`, {
        credentials: 'include',
      }).then((r) => r.json())
      const deptId = fichaDetalhe?.avaliado?.departamento?.id

      const [resDept, resInd] = await Promise.all([
        deptId
          ? fetch(`/api/criterios?departamentoId=${deptId}&limit=100`, {
              credentials: 'include',
            }).then((r) => r.json())
          : Promise.resolve([]),
        fetch(`/api/criterios?tecnicoId=${f.avaliado.id}&limit=100`, {
          credentials: 'include',
        }).then((r) => r.json()),
      ])

      const deptArr: Criterio[] = toArray(resDept)
      const indArr: Criterio[] = toArray(resInd)
      const ids = new Set(deptArr.map((c) => c.id))
      const todos = [...deptArr, ...indArr.filter((c) => !ids.has(c.id))]
      setCriterios(todos)

      const init: Record<string, number> = {}
      todos.forEach((c) => {
        init[c.id] = 3
      })
      setPontuacoes(init)
    } catch {
      toast.error('Erro ao carregar critérios.')
    } finally {
      setLoadingCrits(false)
    }
  }

  const handleSubmit = async () => {
    if (!fichaActiva) return
    if (criterios.length === 0) {
      toast.error('Sem critérios para avaliar.')
      return
    }
    if (criterios.some((c) => !pontuacoes[c.id])) {
      toast.error('Avalie todos os critérios.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/submissoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fichaId: fichaActiva.id,
          tipo: 'AvaliacaoChefe',
          comentarios: comentarios.trim() || null,
          respostas: criterios.map((c) => ({
            criterioId: c.id,
            pontuacao: pontuacoes[c.id],
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao submeter.')
        return
      }
      toast.success(
        `Avaliação de ${fichaActiva.avaliado.nomeCompleto} submetida!`,
      )
      setAvaliadas((prev) => new Set([...prev, fichaActiva.id]))
      setFichaActiva(null)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-2xl">
        <Skeleton className="h-10 w-64" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    )
  }

  // ── Vista de avaliação de um técnico ──────────────────────
  if (fichaActiva) {
    return (
      <div className="p-6 max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFichaActiva(null)}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">
              Avaliar Técnico
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {fichaActiva.periodo.nome}
            </p>
          </div>
        </div>

        {/* Card do técnico */}
        <div className="flex items-center gap-4 p-4 rounded-md border border-purple-200 bg-purple-50">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarImage src={fichaActiva.avaliado.avatarUrl} />
            <AvatarFallback className="bg-purple-100 text-purple-700 text-sm font-semibold">
              {getInitials(fichaActiva.avaliado.nomeCompleto)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-base font-semibold text-zinc-900">
              {fichaActiva.avaliado.nomeCompleto}
            </p>
            <p className="text-sm text-zinc-500">
              {fichaActiva.avaliado.cargo}
            </p>
          </div>
        </div>

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

        {/* Critérios */}
        <div className="space-y-3">
          {loadingCrits ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))
          ) : criterios.length === 0 ? (
            <div className="rounded-md border border-zinc-200 bg-white p-8 text-center">
              <ClipboardList className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">
                Nenhum critério definido para este técnico.
              </p>
            </div>
          ) : (
            criterios.map((c) => (
              <div
                key={c.id}
                className="rounded-md border border-zinc-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900">
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
                  value={pontuacoes[c.id] ?? 3}
                  onChange={(v) =>
                    setPontuacoes((prev) => ({ ...prev, [c.id]: v }))
                  }
                />
              </div>
            ))
          )}
        </div>

        {criterios.length > 0 && (
          <>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-zinc-700">
                Comentários{' '}
                <span className="text-zinc-400 font-normal">(opcional)</span>
              </Label>
              <Textarea
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
                placeholder="Comentário sobre o desempenho do técnico..."
                className="rounded-lg border-zinc-200 text-sm resize-none"
                rows={4}
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full h-10 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> A
                  submeter...
                </>
              ) : (
                `Submeter avaliação de ${fichaActiva.avaliado.nomeCompleto.split(' ')[0]}`
              )}
            </Button>
          </>
        )}
      </div>
    )
  }

  // ── Lista de técnicos para avaliar ────────────────────────
  const pendentes = fichas.filter((f) => !avaliadas.has(f.id))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">
          Avaliar Técnicos
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {!user?.departamento
            ? 'Sem departamento associado'
            : pendentes.length === 0
              ? 'Nenhum técnico aguarda avaliação no seu departamento'
              : `${pendentes.length} técnico${pendentes.length !== 1 ? 's' : ''} aguarda${pendentes.length === 1 ? '' : 'm'} avaliação`}
        </p>
      </div>

      {!user?.departamento ? (
        <div className="rounded-md border border-zinc-200 bg-white p-12 text-center">
          <ClipboardList className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm text-zinc-400">
            Não tem departamento associado.
          </p>
        </div>
      ) : pendentes.length === 0 ? (
        <div className="rounded-md border border-zinc-200 bg-white p-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-600">
            {fichas.length === 0
              ? 'Nenhum técnico do seu departamento submeteu a auto-avaliação ainda'
              : 'Todos os técnicos do departamento foram avaliados'}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            {fichas.length === 0
              ? 'Aguarde que os técnicos submetam as suas auto-avaliações.'
              : 'Não há fichas pendentes de avaliação no departamento.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendentes.map((f) => (
            <button
              key={f.id}
              onClick={() => seleccionarFicha(f)}
              className="w-full flex items-center gap-4 p-4 rounded-md border border-zinc-200 bg-white hover:border-purple-300 hover:bg-purple-50/40 transition-colors text-left"
            >
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={f.avaliado.avatarUrl} />
                <AvatarFallback className="bg-zinc-100 text-zinc-600 text-sm font-semibold">
                  {getInitials(f.avaliado.nomeCompleto)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900">
                  {f.avaliado.nomeCompleto}
                </p>
                <p className="text-xs text-zinc-500">{f.avaliado.cargo}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">
                  Auto-avaliação submetida
                </span>
                <ChevronLeft className="h-4 w-4 text-zinc-300 rotate-180" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Avaliações submetidas nesta sessão */}
      {avaliadas.size > 0 && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-center">
          <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1.5" />
          <p className="text-sm font-medium text-emerald-800">
            {avaliadas.size} técnico{avaliadas.size !== 1 ? 's' : ''} avaliado
            {avaliadas.size !== 1 ? 's' : ''} nesta sessão.
          </p>
        </div>
      )}
    </div>
  )
}
