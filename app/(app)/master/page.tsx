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

// ── Tipos ─────────────────────────────────────────────────────
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
  departamento?: { id: string; nome: string } | null
}
interface DashboardData {
  periodo: Periodo | null
  totalFuncionarios: number
  fichasConcluidas: number
  fichasPendentes: number
  semFicha: Utilizador[]
  avaliacoesPorEstado: { estado: string; total: number; fill: string }[]
  porDepartamento: { departamento: string; total: number; concluidas: number }[]
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

const estadoLabelMap: Record<string, string> = {
  Pendente: 'Pendente',
  AutoAvaliacao: 'Auto-avaliação',
  AvaliadoPorChefe: 'Avaliado p/ Chefe',
  EmReavaliacao: 'Em Reavaliação',
  Reavaliado: 'Reavaliado',
  ValidadoPorDirector: 'Validado',
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-sm border border-zinc-200/80 bg-white/95 backdrop-blur-sm px-3.5 py-2.5 text-xs shadow-sm shadow-zinc-900/10">
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
  return <div className={`bg-zinc-100 rounded-sm animate-pulse ${className}`} />
}

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  trend?: string
  trendUp?: boolean
  accent?: string
}
function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  trend,
  trendUp,
  accent,
}: StatCardProps) {
  return (
    <Card className="relative overflow-hidden border-zinc-200/80 shadow-sm hover:shadow-md transition-shadow duration-200">
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
            className={`h-10 w-10 rounded-sm flex items-center justify-center shrink-0 ${iconBg}`}
          >
            <span className={`${iconColor}`}>{icon}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Componente principal ──────────────────────────────────────
export default function MasterHomePage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/master', { credentials: 'include' })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
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
        <Skeleton className="h-52" />
      </div>
    )
  }

  if (!data) return null

  const dias = data.periodo ? diasRestantes(data.periodo.dataFim) : 0

  const stats: StatCardProps[] = [
    {
      label: 'Total de Funcionários',
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
      {/* ── Cabeçalho ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Visão geral do sistema de avaliação
          </p>
        </div>

        {data.periodo ? (
          <div className="flex items-center gap-3 rounded-sm border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <div className="h-9 w-9 rounded-sm bg-indigo-50 flex items-center justify-center shrink-0">
              <CalendarDays className="h-4.5 w-4.5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 leading-tight">
                {data.periodo.nome}
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-tight">
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
                  <p className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
                    dias
                  </p>
                </>
              ) : (
                <Badge variant="secondary" className="text-[10px]">
                  Encerrado
                </Badge>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-sm border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3">
            <CalendarDays className="h-4 w-4 text-zinc-400" />
            <p className="text-xs text-zinc-500">Nenhum período activo</p>
          </div>
        )}
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <StatCard key={i} {...s} />
        ))}
      </div>

      {/* ── Progresso global ── */}
      <Card className="border-zinc-200/80 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-sm bg-emerald-50 flex items-center justify-center">
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
            <div className="text-right shrink-0">
              <span className="text-2xl font-bold text-emerald-600">
                {data.progresso}%
              </span>
            </div>
          </div>
          <div className="mt-4">
            <Progress value={data.progresso} className="h-2.5" />
          </div>
          {data.progresso < 100 && data.fichasPendentes > 0 && (
            <p className="text-[11px] text-zinc-400 mt-2.5 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {data.fichasPendentes}{' '}
              {data.fichasPendentes === 1 ? 'ficha ainda' : 'fichas ainda'} em
              processo
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Gráficos ── */}
      {(data.avaliacoesPorEstado.length > 0 ||
        data.porDepartamento.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Donut — por estado */}
          {data.avaliacoesPorEstado.length > 0 && (
            <Card className="border-zinc-200/80 shadow-sm">
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
                      data={data.avaliacoesPorEstado.map((d) => ({
                        ...d,
                        estado: estadoLabelMap[d.estado] ?? d.estado,
                      }))}
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

          {/* Bar — por departamento */}
          {data.porDepartamento.length > 0 && (
            <Card className="border-zinc-200/80 shadow-sm">
              <CardHeader className="pb-2 px-6 pt-5">
                <CardTitle className="text-sm font-semibold text-zinc-800">
                  Por departamento
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Total de fichas vs concluídas
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 pb-5">
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart
                    data={data.porDepartamento}
                    barGap={3}
                    barCategoryGap="28%"
                    margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="departamento"
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      width={60}
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
                      name="Concluídas"
                      fill="#6366f1"
                      radius={[5, 5, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Sem ficha ── */}
      {data.semFicha.length > 0 && (
        <Card className="border-red-200/80 shadow-sm overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-red-400 via-red-500 to-rose-500" />
          <CardHeader className="px-6 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-sm bg-red-50 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-zinc-800">
                    Funcionários sem ficha
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    No período activo — requerem atenção imediata
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
                  className="group flex items-center justify-between rounded-sm bg-zinc-50 hover:bg-red-50/60 border border-zinc-100 hover:border-red-100 px-4 py-2.5 transition-colors duration-150"
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
                <div className="rounded-sm bg-red-50 border border-red-100 px-4 py-2.5 text-center">
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
            <div className="h-14 w-14 rounded-sm bg-zinc-100 flex items-center justify-center mx-auto mb-4">
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
