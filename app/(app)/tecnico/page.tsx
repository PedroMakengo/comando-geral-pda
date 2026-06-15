'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  FileText,
  CheckCircle2,
  Clock,
  RotateCcw,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  Activity,
  Star,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

// ── Tipos ─────────────────────────────────────────────────────
interface AuthUser {
  id: string
  nomeCompleto: string
  email: string
  cargo: string
  role: string
  avatarUrl?: string
  departamento?: { id: string; nome: string } | null
}
interface Ficha {
  id: string
  estado: string
  pontuacaoFinal?: number | null
  createdAt: string
  periodo: { id: string; nome: string; dataInicio: string; dataFim: string }
}
interface ReavaliacaoPendente {
  id: string
  motivacao?: string | null
  dataIndicacao: string
  ficha: {
    id: string
    avaliado: { id: string; nomeCompleto: string; cargo: string }
    periodo: { id: string; nome: string }
  }
  indicadoPor: { id: string; nomeCompleto: string; role: string }
}
interface Periodo {
  id: string
  nome: string
  dataInicio: string
  dataFim: string
  activo: boolean
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
function diasRestantes(dataFim: string) {
  return Math.ceil(
    (new Date(dataFim).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  )
}

const estadoConfig: Record<
  string,
  { label: string; class: string; step: number }
> = {
  Pendente: {
    label: 'Pendente',
    class: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    step: 0,
  },
  AutoAvaliacao: {
    label: 'Auto-avaliação',
    class: 'bg-blue-50 text-blue-700 border-blue-200',
    step: 1,
  },
  AvaliadoPorChefe: {
    label: 'Av. p/ Chefe',
    class: 'bg-purple-50 text-purple-700 border-purple-200',
    step: 2,
  },
  EmReavaliacao: {
    label: 'Em Reavaliação',
    class: 'bg-amber-50 text-amber-700 border-amber-200',
    step: 3,
  },
  Reavaliado: {
    label: 'Reavaliado',
    class: 'bg-orange-50 text-orange-700 border-orange-200',
    step: 4,
  },
  ValidadoPorDirector: {
    label: 'Validado',
    class: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    step: 5,
  },
}

const passos = [
  { label: 'Auto-avaliação', step: 1 },
  { label: 'Av. p/ Chefe', step: 2 },
  { label: 'Reavaliação', step: 3 },
  { label: 'Validado', step: 5 },
]

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-zinc-100 rounded-xl animate-pulse ${className}`} />
}

// ── Componente ────────────────────────────────────────────────
export default function HomePageTecnico() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [fichas, setFichas] = useState<Ficha[]>([])
  const [reavaliacoesPendentes, setReavaliacoesPendentes] = useState<
    ReavaliacaoPendente[]
  >([])
  const [periodoActivo, setPeriodoActivo] = useState<Periodo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const me: AuthUser = await fetch('/api/auth/me', {
          credentials: 'include',
        }).then((r) => r.json())
        if (!me.id) return
        setUser(me)
        const [resFichas, resReav, resPer] = await Promise.all([
          fetch(`/api/fichas?avaliadoId=${me.id}&limit=20`, {
            credentials: 'include',
          }),
          fetch(`/api/reavaliacoes?reavaliadorId=${me.id}&concluida=false`, {
            credentials: 'include',
          }),
          fetch('/api/periodos?activo=true&limit=1', {
            credentials: 'include',
          }),
        ])
        setFichas(toArray<Ficha>(await resFichas.json()))
        setReavaliacoesPendentes(
          toArray<ReavaliacaoPendente>(await resReav.json()),
        )
        const periodos = toArray<Periodo>(await resPer.json())
        setPeriodoActivo(periodos[0] ?? null)
      } catch (e) {
        console.error('[HOME_TECNICO]', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading)
    return (
      <div className="space-y-5">
        <Skeleton className="h-20" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-40" />
        <Skeleton className="h-32" />
      </div>
    )

  if (!user) return null

  const fichaActiva = periodoActivo
    ? (fichas.find((f) => f.periodo.id === periodoActivo.id) ?? null)
    : null
  const estadoActivo = fichaActiva ? estadoConfig[fichaActiva.estado] : null
  const passoActual = estadoActivo?.step ?? 0
  const totalFichas = fichas.length
  const fichasValidadas = fichas.filter(
    (f) => f.estado === 'ValidadoPorDirector',
  ).length
  const fichasComNota = fichas.filter((f) => f.pontuacaoFinal != null)
  const mediaPontuacao =
    fichasComNota.length > 0
      ? fichasComNota.reduce((a, f) => a + f.pontuacaoFinal!, 0) /
        fichasComNota.length
      : null
  const dias = periodoActivo ? diasRestantes(periodoActivo.dataFim) : 0

  const stats = [
    {
      label: 'Total de fichas',
      value: totalFichas,
      icon: <FileText className="h-4 w-4" />,
      bg: 'bg-zinc-50 border-zinc-200',
      color: 'text-zinc-500',
      accent: 'bg-zinc-400',
    },
    {
      label: 'Fichas validadas',
      value: fichasValidadas,
      icon: <CheckCircle2 className="h-4 w-4" />,
      bg: 'bg-emerald-50 border-emerald-200',
      color: 'text-emerald-600',
      accent: 'bg-emerald-500',
    },
    {
      label: 'Méd. pontuação',
      value: mediaPontuacao != null ? `${mediaPontuacao.toFixed(1)}/5` : '—',
      icon: <Star className="h-4 w-4" />,
      bg: 'bg-blue-50 border-blue-200',
      color: 'text-blue-600',
      accent: 'bg-blue-400',
    },
    {
      label: 'Reavaliações pend.',
      value: reavaliacoesPendentes.length,
      icon: <RotateCcw className="h-4 w-4" />,
      bg:
        reavaliacoesPendentes.length > 0
          ? 'bg-amber-50 border-amber-200'
          : 'bg-zinc-50 border-zinc-200',
      color:
        reavaliacoesPendentes.length > 0 ? 'text-amber-600' : 'text-zinc-400',
      accent: reavaliacoesPendentes.length > 0 ? 'bg-amber-400' : 'bg-zinc-300',
    },
  ]

  return (
    <div className="space-y-6">
      {/* ── Boas-vindas ── */}
      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400" />
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 shrink-0 ring-2 ring-zinc-100">
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback className="bg-blue-50 text-blue-700 text-sm font-bold">
                {getInitials(user.nomeCompleto)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-zinc-900 leading-tight">
                Olá, {user.nomeCompleto.split(' ')[0]} 👋
              </p>
              <p className="text-sm text-zinc-500 mt-0.5">
                {user.cargo} · {user.departamento?.nome ?? '—'}
              </p>
            </div>
            {fichaActiva && estadoActivo && (
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${estadoActivo.class}`}
              >
                {estadoActivo.label}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Período activo ── */}
      {periodoActivo ? (
        <Card className="border-indigo-200 shadow-none bg-indigo-50/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                <CalendarDays className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-indigo-900">
                  {periodoActivo.nome}
                </p>
                <p className="text-[11px] text-indigo-600 mt-0.5">
                  {formatDate(periodoActivo.dataInicio)} →{' '}
                  {formatDate(periodoActivo.dataFim)}
                </p>
              </div>
              <Separator
                orientation="vertical"
                className="h-8 mx-1 bg-indigo-200"
              />
              <div className="shrink-0 text-right">
                {dias > 0 ? (
                  <>
                    <p className="text-xl font-bold text-indigo-700 leading-none">
                      {dias}
                    </p>
                    <p className="text-[10px] text-indigo-500 mt-0.5">dias</p>
                  </>
                ) : (
                  <span className="text-xs text-indigo-500 font-medium">
                    Encerrado
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-zinc-300 shadow-none bg-zinc-50">
          <CardContent className="p-4 flex items-center gap-2.5">
            <CalendarDays className="h-4 w-4 text-zinc-400" />
            <p className="text-sm text-zinc-500">
              Nenhum período de avaliação activo
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <Card
            key={i}
            className={`border shadow-none overflow-hidden ${s.bg}`}
          >
            <div className={`h-[3px] ${s.accent}`} />
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`${s.color} opacity-60`}>{s.icon}</div>
              <div>
                <p
                  className={`font-bold text-zinc-900 leading-none ${typeof s.value === 'string' && s.value.includes('/') ? 'text-lg' : 'text-2xl'}`}
                >
                  {s.value}
                </p>
                <p className="text-[11px] text-zinc-500 mt-1 leading-tight">
                  {s.label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Estado da ficha do período ── */}
      {periodoActivo && (
        <Card className="border-zinc-200 shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-zinc-50 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-zinc-500" />
                </div>
                <p className="text-sm font-semibold text-zinc-900">
                  Ficha do período actual
                </p>
              </div>
            </div>

            {!fichaActiva ? (
              <div className="text-center py-6">
                <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
                  <Clock className="h-6 w-6 text-zinc-300" />
                </div>
                <p className="text-sm font-medium text-zinc-500">
                  Aguarda a criação da ficha pelo director
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Será notificado quando a ficha for criada.
                </p>
              </div>
            ) : (
              <>
                {/* Passos */}
                <div className="mb-3">
                  <div className="flex items-center gap-1 mb-2">
                    {passos.map((p, i) => (
                      <div key={i} className="flex items-center flex-1">
                        <div
                          className={`h-2 flex-1 rounded-full transition-all ${passoActual >= p.step ? 'bg-blue-500' : 'bg-zinc-100'}`}
                        />
                        {i < passos.length - 1 && <div className="w-1" />}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between">
                    {passos.map((p, i) => (
                      <p
                        key={i}
                        className={`text-[10px] font-medium ${passoActual >= p.step ? 'text-blue-600' : 'text-zinc-400'}`}
                      >
                        {p.label}
                      </p>
                    ))}
                  </div>
                </div>

                {fichaActiva.estado === 'ValidadoPorDirector' &&
                  fichaActiva.pontuacaoFinal != null && (
                    <div className="mt-4 flex items-center gap-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                      <div className="h-14 w-14 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                        <span className="text-xl font-bold text-emerald-700">
                          {fichaActiva.pontuacaoFinal.toFixed(1)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-800">
                          Avaliação concluída
                        </p>
                        <p className="text-xs text-emerald-600 mt-0.5">
                          Pontuação final validada pelo Director.
                        </p>
                      </div>
                    </div>
                  )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Reavaliações pendentes ── */}
      {reavaliacoesPendentes.length > 0 && (
        <Card className="border-amber-200 shadow-sm overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-amber-400 to-orange-400" />
          <CardContent className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <RotateCcw className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-sm font-semibold text-amber-900">
                {reavaliacoesPendentes.length === 1
                  ? 'Tem uma reavaliação pendente'
                  : `Tem ${reavaliacoesPendentes.length} reavaliações pendentes`}
              </p>
            </div>
            <div className="space-y-2.5">
              {reavaliacoesPendentes.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl bg-white border border-amber-100 p-3.5"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 truncate">
                        {r.ficha.avaliado.nomeCompleto}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {r.ficha.avaliado.cargo} · {r.ficha.periodo.nome}
                      </p>
                      {r.motivacao && (
                        <p className="text-xs text-zinc-400 italic mt-1.5 border-l-2 border-amber-200 pl-2">
                          "{r.motivacao}"
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-400 shrink-0">
                      {formatDate(r.dataIndicacao)}
                    </span>
                  </div>
                  <Link
                    href="/tecnico/reavaliacao"
                    className="flex items-center justify-center gap-1.5 w-full h-8 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Iniciar reavaliação
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Histórico recente ── */}
      {fichas.filter((f) => f.estado === 'ValidadoPorDirector').length > 0 && (
        <Card className="border-zinc-200 shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-zinc-50 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-zinc-500" />
                </div>
                <p className="text-sm font-semibold text-zinc-900">
                  Histórico recente
                </p>
              </div>
              <Link
                href="/tecnico/historico"
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Ver tudo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-1">
              {fichas
                .filter((f) => f.estado === 'ValidadoPorDirector')
                .slice(0, 3)
                .map((f, i, arr) => (
                  <div
                    key={f.id}
                    className={`flex items-center justify-between py-3 ${i < arr.length - 1 ? 'border-b border-zinc-100' : ''}`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-zinc-800">
                        {f.periodo.nome}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {formatDate(f.createdAt)}
                      </p>
                    </div>
                    {f.pontuacaoFinal != null && (
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-xl font-bold text-zinc-900">
                          {f.pontuacaoFinal.toFixed(1)}
                        </span>
                        <span className="text-xs text-zinc-400">/5</span>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Atalhos ── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: 'Minhas Fichas',
            href: '/tecnico/fichas',
            icon: <FileText className="h-4 w-4 text-zinc-500" />,
            desc: 'Ver todas as fichas',
          },
          {
            label: 'Histórico',
            href: '/tecnico/historico',
            icon: <Clock className="h-4 w-4 text-purple-500" />,
            desc: 'Avaliações passadas',
          },
          {
            label: 'Meu Perfil',
            href: '/tecnico/perfil',
            icon: <Activity className="h-4 w-4 text-zinc-500" />,
            desc: 'Editar dados',
          },
        ].map((a, i) => (
          <Link
            key={i}
            href={a.href}
            className="group flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 hover:bg-zinc-50 hover:border-zinc-300 hover:shadow-sm transition-all"
          >
            <div className="h-9 w-9 rounded-lg bg-zinc-50 group-hover:bg-zinc-100 flex items-center justify-center shrink-0 transition-colors">
              {a.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-900 leading-tight">
                {a.label}
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">{a.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 transition-colors shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}
