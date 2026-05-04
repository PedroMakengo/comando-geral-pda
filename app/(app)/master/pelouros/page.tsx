'use client'

import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Network,
  Layers,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { toast } from 'sonner'
import { ExportMenu } from '../../../../components/export-menu'

interface Pelouro {
  id: string
  nome: string
  descricao?: string | null
  dataCriacao: string
  _count?: { direcoes: number; utilizadores: number }
}
interface Meta {
  total: number
  page: number
  limit: number
  totalPages: number
}

type SortKey = 'nome' | 'direcoes' | 'utilizadores'
interface SortState {
  key: SortKey | null
  direction: 'asc' | 'desc'
}

function toArray<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res
  if (res && typeof res === 'object' && Array.isArray((res as any).data))
    return (res as any).data
  return []
}
function getSortValue(p: Pelouro, key: SortKey): string | number {
  switch (key) {
    case 'nome':
      return p.nome ?? ''
    case 'direcoes':
      return p._count?.direcoes ?? 0
    case 'utilizadores':
      return p._count?.utilizadores ?? 0
  }
}
function sortPelouros(list: Pelouro[], sort: SortState): Pelouro[] {
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

const schema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres.'),
  descricao: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function PelourosPage() {
  const [pelouros, setPelouros] = useState<Pelouro[]>([])
  const [meta, setMeta] = useState<Meta>({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<SortState>({ key: null, direction: 'asc' })
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Pelouro | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Pelouro | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const handleSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )
  const sorted = sortPelouros(pelouros, sort)

  const fetchPelouros = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '15')
      if (search !== '') params.set('search', search)
      const res = await fetch(`/api/pelouros?${params}`, {
        credentials: 'include',
      })
      const data = await res.json()
      setPelouros(toArray<Pelouro>(data))
      if (data.meta) setMeta(data.meta)
    } catch {
      toast.error('Não foi possível carregar os pelouros.')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchPelouros()
  }, [fetchPelouros])
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const abrirNovo = () => {
    setEditTarget(null)
    reset({ nome: '', descricao: '' })
    setSheetOpen(true)
  }
  const abrirEditar = (p: Pelouro) => {
    setEditTarget(p)
    reset({ nome: p.nome, descricao: p.descricao ?? '' })
    setSheetOpen(true)
  }

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    try {
      const res = await fetch(
        editTarget ? `/api/pelouros/${editTarget.id}` : '/api/pelouros',
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
      toast.success(editTarget ? 'Pelouro actualizado' : 'Pelouro criado', {
        description: `"${values.nome}" foi ${editTarget ? 'actualizado' : 'criado'} com sucesso.`,
      })
      setSheetOpen(false)
      fetchPelouros()
    } finally {
      setSubmitting(false)
    }
  }

  const confirmarDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/pelouros/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
        return
      }
      toast.success('Pelouro eliminado', {
        description: `"${deleteTarget.nome}" foi eliminado.`,
      })
      setDeleteTarget(null)
      fetchPelouros()
    } finally {
      setDeleting(false)
    }
  }

  const totalDirecoes = pelouros.reduce(
    (s, p) => s + (p._count?.direcoes ?? 0),
    0,
  )
  const totalUsers = pelouros.reduce(
    (s, p) => s + (p._count?.utilizadores ?? 0),
    0,
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            Pelouros
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {sorted.length}{' '}
            {sorted.length === 1 ? 'pelouro registado' : 'pelouros registados'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu tipo="pelouros" />
          <Button
            onClick={abrirNovo}
            size="sm"
            className="gap-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg h-9 px-4 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Novo Pelouro
          </Button>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: 'Pelouros',
            value: sorted.length,
            icon: <Network className="h-4 w-4" />,
            bg: 'bg-amber-50 border-amber-200',
            color: 'text-amber-500',
          },
          {
            label: 'Direções',
            value: totalDirecoes,
            icon: <Layers className="h-4 w-4" />,
            bg: 'bg-blue-50 border-blue-200',
            color: 'text-blue-500',
          },
          {
            label: 'Funcionários',
            value: totalUsers,
            icon: <Users className="h-4 w-4" />,
            bg: 'bg-emerald-50 border-emerald-200',
            color: 'text-emerald-600',
          },
        ].map((s, i) => (
          <Card key={i} className={`border shadow-none ${s.bg}`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                  {s.label}
                </p>
                <p className="text-2xl font-bold text-zinc-900 mt-0.5 leading-none">
                  {s.value}
                </p>
              </div>
              <div className={`${s.color} opacity-60`}>{s.icon}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pesquisa */}
      <Card className="border-zinc-200 shadow-none">
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Pesquisar pelouro..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-9 text-sm border-zinc-200 rounded-lg bg-zinc-50 focus:bg-white transition-colors"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80">
                <SortHeader
                  label="Pelouro"
                  sortKey="nome"
                  sort={sort}
                  onSort={handleSort}
                />
                <th className="text-left px-4 py-3 font-medium text-zinc-400 text-[11px] uppercase tracking-wider">
                  Descrição
                </th>
                <SortHeader
                  label="Direções"
                  sortKey="direcoes"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Funcionários"
                  sortKey="utilizadores"
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
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div
                          className={`h-3.5 bg-zinc-100 rounded-full animate-pulse ${j === 0 ? 'w-36' : 'w-20'}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center">
                        <Network className="h-6 w-6 text-zinc-300" />
                      </div>
                      <p className="text-sm font-medium text-zinc-500">
                        Nenhum pelouro encontrado
                      </p>
                      <p className="text-xs text-zinc-400">
                        Crie o primeiro pelouro para começar
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                sorted.map((p) => (
                  <tr
                    key={p.id}
                    className="group hover:bg-zinc-50/60 transition-colors duration-100"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
                          <Network className="h-4 w-4 text-amber-500" />
                        </div>
                        <p className="font-medium text-zinc-900">{p.nome}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs max-w-[240px]">
                      <span className="truncate block">
                        {p.descricao ?? (
                          <span className="text-zinc-300">—</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${(p._count?.direcoes ?? 0) > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-zinc-50 text-zinc-400 border border-zinc-100'}`}
                      >
                        <Layers className="h-3 w-3" />
                        {p._count?.direcoes ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${(p._count?.utilizadores ?? 0) > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-zinc-50 text-zinc-400 border border-zinc-100'}`}
                      >
                        <Users className="h-3 w-3" />
                        {p._count?.utilizadores ?? 0}
                      </span>
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
                          className="w-40 rounded-xl shadow-xl border-zinc-200"
                        >
                          <DropdownMenuItem
                            onClick={() => abrirEditar(p)}
                            className="gap-2.5 text-sm cursor-pointer rounded-lg"
                          >
                            <Pencil className="h-3.5 w-3.5 text-zinc-400" />{' '}
                            Editar
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
                ))
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
                className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-zinc-600 px-2 font-medium">
                {page} / {meta.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
          <SheetHeader className="px-6 py-5 border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-3">
              <div
                className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${editTarget ? 'bg-indigo-50' : 'bg-amber-50'}`}
              >
                {editTarget ? (
                  <Pencil className="h-4 w-4 text-indigo-600" />
                ) : (
                  <Network className="h-4 w-4 text-amber-600" />
                )}
              </div>
              <div>
                <SheetTitle className="text-base font-semibold text-zinc-900">
                  {editTarget ? 'Editar Pelouro' : 'Novo Pelouro'}
                </SheetTitle>
                <SheetDescription className="text-[12px] text-zinc-500 mt-0.5">
                  {editTarget
                    ? 'Actualize os dados do pelouro.'
                    : 'Preencha os dados do novo pelouro.'}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form
              id="form-pelouro"
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-zinc-700">
                  Nome do pelouro
                </Label>
                <Input
                  {...register('nome')}
                  placeholder="ex: Pelouro das Finanças"
                  className="h-9 rounded-lg border-zinc-200 text-sm"
                />
                {errors.nome && (
                  <p className="text-xs text-red-500">{errors.nome.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-zinc-700">
                  Descrição{' '}
                  <span className="text-zinc-400 font-normal">(opcional)</span>
                </Label>
                <Textarea
                  {...register('descricao')}
                  placeholder="Breve descrição do pelouro..."
                  className="rounded-lg border-zinc-200 text-sm resize-none"
                  rows={3}
                />
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
              form="form-pelouro"
              disabled={submitting}
              className="flex-1 h-9 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-sm font-medium shadow-sm"
            >
              {submitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : editTarget ? (
                'Guardar alterações'
              ) : (
                'Criar pelouro'
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

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
              Eliminar pelouro?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-zinc-500">
              Tem a certeza que quer eliminar{' '}
              <strong className="text-zinc-800">"{deleteTarget?.nome}"</strong>?
              Esta acção não pode ser revertida.
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
              {deleting ? 'A eliminar...' : 'Eliminar pelouro'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
