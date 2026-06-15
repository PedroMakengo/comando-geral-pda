'use client'

import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  Users,
  FileText,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ChevronRight,
  Activity,
  TrendingDown,
  Award,
  Building2,
  BarChart3,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ── Tipos ─────────────────────────────────────────────────────
interface PeriodoBasico {
  id: string
  nome: string
  activo: boolean
}
interface Periodo {
  id: string
  nome: string
  dataInicio: string
  dataFim: string
  activo: boolean
}
interface Utilizador {
  id: string
  nomeCompleto: string
  numeroMecanografico: string
  avatarUrl?: string
  cargo?: string
  departamento?: { id: string; nome: string } | null
  pontuacao?: number | null
  totalNegativas?: number
}
interface DashboardData {
  periodo: Periodo | null
  todosOsPeriodos: PeriodoBasico[]
  totalFuncionarios: number
  fichasConcluidas: number
  fichasPendentes: number
  semFicha: Utilizador[]
  avaliacoesPorEstado: { estado: string; total: number; fill: string }[]
  porDepartamento: {
    departamento: string
    total: number
    concluidas: number
    mediaPontuacao: number | null
  }[]
  porDirecao: {
    direcao: string
    total: number
    concluidas: number
    mediaPontuacao: number | null
  }[]
  distribuicaoPontuacao: {
    maxima: number
    minima: number
    media: number
    positivas: number
    negativas: number
    bandas: { banda: string; count: number; fill: string }[]
  }
  topPerformers: Utilizador[]
  bottomPerformers: Utilizador[]
  alertasNegativos: Utilizador[]
  progresso: number
}

