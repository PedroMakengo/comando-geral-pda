'use client'

import { useEffect, useState } from 'react'
import {
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CalendarX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

// ── Tipos ─────────────────────────────────────────────────────
interface AuthUser {
  id: string
  nomeCompleto: string
  departamento?: { id: string; nome: string } | null
  direcao?: { id: string; nome: string } | null
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
  periodo: { id: string; nome: string }
  submissoes: { tipo: string; pontuacaoTotal?: number | null }[]
}
interface Periodo {
  id: string
  nome: string
  activo: boolean
}

function toArray<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res
  if (res && typeof res === 'object' && Array.isArray((res as any).data))
    return (res as any).data
  return []
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
              ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-200'
              : 'bg-zinc-50 border-zinc-200 text-zinc-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50'
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

// ── Componente ────────────────────────────────────────────────
export default function AutoAvaliacaoDirectorPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [periodoActivo, setPeriodoActivo] = useState<Periodo | null>(null)
  const [ficha, setFicha] = useState<Ficha | null>(null)
  const [criterios, setCriterios] = useState<Criterio[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [semPeriodo, setSemPeriodo] = useState(false)
  const [semFicha, setSemFicha] = useState(false)
  const [pontuacoes, setPontuacoes] = useState<Record<string, number>>({})
  const [comentarios, setComentarios] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // 1. Utilizador actual
        const me: AuthUser = await fetch('/api/auth/me', {
          credentials: 'include',
        }).then((r) => r.json())
        if (!me?.id) return
        setUser(me)

        // 2. Período activo
        const dataPeriodo = await fetch('/api/periodos?activo=true&limit=1', {
          credentials: 'include',
        }).then((r) => r.json())
        const periodos: Periodo[] = toArray(dataPeriodo)
        const periodo = periodos[0] ?? null
        if (!periodo) {
          setSemPeriodo(true)
          setLoading(false)
          return
        }
        setPeriodoActivo(periodo)

        // 3. Ficha do Director neste período
        // Nota: o Director tem role='Director' — a API GET /api/fichas aceita avaliadoId
        // independentemente do role, desde que o Director consulte a sua própria ficha.
        const dataFichas = await fetch(
          `/api/fichas?avaliadoId=${me.id}&periodoId=${periodo.id}&limit=1`,
          { credentials: 'include' },
        ).then((r) => r.json())

        const fichas: Ficha[] = toArray(dataFichas)
        const fichaActiva = fichas[0] ?? null

        if (!fichaActiva) {
          setSemFicha(true)
          setLoading(false)
          return
        }
        setFicha(fichaActiva)

        // 4. Já submeteu auto-avaliação?
        if (fichaActiva.submissoes?.some((s) => s.tipo === 'AutoAvaliacao')) {
          setSubmitted(true)
          setLoading(false)
          return
        }

        // 5. Estado já avançou além de Pendente?
        if (fichaActiva.estado !== 'Pendente') {
          setLoading(false)
          return
        }

        // 6. Critérios — tenta pelo departamento da direção, depois individuais
        const [resDept, resInd] = await Promise.all([
          me.departamento?.id
            ? fetch(
                `/api/criterios?departamentoId=${me.departamento.id}&limit=100`,
                { credentials: 'include' },
              ).then((r) => r.json())
            : me.direcao?.id
              ? // Director pode não ter departamento — busca critérios pela direção
                fetch(`/api/criterios?direcaoId=${me.direcao.id}&limit=100`, {
                  credentials: 'include',
                }).then((r) => r.json())
              : Promise.resolve([]),
          fetch(`/api/criterios?tecnicoId=${me.id}&limit=100`, {
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
      } catch (e) {
        console.error('[AUTO_AVALIACAO_DIRECTOR]', e)
        toast.error('Erro ao carregar os dados.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSubmit = async () => {
    if (!ficha) {
      toast.error('Sem ficha de avaliação.')
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
          fichaId: ficha.id,
          tipo: 'AutoAvaliacao',
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
      toast.success('Auto-avaliação submetida com sucesso!')
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading ───────────────────────────────────────────────
  if (loading)
    return (
      <div className="p-6 space-y-4 max-w-2xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    )

  // ── Sem período activo ────────────────────────────────────
  if (semPeriodo)
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">
            Auto-avaliação
          </h1>
        </div>
        <div className="rounded-md border border-zinc-200 bg-white p-12 text-center">
          <CalendarX className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-600">
            Sem período de avaliação activo
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Aguarde que o administrador abra um novo período.
          </p>
        </div>
      </div>
    )

  // ── Sem ficha criada pelo Master ──────────────────────────
  if (semFicha)
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">
            Auto-avaliação
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">{periodoActivo?.nome}</p>
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50 p-8 text-center">
          <ClipboardList className="h-10 w-10 text-amber-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-amber-800">
            Ficha ainda não disponível
          </p>
          <p className="text-xs text-amber-600 mt-1">
            O Master ainda não criou a sua ficha de avaliação para{' '}
            <strong>{periodoActivo?.nome}</strong>.
          </p>
          <p className="text-xs text-amber-500 mt-2">
            Contacte o administrador do sistema para que crie a sua ficha.
          </p>
        </div>
      </div>
    )

  // ── Já submeteu ───────────────────────────────────────────
  if (submitted) {
    const submissao = ficha?.submissoes?.find((s) => s.tipo === 'AutoAvaliacao')
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">
            Auto-avaliação
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">{ficha?.periodo.nome}</p>
        </div>
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
          <p className="text-base font-semibold text-emerald-800">
            Auto-avaliação submetida
          </p>
          <p className="text-sm text-emerald-600 mt-1">
            Registada com sucesso. Aguarde a validação pelo Master.
          </p>
          {submissao?.pontuacaoTotal != null && (
            <div className="mt-4 inline-flex items-center gap-2 bg-white border border-emerald-200 rounded-lg px-4 py-2">
              <span className="text-2xl font-bold text-emerald-700">
                {submissao.pontuacaoTotal.toFixed(1)}
              </span>
              <span className="text-sm text-emerald-600">/ 5 pontos</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Estado já avançou (não está Pendente) ─────────────────
  if (ficha && ficha.estado !== 'Pendente') {
    const estadoLabel: Record<string, string> = {
      AutoAvaliacao: 'Auto-avaliação submetida',
      AvaliadoPorChefe: 'Em avaliação',
      EmReavaliacao: 'Em reavaliação',
      Reavaliado: 'Reavaliação concluída',
      ValidadoPorDirector: 'Validado pelo Master',
    }
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">
            Auto-avaliação
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">{ficha.periodo.nome}</p>
        </div>
        <div className="rounded-md border border-blue-200 bg-blue-50 p-8 text-center">
          <AlertCircle className="h-10 w-10 text-blue-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-blue-800">
            {estadoLabel[ficha.estado] ?? ficha.estado}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            A auto-avaliação já foi processada para este período.
          </p>
        </div>
      </div>
    )
  }

  // ── Formulário ────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Auto-avaliação</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {ficha?.periodo.nome} · Avalie o seu desempenho de 1 a 5
        </p>
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
        {criterios.length === 0 ? (
          <div className="rounded-md border border-zinc-200 bg-white p-8 text-center">
            <ClipboardList className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm text-zinc-400">
              Nenhum critério definido para a sua direção.
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Contacte o administrador para configurar os critérios.
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
                  <p className="text-sm font-medium text-zinc-900">{c.nome}</p>
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
              placeholder="Descreva brevemente o seu desempenho..."
              className="rounded-lg border-zinc-200 text-sm resize-none"
              rows={4}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full h-10 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-sm font-medium"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> A submeter...
              </>
            ) : (
              'Submeter auto-avaliação'
            )}
          </Button>
        </>
      )}
    </div>
  )
}
