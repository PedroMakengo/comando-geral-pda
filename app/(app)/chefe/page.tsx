'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  FileText,
  CheckCircle2,
  Clock,
  Activity,
  ArrowRight,
  ChevronRight,
  Users,
  UserCheck,
  AlertTriangle,
  ClipboardList,
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
  submissao?: { pontuacaoTotal?: number | null } | null
}
interface Utilizador {
  id: string
  nomeCompleto: string
  cargo: string
  avatarUrl?: string
}
interface DashboardData {
  periodo: Periodo | null
  fichasDoDept: Ficha[]
  fichasMinhaConta: Ficha | null
  totalTecnicos: number
  fichasConcluidas: number
  fichasPendentes: number
  // fichas no estado Pendente (sem submissão) — chefe precisa de avaliar
  fichasParaAvaliar: Ficha[]
  tecnicosSemFicha: Utilizador[]
  progresso: number
}

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
    console.error(`[safeFetch] ${url}`, e)
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
function diasRestantes(dataFim: string) {
  return Math.ceil(
    (new Date(dataFim).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  )
}

// Apenas os 3 estados actuais
const estadoConfig: Record<string, { label: string; cls: string }> = {
  Pendente: {
    label: 'Pendente',
    cls: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  },
  AvaliadoPorChefe: {
    label: 'Avaliado',
    cls: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  ValidadoPorDirector: {
    label: 'Validado',
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-zinc-100 rounded-xl animate-pulse ${className}`} />
}

export default function HomeChefePage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const me: AuthUser | null = await safeFetch('/api/auth/me')
        if (!me?.id) return
        setUser(me)

        const [dataPeriodo, dataFichas, dataTecnicos] = await Promise.all([
          safeFetch('/api/periodos?activo=true&limit=1'),
          me.departamento?.id
            ? safeFetch(
                `/api/fichas?departamentoId=${me.departamento.id}&limit=200`,
              )
            : null,
          me.departamento?.id
            ? safeFetch(
                `/api/utilizadores?departamentoId=${me.departamento.id}&role=Tecnico&limit=100`,
              )
            : null,
        ])

        const periodos: Periodo[] = toArray(dataPeriodo)
        const fichas: Ficha[] = toArray(dataFichas)
        const tecnicos: Utilizador[] = toArray(dataTecnicos)
        const periodo = periodos[0] ?? null

        // Separar ficha do próprio chefe das fichas dos técnicos
        const fichasMinhaConta = periodo
          ? (fichas.find(
              (f) => f.avaliado.id === me.id && f.periodo.id === periodo.id,
            ) ?? null)
          : null

        const fichasDept = fichas.filter((f) => f.avaliado.id !== me.id)
        const fichasPeriodo = periodo
          ? fichasDept.filter((f) => f.periodo.id === periodo.id)
          : fichasDept

        const fichasConcluidas = fichasPeriodo.filter(
          (f) => f.estado === 'ValidadoPorDirector',
        ).length
        // Fichas Pendente = sem avaliação do chefe — são estas que ele precisa de tratar
        const fichasParaAvaliar = fichasPeriodo
          .filter((f) => f.estado === 'Pendente')
          .slice(0, 5)

        const comFicha = new Set(fichasPeriodo.map((f) => f.avaliado.id))
        const tecnicosSemFicha = tecnicos
          .filter((t) => t.id !== me.id && !comFicha.has(t.id))
          .slice(0, 5)

        const progresso =
          fichasPeriodo.length > 0
            ? Math.round((fichasConcluidas / fichasPeriodo.length) * 100)
            : 0

        setData({
          periodo,
          fichasDoDept: fichasPeriodo,
          fichasMinhaConta,
          totalTecnicos: tecnicos.filter((t) => t.id !== me.id).length,
          fichasConcluidas,
          fichasPendentes: fichasPeriodo.filter(
            (f) => f.estado !== 'ValidadoPorDirector',
          ).length,
          fichasParaAvaliar,
          tecnicosSemFicha,
          progresso,
        })
      } catch (e) {
        console.error('[HOME_CHEFE]', e)
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
        <Skeleton className="h-44" />
      </div>
    )

  if (!user || !data) return null

  const dias = data.periodo ? diasRestantes(data.periodo.dataFim) : 0

  // Passos do novo fluxo (sem auto-avaliação)
  const passosFluxo = ['Pendente', 'AvaliadoPorChefe', 'ValidadoPorDirector']

  const stats = [
    {
      label: 'Técnicos no dept.',
      value: data.totalTecnicos,
      icon: <Users className="h-4 w-4" />,
      bg: 'bg-zinc-50 border-zinc-200',
      color: 'text-zinc-500',
      accent: 'bg-zinc-400',
    },
    {
      label: 'Fichas validadas',
      value: data.fichasConcluidas,
      icon: <CheckCircle2 className="h-4 w-4" />,
      bg: 'bg-emerald-50 border-emerald-200',
      color: 'text-emerald-600',
      accent: 'bg-emerald-500',
    },
    {
      label: 'Para avaliar',
      value: data.fichasParaAvaliar.length,
      icon: <UserCheck className="h-4 w-4" />,
      bg:
        data.fichasParaAvaliar.length > 0
          ? 'bg-purple-50 border-purple-200'
          : 'bg-zinc-50 border-zinc-200',
      color:
        data.fichasParaAvaliar.length > 0 ? 'text-purple-600' : 'text-zinc-400',
      accent:
        data.fichasParaAvaliar.length > 0 ? 'bg-purple-400' : 'bg-zinc-300',
    },
    {
      label: 'Pendentes director',
      value: data.fichasDoDept.filter((f) => f.estado === 'AvaliadoPorChefe')
        .length,
      icon: <Clock className="h-4 w-4" />,
      bg: 'bg-blue-50 border-blue-200',
      color: 'text-blue-600',
      accent: 'bg-blue-400',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Boas-vindas */}
      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400" />
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 shrink-0 ring-2 ring-zinc-100">
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback className="bg-purple-50 text-purple-700 text-sm font-bold">
                {getInitials(user.nomeCompleto)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-zinc-900 leading-tight">
                Olá, {user.nomeCompleto.split(' ')[0]} 👋
              </p>
              <p className="text-sm text-zinc-500 mt-0.5">
                {user.cargo}
                {user.departamento ? ` · ${user.departamento.nome}` : ''}
              </p>
            </div>
            {data.fichasParaAvaliar.length > 0 && (
              <div className="shrink-0 text-right">
                <p className="text-2xl font-bold text-purple-600 leading-none">
                  {data.fichasParaAvaliar.length}
                </p>
                <p className="text-[10px] text-purple-500 mt-0.5">a avaliar</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Período activo */}
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

      {/* Minha avaliação (ficha do próprio chefe) */}
      {data.periodo && (
        <Card className="border-zinc-200 shadow-none">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-3">
              Minha avaliação
            </p>
            {!data.fichasMinhaConta ? (
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4 text-zinc-400" />
                </div>
                <p className="text-sm text-zinc-500">
                  Ficha ainda não criada para este período.
                </p>
              </div>
            ) : (
              (() => {
                const est = estadoConfig[data.fichasMinhaConta.estado]
                const idx = passosFluxo.indexOf(data.fichasMinhaConta.estado)
                return (
                  <div className="space-y-2">
                    {/* Barra de progresso do fluxo */}
                    <div className="flex items-center gap-1">
                      {passosFluxo.map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all ${i <= idx ? 'bg-indigo-500' : 'bg-zinc-100'}`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-zinc-500">Estado actual</p>
                      {est && (
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${est.cls}`}
                        >
                          {est.label}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })()
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
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

      {/* Progresso do departamento */}
      {data.fichasDoDept.length > 0 && (
        <Card className="border-zinc-200 shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-800">
                    Progresso do departamento
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {data.fichasConcluidas} de {data.fichasDoDept.length} fichas
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

      {/* Técnicos a aguardar avaliação (estado Pendente) */}
      {data.fichasParaAvaliar.length > 0 && (
        <Card className="border-purple-200 shadow-sm overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-purple-400 to-violet-400" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <UserCheck className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-purple-900">
                    Aguardam a sua avaliação
                  </p>
                  <p className="text-[11px] text-purple-600 mt-0.5">
                    {data.fichasParaAvaliar.length} ficha
                    {data.fichasParaAvaliar.length !== 1 ? 's' : ''} pendente
                    {data.fichasParaAvaliar.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <Link
                href="/chefe/avaliar"
                className="flex items-center gap-1 text-xs text-purple-700 hover:text-purple-900 font-medium transition-colors"
              >
                Ver todas <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-2">
              {data.fichasParaAvaliar.map((f) => (
                <Link
                  key={f.id}
                  href={`/chefe/avaliar`}
                  className="group flex items-center gap-3 rounded-xl bg-white border border-purple-100 hover:border-purple-300 px-4 py-3 transition-colors"
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
                      {f.avaliado.cargo}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-zinc-100 text-zinc-600 border-zinc-200 shrink-0">
                    Pendente
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-purple-400 transition-colors" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Técnicos sem ficha */}
      {data.tecnicosSemFicha.length > 0 && (
        <Card className="border-red-200 shadow-none bg-red-50/40">
          <CardContent className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800">
                  Técnicos sem ficha no período
                </p>
                <p className="text-[11px] text-red-600 mt-0.5">
                  O administrador ainda não criou as fichas
                </p>
              </div>
              <span className="text-xs font-bold text-red-600 bg-red-100 px-2.5 py-0.5 rounded-full">
                {data.tecnicosSemFicha.length}
              </span>
            </div>
            <div className="space-y-2">
              {data.tecnicosSemFicha.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 rounded-xl bg-white border border-red-100 px-4 py-2.5"
                >
                  <Avatar className="h-7 w-7 shrink-0 ring-1 ring-red-200">
                    <AvatarImage src={u.avatarUrl} />
                    <AvatarFallback className="bg-zinc-100 text-zinc-600 text-[10px] font-semibold">
                      {getInitials(u.nomeCompleto)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 leading-tight">
                      {u.nomeCompleto}
                    </p>
                    <p className="text-xs text-zinc-400">{u.cargo}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Atalhos */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: 'Avaliar Técnicos',
            href: '/chefe/avaliar',
            icon: <UserCheck className="h-4 w-4 text-purple-500" />,
            desc: 'Avaliar técnicos do dept.',
          },
          {
            label: 'Fichas',
            href: '/chefe/fichas',
            icon: <FileText className="h-4 w-4 text-zinc-500" />,
            desc: 'Ver fichas do departamento',
          },
          // {
          //   label: 'Minha avaliação',
          //   href: '/chefe/avaliacao',
          //   icon: <ClipboardList className="h-4 w-4 text-indigo-500" />,
          //   desc: 'Ver a minha ficha',
          // },
          // {
          //   label: 'Departamento',
          //   href: '/chefe/equipa',
          //   icon: <Users className="h-4 w-4 text-blue-500" />,
          //   desc: 'Membros da equipa',
          // },
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
