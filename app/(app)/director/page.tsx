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
  ClipboardList,
  AlertTriangle,
  ChevronRight,
  Activity,
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
  direcao?: { id: string; nome: string } | null
}
interface Periodo {
  id: string
  nome: string
  dataInicio: string
  dataFim: string
  activo: boolean
}
interface Ficha {
  id: string
  estado: string
  pontuacaoFinal?: number | null
  avaliado: {
    id: string
    nomeCompleto: string
    cargo: string
    avatarUrl?: string
    departamento?: { id: string; nome: string } | null
  }
  periodo: { id: string; nome: string }
}
interface ReavaliacaoPendente {
  id: string
  ficha: {
    avaliado: { id: string; nomeCompleto: string; cargo: string }
    periodo: { id: string; nome: string }
  }
  reavaliador: { id: string; nomeCompleto: string }
  dataIndicacao: string
}
interface DashboardData {
  periodo: Periodo | null
  totalFichas: number
  fichasPendentesValidacao: number
  fichasValidadas: number
  fichasEmReavaliacao: number
  reavaliacoesPendentes: ReavaliacaoPendente[]
  fichasParaValidar: Ficha[]
  progresso: number
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

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-zinc-100 rounded-xl animate-pulse ${className}`} />
}

// ── Componente ────────────────────────────────────────────────
export default function HomeDirector() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const me: AuthUser = await fetch('/api/auth/me', {
          credentials: 'include',
        }).then((r) => r.json())
        if (!me?.id) return
        setUser(me)

        const [resPeriodo, resFichas, resReavaliacoes] = await Promise.all([
          fetch('/api/periodos?activo=true&limit=1', {
            credentials: 'include',
          }),
          fetch('/api/fichas?limit=500', { credentials: 'include' }),
          fetch('/api/reavaliacoes?concluida=false&limit=100', {
            credentials: 'include',
          }),
        ])

        const periodos: Periodo[] = toArray(await resPeriodo.json())
        const fichas: Ficha[] = toArray(await resFichas.json())
        const reavaliacoes: ReavaliacaoPendente[] = toArray(
          await resReavaliacoes.json(),
        )
        const periodo = periodos[0] ?? null
        const fichasPeriodo = periodo
          ? fichas.filter((f) => f.periodo.id === periodo.id)
          : fichas

        const fichasValidadas = fichasPeriodo.filter(
          (f) => f.estado === 'ValidadoPorDirector',
        ).length
        const fichasPendentesValidacao = fichasPeriodo.filter(
          (f) => f.estado === 'Reavaliado' || f.estado === 'AvaliadoPorChefe',
        ).length
        const fichasEmReavaliacao = fichasPeriodo.filter(
          (f) => f.estado === 'EmReavaliacao',
        ).length
        const fichasParaValidar = fichasPeriodo
          .filter(
            (f) => f.estado === 'Reavaliado' || f.estado === 'AvaliadoPorChefe',
          )
          .slice(0, 5)
        const progresso =
          fichasPeriodo.length > 0
            ? Math.round((fichasValidadas / fichasPeriodo.length) * 100)
            : 0

        setData({
          periodo,
          totalFichas: fichasPeriodo.length,
          fichasPendentesValidacao,
          fichasValidadas,
          fichasEmReavaliacao,
          reavaliacoesPendentes: reavaliacoes,
          fichasParaValidar,
          progresso,
        })
      } catch (e) {
        console.error('[HOME_DIRECTOR]', e)
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
        <Skeleton className="h-20" />
        <Skeleton className="h-48" />
        <Skeleton className="h-40" />
      </div>
    )

  if (!user || !data) return null

  const dias = data.periodo ? diasRestantes(data.periodo.dataFim) : 0

  const stats = [
    {
      label: 'Total de Fichas',
      value: data.totalFichas,
      icon: <FileText className="h-4 w-4" />,
      bg: 'bg-zinc-50 border-zinc-200',
      color: 'text-zinc-500',
      accent: 'bg-zinc-400',
    },
    {
      label: 'Validadas',
      value: data.fichasValidadas,
      icon: <CheckCircle2 className="h-4 w-4" />,
      bg: 'bg-emerald-50 border-emerald-200',
      color: 'text-emerald-600',
      accent: 'bg-emerald-500',
    },
    {
      label: 'Aguardam Validação',
      value: data.fichasPendentesValidacao,
      icon: <Clock className="h-4 w-4" />,
      bg:
        data.fichasPendentesValidacao > 0
          ? 'bg-amber-50 border-amber-200'
          : 'bg-zinc-50 border-zinc-200',
      color:
        data.fichasPendentesValidacao > 0 ? 'text-amber-600' : 'text-zinc-400',
      accent:
        data.fichasPendentesValidacao > 0 ? 'bg-amber-400' : 'bg-zinc-300',
    },
    {
      label: 'Em Reavaliação',
      value: data.fichasEmReavaliacao,
      icon: <RotateCcw className="h-4 w-4" />,
      bg:
        data.fichasEmReavaliacao > 0
          ? 'bg-blue-50 border-blue-200'
          : 'bg-zinc-50 border-zinc-200',
      color: data.fichasEmReavaliacao > 0 ? 'text-blue-600' : 'text-zinc-400',
      accent: data.fichasEmReavaliacao > 0 ? 'bg-blue-400' : 'bg-zinc-300',
    },
  ]

  return (
    <div className="space-y-6">
      {/* ── Boas-vindas ── */}
      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400" />
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 shrink-0 ring-2 ring-zinc-100">
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback className="bg-indigo-50 text-indigo-700 text-sm font-bold">
                {getInitials(user.nomeCompleto)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-zinc-900 leading-tight">
                Olá, {user.nomeCompleto.split(' ')[0]}
              </p>
              <p className="text-sm text-zinc-500 mt-0.5">
                {user.cargo}
                {user.direcao ? ` · ${user.direcao.nome}` : ''}
              </p>
            </div>
            {data.fichasPendentesValidacao > 0 && (
              <div className="shrink-0 text-right">
                <p className="text-2xl font-bold text-amber-600 leading-none">
                  {data.fichasPendentesValidacao}
                </p>
                <p className="text-[10px] text-amber-500 mt-0.5">a validar</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Período activo ── */}
      {data.periodo ? (
        <Card className="border-indigo-200 shadow-none bg-indigo-50/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                <CalendarDays className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-indigo-900">
                  {data.periodo.nome}
                </p>
                <p className="text-[11px] text-indigo-600 mt-0.5">
                  {formatDate(data.periodo.dataInicio)} →{' '}
                  {formatDate(data.periodo.dataFim)}
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
                <p className="text-2xl font-bold text-zinc-900 leading-none">
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

      {/* ── Progresso ── */}
      {data.totalFichas > 0 && (
        <Card className="border-zinc-200 shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-800">
                    Progresso de validações
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {data.fichasValidadas} de {data.totalFichas} fichas
                    validadas
                  </p>
                </div>
              </div>
              <span className="text-2xl font-bold text-emerald-600">
                {data.progresso}%
              </span>
            </div>
            <Progress value={data.progresso} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* ── Fichas a validar ── */}
      {data.fichasParaValidar.length > 0 && (
        <Card className="border-amber-200 shadow-sm overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-amber-400 to-orange-400" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Aguardam a sua validação
                  </p>
                  <p className="text-[11px] text-amber-600 mt-0.5">
                    {data.fichasPendentesValidacao} ficha
                    {data.fichasPendentesValidacao !== 1 ? 's' : ''} pendente
                    {data.fichasPendentesValidacao !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <Link
                href="/director/validacoes"
                className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium transition-colors"
              >
                Ver todas <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-2">
              {data.fichasParaValidar.map((f) => {
                const est = estadoConfig[f.estado] ?? {
                  label: f.estado,
                  class: 'bg-zinc-100 text-zinc-600 border-zinc-200',
                }
                return (
                  <div
                    key={f.id}
                    className="group flex items-center gap-3 rounded-xl bg-white border border-amber-100 hover:border-amber-200 px-4 py-3 transition-colors"
                  >
                    <Avatar className="h-8 w-8 shrink-0 ring-1 ring-zinc-200">
                      <AvatarImage src={f.avaliado.avatarUrl} />
                      <AvatarFallback className="bg-zinc-100 text-zinc-600 text-[11px] font-semibold">
                        {getInitials(f.avaliado.nomeCompleto)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900 truncate">
                        {f.avaliado.nomeCompleto}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {f.avaliado.cargo} ·{' '}
                        {f.avaliado.departamento?.nome ?? '—'}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${est.class}`}
                    >
                      {est.label}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-amber-400 transition-colors" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Reavaliações em curso ── */}
      {data.reavaliacoesPendentes.length > 0 && (
        <Card className="border-blue-200 shadow-none bg-blue-50/40">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <RotateCcw className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    Reavaliações em curso
                  </p>
                  <p className="text-[11px] text-blue-600 mt-0.5">
                    {data.reavaliacoesPendentes.length} pendente
                    {data.reavaliacoesPendentes.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <Link
                href="/director/reavaliacoes"
                className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-medium transition-colors"
              >
                Ver todas <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-2">
              {data.reavaliacoesPendentes.slice(0, 4).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl bg-white border border-blue-100 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {r.ficha.avaliado.nomeCompleto}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {r.ficha.avaliado.cargo}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide">
                      Reavaliador
                    </p>
                    <p className="text-xs font-semibold text-blue-700">
                      {r.reavaliador.nomeCompleto.split(' ')[0]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Atalhos rápidos ── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: 'Critérios',
            href: '/director/criterios',
            icon: <ClipboardList className="h-4 w-4 text-purple-500" />,
            desc: 'Gerir critérios',
          },
          {
            label: 'Fichas de Avaliação',
            href: '/director/fichas',
            icon: <FileText className="h-4 w-4 text-blue-500" />,
            desc: 'Ver todas as fichas',
          },
          {
            label: 'Reavaliações',
            href: '/director/reavaliacoes',
            icon: <RotateCcw className="h-4 w-4 text-amber-500" />,
            desc: 'Indicar reavaliadores',
          },
          {
            label: 'Validações',
            href: '/director/validacoes',
            icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
            desc: 'Aprovar avaliações',
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
