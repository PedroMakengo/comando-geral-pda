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
  Building2,
  Users,
  ClipboardList,
  Layers,
  Filter,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
interface Direcao {
  id: string
  nome: string
}
interface Utilizador {
  id: string
  nomeCompleto: string
  avatarUrl?: string
  cargo?: string
}
interface Departamento {
  id: string
  nome: string
  dataCriacao: string
  updatedAt: string
  direcao?: { id: string; nome: string } | null
  chefe?: {
    id: string
    nomeCompleto: string
    email: string
    cargo: string
    avatarUrl?: string
  } | null
  _count?: { utilizadores: number; criterios: number }
}
interface Meta {
  total: number
  page: number
  limit: number
  totalPages: number
}

type SortKey = 'nome' | 'direcao' | 'chefe' | 'utilizadores' | 'criterios'
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
function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}
function getSortValue(d: Departamento, key: SortKey): string | number {
  switch (key) {
    case 'nome':
      return d.nome ?? ''
    case 'direcao':
      return d.direcao?.nome ?? ''
    case 'chefe':
      return d.chefe?.nomeCompleto ?? ''
    case 'utilizadores':
      return d._count?.utilizadores ?? 0
    case 'criterios':
      return d._count?.criterios ?? 0
  }
}
function sortDepts(list: Departamento[], sort: SortState): Departamento[] {
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

const schema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres.'),
  direcaoId: z.string().min(1, 'Direção é obrigatória.'),
  chefeId: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

// ── SortHeader ────────────────────────────────────────────────
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

// ── Página principal ──────────────────────────────────────────
export default function DepartamentosPage() {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [meta, setMeta] = useState<Meta>({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [filtroDirecao, setFiltroDirecao] = useState('_all')
  const [page, setPage] = useState(1)
  const [direcoes, setDirecoes] = useState<Direcao[]>([])
  const [chefes, setChefes] = useState<Utilizador[]>([])
  const [sort, setSort] = useState<SortState>({ key: null, direction: 'asc' })
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Departamento | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Departamento | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

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

  const sorted = sortDepts(departamentos, sort)

  const fetchDepartamentos = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '15')
      if (search !== '') params.set('search', search)
      if (filtroDirecao !== '_all') params.set('direcaoId', filtroDirecao)
      const res = await fetch(`/api/departamentos?${params}`, {
        credentials: 'include',
      })
      const data = await res.json()
      setDepartamentos(toArray<Departamento>(data))
      if (data.meta) setMeta(data.meta)
    } catch {
      toast.error('Não foi possível carregar os departamentos.')
    } finally {
      setLoading(false)
    }
  }, [page, search, filtroDirecao])

  useEffect(() => {
    fetchDepartamentos()
  }, [fetchDepartamentos])
  useEffect(() => {
    fetch('/api/direcoes?limit=100', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setDirecoes(toArray(d)))
      .catch(() => {})
    fetch('/api/utilizadores?limit=100&role=ChefeDepartamento', {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((d) => setChefes(toArray(d)))
      .catch(() => {})
  }, [])
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const abrirNovo = () => {
    setEditTarget(null)
    reset({ nome: '', direcaoId: '', chefeId: '' })
    setSheetOpen(true)
  }
  const abrirEditar = (d: Departamento) => {
    setEditTarget(d)
    reset({
      nome: d.nome,
      direcaoId: d.direcao?.id ?? '',
      chefeId: d.chefe?.id ?? '',
    })
    setSheetOpen(true)
  }

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    try {
      const res = await fetch(
        editTarget
          ? `/api/departamentos/${editTarget.id}`
          : '/api/departamentos',
        {
          method: editTarget ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ...values, chefeId: values.chefeId || null }),
        },
      )
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Ocorreu um erro.')
        return
      }
      toast.success(
        editTarget ? 'Departamento actualizado' : 'Departamento criado',
        {
          description: `"${values.nome}" foi ${editTarget ? 'actualizado' : 'criado'} com sucesso.`,
        },
      )
      setSheetOpen(false)
      fetchDepartamentos()
    } finally {
      setSubmitting(false)
    }
  }

  const confirmarDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/departamentos/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
        return
      }
      toast.success('Departamento eliminado', {
        description: `"${deleteTarget.nome}" foi eliminado.`,
      })
      setDeleteTarget(null)
      fetchDepartamentos()
    } finally {
      setDeleting(false)
    }
  }

  // Totais para mini stats
  const totalFuncionarios = departamentos.reduce(
    (s, d) => s + (d._count?.utilizadores ?? 0),
    0,
  )
  const totalCriterios = departamentos.reduce(
    (s, d) => s + (d._count?.criterios ?? 0),
    0,
  )
  const comChefe = departamentos.filter((d) => d.chefe).length

  return (
    <div className="space-y-6">
      {/* ── Cabeçalho ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            Departamentos
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {meta.total}{' '}
            {meta.total === 1
              ? 'departamento registado'
              : 'departamentos registados'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu tipo="departamentos" />
          <Button
            onClick={abrirNovo}
            size="sm"
            className="gap-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg h-9 px-4 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Novo Departamento
          </Button>
        </div>
      </div>

      {/* ── Mini stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Total',
            value: meta.total,
            icon: <Building2 className="h-4 w-4" />,
            bg: 'bg-white border-zinc-200',
            color: 'text-zinc-500',
          },
          {
            label: 'Com Chefe',
            value: comChefe,
            icon: <Users className="h-4 w-4" />,
            bg: 'bg-emerald-50 border-emerald-200',
            color: 'text-emerald-600',
          },
          {
            label: 'Funcionários',
            value: totalFuncionarios,
            icon: <Users className="h-4 w-4" />,
            bg: 'bg-blue-50 border-blue-200',
            color: 'text-blue-600',
          },
          {
            label: 'Critérios',
            value: totalCriterios,
            icon: <ClipboardList className="h-4 w-4" />,
            bg: 'bg-indigo-50 border-indigo-200',
            color: 'text-indigo-600',
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

      {/* ── Filtros ── */}
      <Card className="border-zinc-200 shadow-none">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Pesquisar departamento..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 h-9 text-sm border-zinc-200 rounded-lg bg-zinc-50 focus:bg-white transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <Select
                value={filtroDirecao}
                onValueChange={(v) => {
                  setFiltroDirecao(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-52 text-sm border-zinc-200 rounded-lg">
                  <SelectValue placeholder="Todas as direções" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todas as direções</SelectItem>
                  {direcoes.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabela ── */}
      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80">
                <SortHeader
                  label="Departamento"
                  sortKey="nome"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Direção"
                  sortKey="direcao"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Chefe"
                  sortKey="chefe"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Funcionários"
                  sortKey="utilizadores"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Critérios"
                  sortKey="criterios"
                  sort={sort}
                  onSort={handleSort}
                />
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100/80">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div
                          className={`h-3.5 bg-zinc-100 rounded-full animate-pulse ${j === 0 ? 'w-40' : j === 2 ? 'w-32' : 'w-16'}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-zinc-300" />
                      </div>
                      <p className="text-sm font-medium text-zinc-500">
                        Nenhum departamento encontrado
                      </p>
                      <p className="text-xs text-zinc-400">
                        Tente ajustar os filtros ou crie um novo
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                sorted.map((d) => (
                  <tr
                    key={d.id}
                    className="group hover:bg-zinc-50/60 transition-colors duration-100"
                  >
                    {/* Departamento */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 group-hover:bg-zinc-200 transition-colors">
                          <Building2 className="h-4 w-4 text-zinc-500" />
                        </div>
                        <p className="font-medium text-zinc-900">{d.nome}</p>
                      </div>
                    </td>

                    {/* Direção */}
                    <td className="px-4 py-3">
                      {d.direcao?.nome ? (
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-zinc-600 bg-zinc-50 border border-zinc-200 px-2.5 py-0.5 rounded-md">
                          <Layers className="h-3 w-3 text-zinc-400" />
                          {d.direcao.nome}
                        </span>
                      ) : (
                        <span className="text-zinc-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Chefe */}
                    <td className="px-4 py-3">
                      {d.chefe ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 shrink-0 ring-1 ring-zinc-200">
                            <AvatarImage src={d.chefe.avatarUrl} />
                            <AvatarFallback className="bg-zinc-100 text-zinc-600 text-[10px] font-semibold">
                              {getInitials(d.chefe.nomeCompleto)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-[12px] text-zinc-700 font-medium truncate max-w-[130px] leading-tight">
                              {d.chefe.nomeCompleto}
                            </p>
                            <p className="text-[10px] text-zinc-400 truncate max-w-[130px] mt-0.5">
                              {d.chefe.cargo}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-zinc-400 bg-zinc-50 border border-dashed border-zinc-200 px-2 py-0.5 rounded-md">
                          Sem chefe
                        </span>
                      )}
                    </td>

                    {/* Funcionários */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold
                          ${(d._count?.utilizadores ?? 0) > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-zinc-50 text-zinc-400 border border-zinc-200'}`}
                        >
                          <Users className="h-3 w-3" />
                          {d._count?.utilizadores ?? 0}
                        </span>
                      </div>
                    </td>

                    {/* Critérios */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold
                        ${(d._count?.criterios ?? 0) > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-zinc-50 text-zinc-400 border border-zinc-200'}`}
                      >
                        <ClipboardList className="h-3 w-3" />
                        {d._count?.criterios ?? 0}
                      </span>
                    </td>

                    {/* Acções */}
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
                            onClick={() => abrirEditar(d)}
                            className="gap-2.5 text-sm cursor-pointer rounded-lg"
                          >
                            <Pencil className="h-3.5 w-3.5 text-zinc-400" />{' '}
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(d)}
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

        {/* Paginação */}
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

      {/* ── Sheet criar / editar ── */}
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
                  <Building2 className="h-4 w-4 text-emerald-600" />
                )}
              </div>
              <div>
                <SheetTitle className="text-base font-semibold text-zinc-900">
                  {editTarget ? 'Editar Departamento' : 'Novo Departamento'}
                </SheetTitle>
                <SheetDescription className="text-[12px] text-zinc-500 mt-0.5">
                  {editTarget
                    ? 'Actualize os dados do departamento.'
                    : 'Preencha os dados do novo departamento.'}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form
              id="form-departamento"
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5"
            >
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-zinc-700">
                  Nome do departamento
                </Label>
                <Input
                  {...register('nome')}
                  placeholder="ex: Departamento de Recursos Humanos"
                  className="h-9 rounded-lg border-zinc-200 text-sm"
                />
                {errors.nome && (
                  <p className="text-xs text-red-500">{errors.nome.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-zinc-700">
                  Direção
                </Label>
                <Select
                  defaultValue={editTarget?.direcao?.id ?? ''}
                  onValueChange={(v) => setValue('direcaoId', v)}
                >
                  <SelectTrigger className="h-9 rounded-lg border-zinc-200 text-sm w-full">
                    <SelectValue placeholder="Seleccione uma direção" />
                  </SelectTrigger>
                  <SelectContent>
                    {direcoes.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.direcaoId && (
                  <p className="text-xs text-red-500">
                    {errors.direcaoId.message}
                  </p>
                )}
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-zinc-700">
                  Chefe de Departamento
                  <span className="text-zinc-400 font-normal ml-1.5">
                    (opcional)
                  </span>
                </Label>
                <Select
                  defaultValue={editTarget?.chefe?.id ?? ''}
                  onValueChange={(v) => setValue('chefeId', v)}
                >
                  <SelectTrigger className="h-9 rounded-lg border-zinc-200 text-sm w-full">
                    <SelectValue placeholder="Seleccione um chefe" />
                  </SelectTrigger>
                  <SelectContent>
                    {chefes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5 shrink-0">
                            <AvatarFallback className="bg-zinc-100 text-zinc-600 text-[9px] font-semibold">
                              {getInitials(c.nomeCompleto)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{c.nomeCompleto}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-zinc-400">
                  Apenas utilizadores com perfil Chefe de Departamento.
                </p>
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
              form="form-departamento"
              disabled={submitting}
              className="flex-1 h-9 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-sm font-medium shadow-sm"
            >
              {submitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : editTarget ? (
                'Guardar alterações'
              ) : (
                'Criar departamento'
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── AlertDialog eliminar ── */}
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
              Eliminar departamento?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-zinc-500">
              Tem a certeza que quer eliminar{' '}
              <strong className="text-zinc-800">
                &quot;{deleteTarget?.nome}&quot;
              </strong>
              ? Esta acção não pode ser revertida e os dados associados serão
              perdidos.
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
              {deleting ? 'A eliminar...' : 'Eliminar departamento'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