// ── Helpers ───────────────────────────────────────────────────
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
function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}
function pontuacaoCor(p: number) {
  if (p >= 4.5) return 'text-emerald-600'
  if (p >= 3.5) return 'text-blue-600'
  if (p >= 2.5) return 'text-amber-600'
  return 'text-red-600'
}
function pontuacaoBg(p: number) {
  if (p >= 4.5) return 'bg-emerald-50 border-emerald-200'
  if (p >= 3.5) return 'bg-blue-50 border-blue-200'
  if (p >= 2.5) return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-3.5 py-2.5 text-xs shadow-lg">
      {label && (
        <p className="mb-1.5 font-semibold text-zinc-800 text-[11px] uppercase tracking-wide">
          {label}
        </p>
      )}
      {payload.map((p: any, i: number) => (
        <p key={i} className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ background: p.color ?? p.fill }}
          />
          <span className="text-zinc-500">{p.name}:</span>
          <span className="font-bold text-zinc-800">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-zinc-100 rounded-md animate-pulse ${className}`} />
}

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  trend,
  trendUp,
  accent,
}: {
  label: string
  value: number | string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  trend?: string
  trendUp?: boolean
  accent?: string
}) {
  return (
    <Card className="relative overflow-hidden border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
      {accent && (
        <div className={`absolute top-0 left-0 right-0 h-[3px] ${accent}`} />
      )}
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-2">
              {label}
            </p>
            <p className="text-3xl font-bold text-zinc-900 leading-none tracking-tight">
              {value}
            </p>
            {trend && (
              <p
                className={`text-[11px] font-medium mt-2 flex items-center gap-1 ${trendUp ? 'text-emerald-600' : 'text-zinc-400'}`}
              >
                {trendUp && <ArrowUpRight className="h-3 w-3" />}
                {trend}
              </p>
            )}
          </div>
          <div
            className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}
          >
            <span className={iconColor}>{icon}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Performer Card ────────────────────────────────────────────
function PerformerCard({
  user,
  rank,
  top,
}: {
  user: Utilizador
  rank: number
  top: boolean
}) {
  const p = user.pontuacao ?? 0
  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-colors ${top ? 'border-emerald-100 bg-emerald-50/50' : 'border-red-100 bg-red-50/40'}`}
    >
      <span
        className={`text-xs font-bold w-5 text-center ${top ? 'text-emerald-600' : 'text-red-500'}`}
      >
        #{rank}
      </span>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={user.avatarUrl} />
        <AvatarFallback className="bg-zinc-100 text-zinc-600 text-[10px] font-semibold">
          {getInitials(user.nomeCompleto)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-900 truncate leading-tight">
          {user.nomeCompleto}
        </p>
        <p className="text-[11px] text-zinc-400 truncate">
          {user.departamento?.nome ?? '—'}
        </p>
      </div>
      <span className={`text-sm font-bold shrink-0 ${pontuacaoCor(p)}`}>
        {p.toFixed(1)}
      </span>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export default function MasterHomePage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodoSel, setPeriodoSel] = useState<string>('_activo')

  const loadData = async (periodoId?: string) => {
    setLoading(true)
    try {
      const url =
        periodoId && periodoId !== '_activo'
          ? `/api/dashboard/master?periodoId=${periodoId}`
          : '/api/dashboard/master'
      const res = await fetch(url, { credentials: 'include' })
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error('[MASTER_DASHBOARD]', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handlePeriodoChange = (val: string) => {
    setPeriodoSel(val)
    loadData(val === '_activo' ? undefined : val)
  }

  if (loading)
    return (
      <div className="space-y-6">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-24" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )

  if (!data) return null

  const dias = data.periodo ? diasRestantes(data.periodo.dataFim) : 0
  const dist = data.distribuicaoPontuacao

  const stats = [
    {
      label: 'Total Funcionários',
      value: data.totalFuncionarios,
      icon: <Users className="h-5 w-5" />,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      accent: 'bg-blue-500',
    },
    {
      label: 'Fichas Validadas',
      value: data.fichasConcluidas,
      icon: <CheckCircle2 className="h-5 w-5" />,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      trend: `${data.progresso}% do total`,
      trendUp: data.fichasConcluidas > 0,
      accent: 'bg-emerald-500',
    },
    {
      label: 'Em Processo',
      value: data.fichasPendentes,
      icon: <Clock className="h-5 w-5" />,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      accent: 'bg-amber-500',
    },
    {
      label: 'Sem Ficha',
      value: data.semFicha.length,
      icon: <AlertTriangle className="h-5 w-5" />,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
      trend:
        data.semFicha.length > 0 ? 'Atenção necessária' : 'Todos com ficha',
      accent: data.semFicha.length > 0 ? 'bg-red-500' : 'bg-emerald-500',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Cabeçalho + selector de período */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Visão geral do sistema de avaliação
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Selector de período */}
          {data.todosOsPeriodos.length > 0 && (
            <Select value={periodoSel} onValueChange={handlePeriodoChange}>
              <SelectTrigger className="h-9 w-56 text-sm border-zinc-200 rounded-lg">
                <SelectValue placeholder="Seleccionar período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_activo">Período activo</SelectItem>
                {data.todosOsPeriodos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                    {p.activo ? ' ✓' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Chip do período */}
          {data.periodo ? (
            <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 shadow-sm">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <CalendarDays className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900 leading-tight">
                  {data.periodo.nome}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {formatDate(data.periodo.dataInicio)} →{' '}
                  {formatDate(data.periodo.dataFim)}
                </p>
              </div>
              <Separator orientation="vertical" className="h-8 mx-1" />
              <div className="shrink-0 text-right">
                {dias > 0 ? (
                  <>
                    <p className="text-lg font-bold text-indigo-600 leading-none">
                      {dias}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">dias</p>
                  </>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    Encerrado
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-2.5">
              <CalendarDays className="h-4 w-4 text-zinc-400" />
              <p className="text-xs text-zinc-500">Nenhum período activo</p>
            </div>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <StatCard key={i} {...s} />
        ))}
      </div>

      {/* Progresso global */}
      <Card className="border-zinc-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Activity className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-800">
                  Progresso global do período
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {data.fichasConcluidas} fichas validadas de{' '}
                  {data.totalFuncionarios} funcionários
                </p>
              </div>
            </div>
            <span className="text-2xl font-bold text-emerald-600">
              {data.progresso}%
            </span>
          </div>
          <Progress value={data.progresso} className="h-2.5 mt-4" />
          {data.fichasPendentes > 0 && (
            <p className="text-[11px] text-zinc-400 mt-2.5 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {data.fichasPendentes}{' '}
              {data.fichasPendentes === 1 ? 'ficha ainda' : 'fichas ainda'} em
              processo
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Alertas negativos — destaque imediato ── */}
      {data.alertasNegativos.length > 0 && (
        <Card className="border-red-300 shadow-md overflow-hidden">
          <div className="h-[4px] bg-gradient-to-r from-red-500 to-rose-600" />
          <CardHeader className="px-6 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-red-900">
                    ⚠ Alerta — Avaliações Negativas Repetidas
                  </CardTitle>
                  <CardDescription className="text-[11px] text-red-600 mt-0.5">
                    Estes funcionários têm 2 ou mais avaliações negativas
                    (pontuação &lt; 3.0). Acção do chefe necessária.
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant="destructive"
                className="text-[11px] px-2.5 shrink-0"
              >
                {data.alertasNegativos.length}{' '}
                {data.alertasNegativos.length === 1 ? 'alerta' : 'alertas'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-5">
            <div className="space-y-2">
              {data.alertasNegativos.map((u, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 border border-red-200"
                >
                  <Avatar className="h-9 w-9 shrink-0 ring-2 ring-red-200">
                    <AvatarImage src={u.avatarUrl} />
                    <AvatarFallback className="bg-red-100 text-red-700 text-[10px] font-bold">
                      {getInitials(u.nomeCompleto)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-900 truncate">
                      {u.nomeCompleto}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {u.cargo ?? '—'} · {u.departamento?.nome ?? '—'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-xs font-bold text-red-700 bg-red-100 border border-red-300 px-2.5 py-1 rounded-full">
                      {u.totalNegativas}× negativa
                      {(u.totalNegativas ?? 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Métricas de pontuação ── */}
      {data.fichasConcluidas > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Pontuação Máxima',
              value: dist.maxima.toFixed(1),
              icon: <Award className="h-4 w-4" />,
              bg: 'bg-emerald-50 border-emerald-200',
              color: 'text-emerald-700',
            },
            {
              label: 'Pontuação Média',
              value: dist.media.toFixed(1),
              icon: <BarChart3 className="h-4 w-4" />,
              bg: 'bg-blue-50 border-blue-200',
              color: 'text-blue-700',
            },
            {
              label: 'Pontuação Mínima',
              value: dist.minima.toFixed(1),
              icon: <TrendingDown className="h-4 w-4" />,
              bg: 'bg-red-50 border-red-200',
              color: 'text-red-700',
            },
            {
              label: 'Avaliações Positivas',
              value: `${dist.positivas}/${data.fichasConcluidas}`,
              icon: <TrendingUp className="h-4 w-4" />,
              bg:
                dist.negativas > 0
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-emerald-50 border-emerald-200',
              color: dist.negativas > 0 ? 'text-amber-700' : 'text-emerald-700',
            },
          ].map((s, i) => (
            <Card key={i} className={`border shadow-none ${s.bg}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`${s.color} opacity-70`}>{s.icon}</div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                    {s.label}
                  </p>
                  <p
                    className={`text-xl font-bold mt-0.5 leading-none ${s.color}`}
                  >
                    {s.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Gráficos linha 1: estado + bandas ── */}
      {(data.avaliacoesPorEstado.length > 0 || dist.bandas.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Donut — por estado */}
          {data.avaliacoesPorEstado.length > 0 && (
            <Card className="border-zinc-200 shadow-sm">
              <CardHeader className="pb-2 px-6 pt-5">
                <CardTitle className="text-sm font-semibold text-zinc-800">
                  Avaliações por estado
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Distribuição actual das fichas
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-5">
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie
                      data={data.avaliacoesPorEstado}
                      dataKey="total"
                      nameKey="estado"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={88}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {data.avaliacoesPorEstado.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={7}
                      wrapperStyle={{ paddingTop: '8px' }}
                      formatter={(v) => (
                        <span className="text-[11px] text-zinc-500">{v}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Bar — bandas de pontuação */}
          {dist.bandas.length > 0 && (
            <Card className="border-zinc-200 shadow-sm">
              <CardHeader className="pb-2 px-6 pt-5">
                <CardTitle className="text-sm font-semibold text-zinc-800">
                  Distribuição de pontuações
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Fichas validadas por faixa de nota
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 pb-5">
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart
                    data={dist.bandas}
                    barCategoryGap="30%"
                    margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="banda"
                      tick={{ fill: '#9ca3af', fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="count"
                      name="Funcionários"
                      radius={[6, 6, 0, 0]}
                    >
                      {dist.bandas.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Gráficos linha 2: departamento + direcção ── */}
      {(data.porDepartamento.length > 0 || data.porDirecao.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Bar — por departamento */}
          {data.porDepartamento.length > 0 && (
            <Card className="border-zinc-200 shadow-sm">
              <CardHeader className="pb-2 px-6 pt-5">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-zinc-400" />
                  <div>
                    <CardTitle className="text-sm font-semibold text-zinc-800">
                      Por departamento
                    </CardTitle>
                    <CardDescription className="text-[11px]">
                      Total vs validadas
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-5">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={data.porDepartamento}
                    barGap={3}
                    barCategoryGap="28%"
                    margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="departamento"
                      tick={{ fill: '#9ca3af', fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                    />
                    <YAxis
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="total"
                      name="Total"
                      fill="#e0e7ff"
                      radius={[5, 5, 0, 0]}
                    />
                    <Bar
                      dataKey="concluidas"
                      name="Validadas"
                      fill="#6366f1"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
                {/* Tabela de médias por departamento */}
                {data.porDepartamento.some((d) => d.mediaPontuacao != null) && (
                  <div className="mt-3 space-y-1">
                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide px-1">
                      Média por departamento
                    </p>
                    {data.porDepartamento
                      .filter((d) => d.mediaPontuacao != null)
                      .map((d, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-2 py-1 rounded text-xs"
                        >
                          <span className="text-zinc-600 truncate max-w-[60%]">
                            {d.departamento}
                          </span>
                          <span
                            className={`font-bold ${pontuacaoCor(d.mediaPontuacao!)}`}
                          >
                            {d.mediaPontuacao!.toFixed(1)}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Bar — por direcção */}
          {data.porDirecao.length > 0 && (
            <Card className="border-zinc-200 shadow-sm">
              <CardHeader className="pb-2 px-6 pt-5">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-zinc-400" />
                  <div>
                    <CardTitle className="text-sm font-semibold text-zinc-800">
                      Por direcção
                    </CardTitle>
                    <CardDescription className="text-[11px]">
                      Total vs validadas por direcção
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-5">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={data.porDirecao}
                    barGap={3}
                    barCategoryGap="28%"
                    margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="direcao"
                      tick={{ fill: '#9ca3af', fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                    />
                    <YAxis
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="total"
                      name="Total"
                      fill="#dbeafe"
                      radius={[5, 5, 0, 0]}
                    />
                    <Bar
                      dataKey="concluidas"
                      name="Validadas"
                      fill="#3b82f6"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
                {data.porDirecao.some((d) => d.mediaPontuacao != null) && (
                  <div className="mt-3 space-y-1">
                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide px-1">
                      Média por direcção
                    </p>
                    {data.porDirecao
                      .filter((d) => d.mediaPontuacao != null)
                      .map((d, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-2 py-1 rounded text-xs"
                        >
                          <span className="text-zinc-600 truncate max-w-[60%]">
                            {d.direcao}
                          </span>
                          <span
                            className={`font-bold ${pontuacaoCor(d.mediaPontuacao!)}`}
                          >
                            {d.mediaPontuacao!.toFixed(1)}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Top & Bottom performers ── */}
      {(data.topPerformers.length > 0 || data.bottomPerformers.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.topPerformers.length > 0 && (
            <Card className="border-zinc-200 shadow-sm overflow-hidden">
              <div className="h-[3px] bg-gradient-to-r from-emerald-400 to-teal-400" />
              <CardHeader className="px-6 pt-5 pb-3">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-600" />
                  <CardTitle className="text-sm font-semibold text-zinc-800">
                    Melhores avaliações
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-5 space-y-2">
                {data.topPerformers.map((u, i) => (
                  <PerformerCard key={u.id} user={u} rank={i + 1} top />
                ))}
              </CardContent>
            </Card>
          )}
          {data.bottomPerformers.length > 0 && (
            <Card className="border-zinc-200 shadow-sm overflow-hidden">
              <div className="h-[3px] bg-gradient-to-r from-red-400 to-rose-400" />
              <CardHeader className="px-6 pt-5 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <CardTitle className="text-sm font-semibold text-zinc-800">
                    Avaliações mais baixas
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-5 space-y-2">
                {data.bottomPerformers.map((u, i) => (
                  <PerformerCard key={u.id} user={u} rank={i + 1} top={false} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Sem ficha */}
      {data.semFicha.length > 0 && (
        <Card className="border-red-200 shadow-sm overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-red-400 to-rose-500" />
          <CardHeader className="px-6 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-zinc-800">
                    Funcionários sem ficha
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    No período seleccionado — requerem atenção
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant="destructive"
                className="shrink-0 text-[11px] px-2.5"
              >
                {data.semFicha.length}{' '}
                {data.semFicha.length === 1 ? 'funcionário' : 'funcionários'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-5">
            <div className="space-y-2">
              {data.semFicha.slice(0, 8).map((u, i) => (
                <div
                  key={i}
                  className="group flex items-center justify-between rounded-lg bg-zinc-50 hover:bg-red-50/60 border border-zinc-100 hover:border-red-100 px-4 py-2.5 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-8 w-8 shrink-0 ring-1 ring-zinc-200">
                      <AvatarImage src={u.avatarUrl} />
                      <AvatarFallback className="bg-white text-zinc-600 text-[10px] font-semibold">
                        {getInitials(u.nomeCompleto)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-zinc-800 truncate leading-tight">
                        {u.nomeCompleto}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                        {u.numeroMecanografico}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-zinc-500 bg-white border border-zinc-200 px-2.5 py-1 rounded-full">
                      {u.departamento?.nome ?? '—'}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-red-400 transition-colors" />
                  </div>
                </div>
              ))}
              {data.semFicha.length > 8 && (
                <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-2.5 text-center">
                  <p className="text-xs font-medium text-red-600">
                    + {data.semFicha.length - 8} funcionários adicionais sem
                    ficha
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!data.periodo && data.fichasConcluidas === 0 && (
        <Card className="border-dashed border-zinc-200 shadow-none">
          <CardContent className="p-16 text-center">
            <div className="h-14 w-14 rounded-lg bg-zinc-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-7 w-7 text-zinc-300" />
            </div>
            <p className="text-sm font-semibold text-zinc-600">
              Sem dados ainda
            </p>
            <p className="text-xs text-zinc-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
              Crie um período de avaliação e registe os funcionários para
              começar a ver os indicadores.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
