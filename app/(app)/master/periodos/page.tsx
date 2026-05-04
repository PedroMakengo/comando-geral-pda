'use client'

import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  CalendarRange,
  Play,
  StopCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { ExportMenu } from '../../../../components/export-menu'

// ── Tipos ─────────────────────────────────────────────────────
interface Periodo {
  id: string
  nome: string
  dataInicio: string
  dataFim: string
  activo: boolean
  createdAt: string
  _count?: { fichas: number }
}
interface Meta {
  total: number
  page: number
  limit: number
  totalPages: number
}
type SortKey = 'nome' | 'dataInicio' | 'dataFim' | 'fichas' | 'estado'
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
function diasRestantes(dataFim: string) {
  return Math.ceil(
    (new Date(dataFim).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  )
}
function getSortValue(p: Periodo, key: SortKey): string | number {
  switch (key) {
    case 'nome':
      return p.nome ?? ''
    case 'dataInicio':
      return p.dataInicio ?? ''
    case 'dataFim':
      return p.dataFim ?? ''
    case 'fichas':
      return p._count?.fichas ?? 0
    case 'estado':
      return p.activo ? 0 : 1
  }
}
function sortPeriodos(list: Periodo[], sort: SortState): Periodo[] {
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
function gerarSugestoes() {
  const ano = new Date().getFullYear()
  return [
    {
      label: `Q1 ${ano}`,
      nome: `Q1 ${ano} — 1º Trimestre`,
      inicio: `${ano}-01-01`,
      fim: `${ano}-03-31`,
    },
    {
      label: `Q2 ${ano}`,
      nome: `Q2 ${ano} — 2º Trimestre`,
      inicio: `${ano}-04-01`,
      fim: `${ano}-06-30`,
    },
    {
      label: `Q3 ${ano}`,
      nome: `Q3 ${ano} — 3º Trimestre`,
      inicio: `${ano}-07-01`,
      fim: `${ano}-09-30`,
    },
    {
      label: `Q4 ${ano}`,
      nome: `Q4 ${ano} — 4º Trimestre`,
      inicio: `${ano}-10-01`,
      fim: `${ano}-12-31`,
    },
  ]
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

const schema = z
  .object({
    nome: z.string().min(2, 'Nome é obrigatório.'),
    dataInicio: z.string().min(1, 'Data de início é obrigatória.'),
    dataFim: z.string().min(1, 'Data de fim é obrigatória.'),
    activo: z.boolean().optional(),
  })
  .refine((d) => new Date(d.dataFim) > new Date(d.dataInicio), {
    message: 'A data de fim deve ser posterior.',
    path: ['dataFim'],
  })
type FormValues = z.infer<typeof schema>
function toInputDate(iso: string) {
  return new Date(iso).toISOString().split('T')[0]
}

// ── Página ────────────────────────────────────────────────────
export default function PeriodosPage() {
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [meta, setMeta] = useState<Meta>({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<SortState>({ key: null, direction: 'asc' })
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Periodo | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Periodo | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const sugestoes = gerarSugestoes()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const handleSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )
  const sorted = sortPeriodos(periodos, sort)

  const fetchPeriodos = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '15')
      const res = await fetch(`/api/periodos?${params}`, {
        credentials: 'include',
      })
      const data = await res.json()
      setPeriodos(toArray<Periodo>(data))
      if (data.meta) setMeta(data.meta)
    } catch {
      toast.error('Não foi possível carregar os períodos.')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchPeriodos()
  }, [fetchPeriodos])

  const abrirNovo = () => {
    setEditTarget(null)
    reset({ nome: '', dataInicio: '', dataFim: '', activo: false })
    setSheetOpen(true)
  }
  const abrirEditar = (p: Periodo) => {
    setEditTarget(p)
    reset({
      nome: p.nome,
      dataInicio: toInputDate(p.dataInicio),
      dataFim: toInputDate(p.dataFim),
      activo: p.activo,
    })
    setSheetOpen(true)
  }
  const aplicarSugestao = (s: (typeof sugestoes)[0]) => {
    setValue('nome', s.nome)
    setValue('dataInicio', s.inicio)
    setValue('dataFim', s.fim)
  }

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    try {
      const res = await fetch(
        editTarget ? `/api/periodos/${editTarget.id}` : '/api/periodos',
        {
          method: editTarget ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(values),
        },
      )
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Ocorreu um erro.')
        return
      }
      toast.success(editTarget ? 'Período actualizado' : 'Período criado', {
        description: `"${values.nome}" foi ${editTarget ? 'actualizado' : 'criado'} com sucesso.`,
      })
      setSheetOpen(false)
      fetchPeriodos()
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActivo = async (p: Periodo) => {
    setToggling(p.id)
    try {
      const res = await fetch(`/api/periodos/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: p.activo ? 'desactivar' : 'activar' }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
        return
      }
      toast.success(p.activo ? 'Período desactivado' : 'Período activado', {
        description: `"${p.nome}" foi ${p.activo ? 'desactivado' : 'activado'}.`,
      })
      fetchPeriodos()
    } finally {
      setToggling(null)
    }
  }

  const confirmarDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/periodos/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
        return
      }
      toast.success('Período eliminado', {
        description: `"${deleteTarget.nome}" foi eliminado.`,
      })
      setDeleteTarget(null)
      fetchPeriodos()
    } finally {
      setDeleting(false)
    }
  }

  const totalFichas = periodos.reduce((s, p) => s + (p._count?.fichas ?? 0), 0)
  const activo = periodos.find((p) => p.activo)
  const diasRestAtivo = activo ? diasRestantes(activo.dataFim) : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            Períodos de Avaliação
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Gestão trimestral dos ciclos de avaliação
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu tipo="periodos" />
          <Button
            onClick={abrirNovo}
            size="sm"
            className="gap-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg h-9 px-4 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Novo Período
          </Button>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Total',
            value: sorted.length,
            icon: <CalendarDays className="h-4 w-4" />,
            bg: 'bg-white border-zinc-200',
            color: 'text-zinc-500',
          },
          {
            label: 'Activo',
            value: activo ? activo.nome.split('—')[0].trim() : 'Nenhum',
            icon: <CheckCircle2 className="h-4 w-4" />,
            bg: 'bg-emerald-50 border-emerald-200',
            color: 'text-emerald-600',
          },
          {
            label: 'Dias rest.',
            value:
              diasRestAtivo != null && diasRestAtivo > 0 ? diasRestAtivo : '—',
            icon: <Clock className="h-4 w-4" />,
            bg: 'bg-blue-50 border-blue-200',
            color: 'text-blue-600',
          },
          {
            label: 'Fichas',
            value: totalFichas,
            icon: <AlertCircle className="h-4 w-4" />,
            bg: 'bg-amber-50 border-amber-200',
            color: 'text-amber-600',
          },
        ].map((s, i) => (
          <Card key={i} className={`border shadow-none ${s.bg}`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                  {s.label}
                </p>
                <p
                  className={`font-bold text-zinc-900 mt-0.5 leading-none ${typeof s.value === 'string' && s.value.length > 4 ? 'text-sm' : 'text-2xl'}`}
                >
                  {s.value}
                </p>
              </div>
              <div className={`${s.color} opacity-60`}>{s.icon}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabela */}
      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80">
                <SortHeader
                  label="Período"
                  sortKey="nome"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Início"
                  sortKey="dataInicio"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Fim"
                  sortKey="dataFim"
                  sort={sort}
                  onSort={handleSort}
                />
                <th className="text-left px-4 py-3 font-medium text-zinc-400 text-[11px] uppercase tracking-wider">
                  Progresso
                </th>
                <SortHeader
                  label="Fichas"
                  sortKey="fichas"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Estado"
                  sortKey="estado"
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
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div
                          className={`h-3.5 bg-zinc-100 rounded-full animate-pulse ${j === 0 ? 'w-40' : 'w-20'}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center">
                        <CalendarDays className="h-6 w-6 text-zinc-300" />
                      </div>
                      <p className="text-sm font-medium text-zinc-500">
                        Nenhum período criado
                      </p>
                      <p className="text-xs text-zinc-400">
                        Crie o primeiro período para começar as avaliações
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                sorted.map((p) => {
                  const dias = diasRestantes(p.dataFim)
                  const total =
                    (new Date(p.dataFim).getTime() -
                      new Date(p.dataInicio).getTime()) /
                    (1000 * 60 * 60 * 24)
                  const decorridos = total - Math.max(0, dias)
                  const progresso = Math.min(
                    100,
                    Math.max(0, Math.round((decorridos / total) * 100)),
                  )

                  return (
                    <tr
                      key={p.id}
                      className="group hover:bg-zinc-50/60 transition-colors duration-100"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${p.activo ? 'bg-emerald-50' : 'bg-zinc-100'}`}
                          >
                            <CalendarRange
                              className={`h-4 w-4 ${p.activo ? 'text-emerald-500' : 'text-zinc-400'}`}
                            />
                          </div>
                          <div>
                            <p className="font-medium text-zinc-900 leading-tight">
                              {p.nome}
                            </p>
                            {p.activo && dias > 0 && (
                              <p className="text-[11px] text-amber-600 mt-0.5">
                                {dias} dia{dias !== 1 ? 's' : ''} restante
                                {dias !== 1 ? 's' : ''}
                              </p>
                            )}
                            {p.activo && dias <= 0 && (
                              <p className="text-[11px] text-red-500 mt-0.5">
                                Período encerrado
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-zinc-500">
                        {formatDate(p.dataInicio)}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-zinc-500">
                        {formatDate(p.dataFim)}
                      </td>
                      <td className="px-4 py-3 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${progresso >= 100 ? 'bg-zinc-400' : p.activo ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                              style={{ width: `${progresso}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-zinc-400 w-8 text-right font-medium">
                            {progresso}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${(p._count?.fichas ?? 0) > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-zinc-50 text-zinc-400 border border-zinc-100'}`}
                        >
                          {p._count?.fichas ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.activo ? (
                          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-300" />{' '}
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-400">
                            <span className="h-2 w-2 rounded-full bg-zinc-300" />{' '}
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-44 rounded-xl shadow-xl border-zinc-200"
                          >
                            <DropdownMenuItem
                              onClick={() => abrirEditar(p)}
                              className="gap-2.5 text-sm cursor-pointer rounded-lg"
                            >
                              <Pencil className="h-3.5 w-3.5 text-zinc-400" />{' '}
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => toggleActivo(p)}
                              disabled={toggling === p.id}
                              className="gap-2.5 text-sm cursor-pointer rounded-lg"
                            >
                              {p.activo ? (
                                <>
                                  <StopCircle className="h-3.5 w-3.5 text-amber-500" />{' '}
                                  Desactivar
                                </>
                              ) : (
                                <>
                                  <Play className="h-3.5 w-3.5 text-emerald-500" />{' '}
                                  Activar
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(p)}
                              className="gap-2.5 text-sm cursor-pointer rounded-lg text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
          <SheetHeader className="px-6 py-5 border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-3">
              <div
                className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${editTarget ? 'bg-indigo-50' : 'bg-emerald-50'}`}
              >
                {editTarget ? (
                  <Pencil className="h-4 w-4 text-indigo-600" />
                ) : (
                  <CalendarRange className="h-4 w-4 text-emerald-600" />
                )}
              </div>
              <div>
                <SheetTitle className="text-base font-semibold text-zinc-900">
                  {editTarget ? 'Editar Período' : 'Novo Período'}
                </SheetTitle>
                <SheetDescription className="text-[12px] text-zinc-500 mt-0.5">
                  {editTarget
                    ? 'Actualize os dados do período.'
                    : 'Defina as datas do novo ciclo trimestral.'}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form
              id="form-periodo"
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5"
            >
              {!editTarget && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em]">
                    Sugestões trimestrais
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {sugestoes.map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => aplicarSugestao(s)}
                        className="text-left px-3 py-2.5 rounded-lg border border-zinc-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all"
                      >
                        <p className="text-xs font-semibold text-zinc-800">
                          {s.label}
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {s.inicio} → {s.fim}
                        </p>
                      </button>
                    ))}
                  </div>
                  <Separator />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-zinc-700">
                  Nome do período
                </Label>
                <Input
                  {...register('nome')}
                  placeholder="Q2 2026 — 2º Trimestre"
                  className="h-9 rounded-lg border-zinc-200 text-sm"
                />
                {errors.nome && (
                  <p className="text-xs text-red-500">{errors.nome.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-zinc-700">
                    Data de início
                  </Label>
                  <Input
                    {...register('dataInicio')}
                    type="date"
                    className="h-9 rounded-lg border-zinc-200 text-sm"
                  />
                  {errors.dataInicio && (
                    <p className="text-xs text-red-500">
                      {errors.dataInicio.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-zinc-700">
                    Data de fim
                  </Label>
                  <Input
                    {...register('dataFim')}
                    type="date"
                    className="h-9 rounded-lg border-zinc-200 text-sm"
                  />
                  {errors.dataFim && (
                    <p className="text-xs text-red-500">
                      {errors.dataFim.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
                <input
                  type="checkbox"
                  id="activo"
                  {...register('activo')}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-zinc-900"
                />
                <div>
                  <label
                    htmlFor="activo"
                    className="text-sm font-medium text-zinc-700 cursor-pointer"
                  >
                    Activar este período
                  </label>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                    Ao activar, o período anterior será automaticamente
                    desactivado.
                  </p>
                </div>
              </div>
            </form>
          </div>

          <div className="px-6 py-4 border-t border-zinc-100 shrink-0 flex gap-2.5 bg-white">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-9 rounded-lg border-zinc-200 text-sm"
              onClick={() => setSheetOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="form-periodo"
              disabled={submitting}
              className="flex-1 h-9 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-sm font-medium shadow-sm"
            >
              {submitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : editTarget ? (
                'Guardar alterações'
              ) : (
                'Criar período'
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* AlertDialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent className="rounded-2xl border-zinc-200 shadow-2xl">
          <AlertDialogHeader>
            <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center mb-2">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <AlertDialogTitle className="text-base font-semibold">
              Eliminar período?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-zinc-500">
              Tem a certeza que quer eliminar{' '}
              <strong className="text-zinc-800">"{deleteTarget?.nome}"</strong>?
              {(deleteTarget?._count?.fichas ?? 0) > 0 && (
                <span className="block mt-2 text-red-600 font-medium text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  Atenção: existem {deleteTarget?._count?.fichas} fichas
                  associadas. Não será possível eliminar.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-lg border-zinc-200 h-9">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarDelete}
              disabled={deleting}
              className="rounded-lg bg-red-600 hover:bg-red-700 text-white h-9 shadow-sm"
            >
              {deleting ? 'A eliminar...' : 'Eliminar período'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
