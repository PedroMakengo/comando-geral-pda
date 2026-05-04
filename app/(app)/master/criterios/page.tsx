'use client'

import { useEffect, useState, useCallback } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ClipboardList,
  User,
  Users,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Check,
  X,
  Filter,
  Scale,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { ExportMenu } from '../../../../components/export-menu'

// ── Tipos ─────────────────────────────────────────────────────
interface Departamento {
  id: string
  nome: string
}
interface Tecnico {
  id: string
  nomeCompleto: string
  cargo: string
  departamento?: { id: string; nome: string } | null
}
interface CriterioDepartamento {
  departamento: { id: string; nome: string }
}
interface Criterio {
  id: string
  nome: string
  descricao?: string | null
  peso: number
  createdAt: string
  departamentos: CriterioDepartamento[]
  tecnico?: { id: string; nomeCompleto: string; email: string } | null
  _count?: { respostas: number }
}
interface Utilizador {
  id: string
  nomeCompleto: string
  email: string
  cargo: string
  role: string
  avatarUrl?: string
  departamento?: { id: string; nome: string } | null
}
interface Meta {
  total: number
  page: number
  limit: number
  totalPages: number
}
type SortKey = 'nome' | 'ambito' | 'peso' | 'respostas'
interface SortState {
  key: SortKey | null
  direction: 'asc' | 'desc'
}

// ── Schema ────────────────────────────────────────────────────
const schema = z
  .object({
    nome: z.string().min(2, 'Nome é obrigatório.'),
    descricao: z.string().optional(),
    peso: z.coerce
      .number()
      .min(0.1, 'Peso mínimo é 0.1')
      .max(5, 'Peso máximo é 5'),
    ambito: z.enum(['departamento', 'tecnico']),
    departamentoIds: z.array(z.string()).optional(),
    tecnicoId: z.string().optional(),
  })
  .refine(
    (d) => {
      if (d.ambito === 'departamento')
        return Array.isArray(d.departamentoIds) && d.departamentoIds.length > 0
      return !!d.tecnicoId
    },
    {
      message: 'Seleccione pelo menos um departamento ou um técnico.',
      path: ['departamentoIds'],
    },
  )

type FormValues = {
  nome: string
  descricao?: string
  peso: number
  ambito: 'departamento' | 'tecnico'
  departamentoIds?: string[]
  tecnicoId?: string
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

function pesoLabel(peso: number) {
  if (peso >= 1.5)
    return { label: 'Alto', cls: 'bg-red-50 text-red-700 border-red-200' }
  if (peso >= 1.0)
    return {
      label: 'Médio',
      cls: 'bg-amber-50 text-amber-700 border-amber-200',
    }
  return { label: 'Baixo', cls: 'bg-zinc-50 text-zinc-500 border-zinc-200' }
}

// ── MultiSelect ───────────────────────────────────────────────
function DepartamentosMultiSelect({
  departamentos,
  selectedIds,
  onChange,
  error,
}: {
  departamentos: Departamento[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  error?: string
}) {
  const [open, setOpen] = useState(false)
  const toggle = (id: string) =>
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id],
    )
  const selectedNomes = departamentos
    .filter((d) => selectedIds.includes(d.id))
    .map((d) => d.nome)

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-zinc-700">Departamentos</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`w-full min-h-[36px] flex flex-wrap gap-1.5 items-center px-3 py-1.5 rounded-lg border text-sm text-left transition-colors ${error ? 'border-red-400 bg-red-50' : 'border-zinc-200 hover:border-zinc-300 bg-white'}`}
          >
            {selectedNomes.length === 0 ? (
              <span className="text-zinc-400">Seleccione departamentos...</span>
            ) : (
              selectedNomes.map((nome) => (
                <span
                  key={nome}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-xs font-medium"
                >
                  {nome}
                  <X
                    className="h-3 w-3 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      const d = departamentos.find((d) => d.nome === nome)
                      if (d) toggle(d.id)
                    }}
                  />
                </span>
              ))
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start" sideOffset={4}>
          <Command>
            <CommandInput
              placeholder="Pesquisar departamento..."
              className="h-9"
            />
            <CommandList>
              <CommandEmpty>Nenhum departamento encontrado.</CommandEmpty>
              <CommandGroup>
                {departamentos.map((d) => {
                  const sel = selectedIds.includes(d.id)
                  return (
                    <CommandItem
                      key={d.id}
                      value={d.nome}
                      onSelect={() => toggle(d.id)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <div
                        className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${sel ? 'bg-zinc-900 border-zinc-900' : 'border-zinc-300'}`}
                      >
                        {sel && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      {d.nome}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

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

// ── Componente principal ──────────────────────────────────────
export default function AdminCriteriosPage() {
  const [criterios, setCriterios] = useState<Criterio[]>([])
  const [meta, setMeta] = useState<Meta>({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [filtroDept, setFiltroDept] = useState('_all')
  const [page, setPage] = useState(1)
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [sort, setSort] = useState<SortState>({ key: null, direction: 'asc' })
  const [sheetForm, setSheetForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Criterio | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Criterio | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([])
  const [sheetCriterio, setSheetCriterio] = useState(false)
  const [criterioSelecionado, setCriterioSelecionado] =
    useState<Criterio | null>(null)
  const [utilizadoresCriterio, setUtilizadoresCriterio] = useState<
    Utilizador[]
  >([])
  const [loadingCriterio, setLoadingCriterio] = useState(false)
  const [sheetFuncionario, setSheetFuncionario] = useState(false)
  const [funcionario, setFuncionario] = useState<Utilizador | null>(null)
  const [criteriosFuncionario, setCriteriosFuncionario] = useState<Criterio[]>(
    [],
  )
  const [loadingSheet, setLoadingSheet] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { peso: 1.0, ambito: 'departamento', departamentoIds: [] },
  })
  const ambito = watch('ambito')

  const fetchCriterios = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '15')
      if (search !== '') params.set('search', search)
      if (filtroDept !== '_all') params.set('departamentoId', filtroDept)
      if (sort.key) {
        params.set('sortKey', sort.key)
        params.set('sortDir', sort.direction)
      }
      const res = await fetch(`/api/criterios?${params}`, {
        credentials: 'include',
      })
      const data = await res.json()
      setCriterios(toArray<Criterio>(data))
      if (data.meta) setMeta(data.meta)
    } catch {
      toast.error('Não foi possível carregar os critérios.')
    } finally {
      setLoading(false)
    }
  }, [page, search, filtroDept, sort])

  useEffect(() => {
    fetchCriterios()
  }, [fetchCriterios])
  useEffect(() => {
    fetch('/api/departamentos?limit=100', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setDepartamentos(toArray(d)))
      .catch(() => {})
    fetch('/api/utilizadores?limit=200&role=Tecnico', {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((d) => setTecnicos(toArray(d)))
      .catch(() => {})
  }, [])
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const handleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )
    setPage(1)
  }

  const abrirNovo = () => {
    setEditTarget(null)
    setSelectedDeptIds([])
    reset({
      nome: '',
      descricao: '',
      peso: 1.0,
      ambito: 'departamento',
      departamentoIds: [],
      tecnicoId: '',
    })
    setSheetForm(true)
  }
  const abrirEditar = (c: Criterio, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditTarget(c)
    const ids = c.departamentos.map((d) => d.departamento.id)
    setSelectedDeptIds(ids)
    reset({
      nome: c.nome,
      descricao: c.descricao ?? '',
      peso: c.peso,
      ambito: c.tecnico ? 'tecnico' : 'departamento',
      departamentoIds: ids,
      tecnicoId: c.tecnico?.id ?? '',
    })
    setSheetForm(true)
  }

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    try {
      const res = await fetch(
        editTarget ? `/api/criterios/${editTarget.id}` : '/api/criterios',
        {
          method: editTarget ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            nome: values.nome,
            descricao: values.descricao || null,
            peso: values.peso,
            departamentoIds:
              values.ambito === 'departamento' ? selectedDeptIds : [],
            tecnicoId: values.ambito === 'tecnico' ? values.tecnicoId : null,
          }),
        },
      )
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Ocorreu um erro.')
        return
      }
      toast.success(editTarget ? 'Critério actualizado' : 'Critério criado', {
        description: `"${values.nome}" foi ${editTarget ? 'actualizado' : 'criado'} com sucesso.`,
      })
      setSheetForm(false)
      fetchCriterios()
    } finally {
      setSubmitting(false)
    }
  }

  const confirmarDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/criterios/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
        return
      }
      toast.success('Critério eliminado')
      setDeleteTarget(null)
      fetchCriterios()
    } finally {
      setDeleting(false)
    }
  }

  const abrirCriterio = async (c: Criterio) => {
    setCriterioSelecionado(c)
    setUtilizadoresCriterio([])
    setSheetCriterio(true)
    const deptIds = c.departamentos.map((d) => d.departamento.id)
    if (deptIds.length === 0) return
    setLoadingCriterio(true)
    try {
      const results = await Promise.all(
        deptIds.map((id) =>
          fetch(`/api/utilizadores?departamentoId=${id}&limit=100`, {
            credentials: 'include',
          }).then((r) => r.json()),
        ),
      )
      const all = results.flatMap((r) => toArray<Utilizador>(r))
      const seen = new Set<string>()
      setUtilizadoresCriterio(
        all.filter((u) => (seen.has(u.id) ? false : seen.add(u.id) && true)),
      )
    } catch {
      toast.error('Não foi possível carregar os utilizadores.')
    } finally {
      setLoadingCriterio(false)
    }
  }

  const seleccionarFuncionario = async (u: Utilizador) => {
    setFuncionario(u)
    setLoadingSheet(true)
    try {
      const [resDept, resTecnico] = await Promise.all([
        u.departamento?.id
          ? fetch(
              `/api/criterios?departamentoId=${u.departamento.id}&limit=100`,
              { credentials: 'include' },
            ).then((r) => r.json())
          : Promise.resolve([]),
        fetch(`/api/criterios?tecnicoId=${u.id}&limit=100`, {
          credentials: 'include',
        }).then((r) => r.json()),
      ])
      const deptArr = toArray<Criterio>(resDept),
        tecnicoArr = toArray<Criterio>(resTecnico)
      const ids = new Set(deptArr.map((c) => c.id))
      setCriteriosFuncionario([
        ...deptArr,
        ...tecnicoArr.filter((c) => !ids.has(c.id)),
      ])
    } catch {
      toast.error('Não foi possível carregar os critérios do funcionário.')
    } finally {
      setLoadingSheet(false)
    }
  }

  const getDeptLabel = (c: Criterio) => {
    if (c.tecnico) return null
    if (c.departamentos.length === 0) return 'Geral'
    if (c.departamentos.length === 1)
      return c.departamentos[0].departamento.nome
    return `${c.departamentos.length} departamentos`
  }

  // Mini stats
  const deptoCount = criterios.filter(
    (c) => c.departamentos.length > 0 && !c.tecnico,
  ).length
  const indivCount = criterios.filter((c) => c.tecnico).length
  const totalResp = criterios.reduce(
    (s, c) => s + (c._count?.respostas ?? 0),
    0,
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            Critérios de Avaliação
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {meta.total}{' '}
            {meta.total === 1 ? 'critério registado' : 'critérios registados'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu tipo="criterios" />
          <Button
            onClick={() => {
              setFuncionario(null)
              setCriteriosFuncionario([])
              setSheetFuncionario(true)
            }}
            size="sm"
            variant="outline"
            className="gap-2 rounded-lg border-zinc-200 h-9"
          >
            <User className="h-4 w-4" /> Ver por funcionário
          </Button>
          <Button
            onClick={abrirNovo}
            size="sm"
            className="gap-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg h-9 px-4 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Novo Critério
          </Button>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Total',
            value: meta.total,
            icon: <ClipboardList className="h-4 w-4" />,
            bg: 'bg-white border-zinc-200',
            color: 'text-zinc-500',
          },
          {
            label: 'Dept.',
            value: deptoCount,
            icon: <Users className="h-4 w-4" />,
            bg: 'bg-blue-50 border-blue-200',
            color: 'text-blue-600',
          },
          {
            label: 'Individuais',
            value: indivCount,
            icon: <User className="h-4 w-4" />,
            bg: 'bg-indigo-50 border-indigo-200',
            color: 'text-indigo-600',
          },
          {
            label: 'Respostas',
            value: totalResp,
            icon: <Scale className="h-4 w-4" />,
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

      {/* Filtros */}
      <Card className="border-zinc-200 shadow-none">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Pesquisar critério..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 h-9 text-sm border-zinc-200 rounded-lg bg-zinc-50 focus:bg-white transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <Select
                value={filtroDept}
                onValueChange={(v) => {
                  setFiltroDept(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-52 text-sm border-zinc-200 rounded-lg">
                  <SelectValue placeholder="Todos os departamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos os departamentos</SelectItem>
                  {departamentos.map((d) => (
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

      {/* Tabela */}
      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80">
                <SortHeader
                  label="Critério"
                  sortKey="nome"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Âmbito"
                  sortKey="ambito"
                  sort={sort}
                  onSort={handleSort}
                />
                <th className="text-left px-4 py-3 font-medium text-zinc-400 text-[11px] uppercase tracking-wider">
                  Descrição
                </th>
                <SortHeader
                  label="Peso"
                  sortKey="peso"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Respostas"
                  sortKey="respostas"
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
                          className={`h-3.5 bg-zinc-100 rounded-full animate-pulse ${j === 0 ? 'w-40' : 'w-20'}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : criterios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center">
                        <ClipboardList className="h-6 w-6 text-zinc-300" />
                      </div>
                      <p className="text-sm font-medium text-zinc-500">
                        Nenhum critério encontrado
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                criterios.map((c) => {
                  const p = pesoLabel(c.peso)
                  const deptLabel = getDeptLabel(c)
                  return (
                    <tr
                      key={c.id}
                      onClick={() => abrirCriterio(c)}
                      className="group hover:bg-zinc-50/60 transition-colors duration-100 cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 group-hover:bg-zinc-200 transition-colors">
                            <ClipboardList className="h-4 w-4 text-zinc-500" />
                          </div>
                          <p className="font-medium text-zinc-900">{c.nome}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {c.tecnico ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              Individual
                            </span>
                            <span className="text-xs text-zinc-500 truncate max-w-[120px]">
                              {c.tecnico.nomeCompleto}
                            </span>
                          </div>
                        ) : c.departamentos.length > 1 ? (
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {c.departamentos.slice(0, 2).map((d) => (
                              <span
                                key={d.departamento.id}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200"
                              >
                                {d.departamento.nome}
                              </span>
                            ))}
                            {c.departamentos.length > 2 && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-500 border border-zinc-200">
                                +{c.departamentos.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
                            {deptLabel}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs max-w-[200px]">
                        <span className="truncate block">
                          {c.descricao ?? (
                            <span className="text-zinc-300">—</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${p.cls}`}
                          >
                            {p.label}
                          </span>
                          <span className="text-[11px] text-zinc-400 font-mono">
                            ×{c.peso}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${(c._count?.respostas ?? 0) > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-zinc-50 text-zinc-400 border border-zinc-100'}`}
                        >
                          {c._count?.respostas ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-40 rounded-xl shadow-xl border-zinc-200"
                          >
                            <DropdownMenuItem
                              onClick={(e) => abrirEditar(c, e)}
                              className="gap-2.5 text-sm cursor-pointer rounded-lg"
                            >
                              <Pencil className="h-3.5 w-3.5 text-zinc-400" />{' '}
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteTarget(c)
                              }}
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

      {/* Sheet: Criar / Editar */}
      <Sheet open={sheetForm} onOpenChange={setSheetForm}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
          <SheetHeader className="px-6 py-5 border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-3">
              <div
                className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${editTarget ? 'bg-indigo-50' : 'bg-emerald-50'}`}
              >
                {editTarget ? (
                  <Pencil className="h-4 w-4 text-indigo-600" />
                ) : (
                  <ClipboardList className="h-4 w-4 text-emerald-600" />
                )}
              </div>
              <div>
                <SheetTitle className="text-base font-semibold text-zinc-900">
                  {editTarget ? 'Editar Critério' : 'Novo Critério'}
                </SheetTitle>
                <SheetDescription className="text-[12px] text-zinc-500 mt-0.5">
                  {editTarget
                    ? 'Actualize os dados do critério.'
                    : 'Defina um novo critério de avaliação.'}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form
              id="form-criterio"
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-zinc-700">
                  Nome do critério
                </Label>
                <Input
                  {...register('nome')}
                  placeholder="Capacidade de comunicação"
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
                  placeholder="Descreva o critério..."
                  className="rounded-lg border-zinc-200 text-sm resize-none"
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-zinc-700">
                  Peso
                </Label>
                <Input
                  {...register('peso', { valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="5"
                  className="h-9 rounded-lg border-zinc-200 text-sm"
                />
                <p className="text-[11px] text-zinc-400">
                  Valor entre 0.1 e 5. Ex: 1.0 = Médio, 1.5 = Alto
                </p>
                {errors.peso && (
                  <p className="text-xs text-red-500">{errors.peso.message}</p>
                )}
              </div>
              <Separator />
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-zinc-700">
                  Âmbito
                </Label>
                <Select
                  defaultValue={
                    editTarget?.tecnico ? 'tecnico' : 'departamento'
                  }
                  onValueChange={(v) => {
                    setValue('ambito', v as 'departamento' | 'tecnico')
                    if (v === 'departamento') setValue('tecnicoId', '')
                    else setSelectedDeptIds([])
                  }}
                >
                  <SelectTrigger className="h-9 rounded-lg border-zinc-200 text-sm w-full">
                    <SelectValue placeholder="Seleccione o âmbito" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="departamento">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" /> Departamentos (um ou
                        mais)
                      </span>
                    </SelectItem>
                    <SelectItem value="tecnico">
                      <span className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" /> Individual (técnico
                        específico)
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {ambito === 'departamento' && (
                <DepartamentosMultiSelect
                  departamentos={departamentos}
                  selectedIds={selectedDeptIds}
                  onChange={(ids) => {
                    setSelectedDeptIds(ids)
                    setValue('departamentoIds', ids)
                  }}
                  error={errors.departamentoIds?.message}
                />
              )}
              {ambito === 'tecnico' && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-zinc-700">
                    Técnico
                  </Label>
                  <Select
                    defaultValue={editTarget?.tecnico?.id ?? ''}
                    onValueChange={(v) => setValue('tecnicoId', v)}
                  >
                    <SelectTrigger className="h-9 rounded-lg border-zinc-200 text-sm w-full">
                      <SelectValue placeholder="Seleccione o técnico" />
                    </SelectTrigger>
                    <SelectContent>
                      {tecnicos.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <span>{t.nomeCompleto}</span>
                          {t.departamento && (
                            <span className="text-zinc-400 ml-1 text-xs">
                              · {t.departamento.nome}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.tecnicoId && (
                    <p className="text-xs text-red-500">
                      {errors.tecnicoId.message}
                    </p>
                  )}
                </div>
              )}
            </form>
          </div>
          <div className="px-6 py-4 border-t border-zinc-100 shrink-0 flex gap-2.5 bg-white">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-9 rounded-lg border-zinc-200 text-sm"
              onClick={() => setSheetForm(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="form-criterio"
              disabled={submitting}
              className="flex-1 h-9 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-sm font-medium shadow-sm"
            >
              {submitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : editTarget ? (
                'Guardar'
              ) : (
                'Criar critério'
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet: Detalhe critério */}
      <Sheet open={sheetCriterio} onOpenChange={setSheetCriterio}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
          <SheetHeader className="px-6 py-5 border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                <ClipboardList className="h-4 w-4 text-zinc-500" />
              </div>
              <div>
                <SheetTitle className="text-base font-semibold text-zinc-900">
                  {criterioSelecionado?.nome}
                </SheetTitle>
                <SheetDescription className="text-[12px] text-zinc-500 mt-0.5">
                  {criterioSelecionado?.tecnico
                    ? 'Critério individual.'
                    : criterioSelecionado?.departamentos.length === 1
                      ? `Dept.: ${criterioSelecionado.departamentos[0].departamento.nome}`
                      : `${criterioSelecionado?.departamentos.length ?? 0} departamentos`}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3">
                <p className="text-[10px] text-zinc-400 uppercase tracking-[0.12em] font-bold mb-1.5">
                  Peso
                </p>
                {(() => {
                  const p = pesoLabel(criterioSelecionado?.peso ?? 1)
                  return (
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${p.cls}`}
                      >
                        {p.label}
                      </span>
                      <span className="text-sm font-mono font-bold text-zinc-700">
                        ×{criterioSelecionado?.peso}
                      </span>
                    </div>
                  )
                })()}
              </div>
              <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3">
                <p className="text-[10px] text-zinc-400 uppercase tracking-[0.12em] font-bold mb-1.5">
                  Respostas
                </p>
                <p className="text-xl font-bold text-zinc-800">
                  {criterioSelecionado?._count?.respostas ?? 0}
                </p>
              </div>
            </div>
            {!criterioSelecionado?.tecnico &&
              (criterioSelecionado?.departamentos.length ?? 0) > 1 && (
                <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-[0.12em] font-bold mb-2">
                    Departamentos
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {criterioSelecionado?.departamentos.map((d) => (
                      <span
                        key={d.departamento.id}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-200 text-zinc-700"
                      >
                        {d.departamento.nome}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            {criterioSelecionado?.descricao && (
              <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-3">
                <p className="text-[10px] text-zinc-400 uppercase tracking-[0.12em] font-bold mb-1.5">
                  Descrição
                </p>
                <p className="text-sm text-zinc-700 leading-relaxed">
                  {criterioSelecionado.descricao}
                </p>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-zinc-400" />
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em]">
                  {criterioSelecionado?.tecnico
                    ? 'Técnico atribuído'
                    : `Funcionários abrangidos (${utilizadoresCriterio.length})`}
                </p>
              </div>
              {criterioSelecionado?.tecnico && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl border border-zinc-200 bg-white">
                  <Avatar className="h-9 w-9 shrink-0 ring-1 ring-zinc-200">
                    <AvatarFallback className="bg-zinc-100 text-zinc-600 text-xs font-semibold">
                      {getInitials(criterioSelecionado.tecnico.nomeCompleto)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900">
                      {criterioSelecionado.tecnico.nomeCompleto}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {criterioSelecionado.tecnico.email}
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                    Individual
                  </span>
                </div>
              )}
              {!criterioSelecionado?.tecnico &&
                (loadingCriterio ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-14 bg-zinc-100 rounded-xl animate-pulse mb-2"
                    />
                  ))
                ) : utilizadoresCriterio.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                    <p className="text-sm text-zinc-400">
                      Nenhum funcionário nestes departamentos.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100/80 rounded-xl border border-zinc-200 overflow-hidden">
                    {utilizadoresCriterio.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50"
                      >
                        <Avatar className="h-8 w-8 shrink-0 ring-1 ring-zinc-200">
                          <AvatarImage src={u.avatarUrl} />
                          <AvatarFallback className="bg-zinc-100 text-zinc-600 text-[11px] font-semibold">
                            {getInitials(u.nomeCompleto)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-zinc-900 truncate">
                            {u.nomeCompleto}
                          </p>
                          <p className="text-xs text-zinc-400 truncate">
                            {u.cargo}
                            {u.departamento && ` · ${u.departamento.nome}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet: Ver por funcionário */}
      <Sheet open={sheetFuncionario} onOpenChange={setSheetFuncionario}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0 overflow-hidden">
          <SheetHeader className="px-6 py-5 border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <SheetTitle className="text-base font-semibold text-zinc-900">
                  Critérios por Funcionário
                </SheetTitle>
                <SheetDescription className="text-[12px] text-zinc-500 mt-0.5">
                  Seleccione um funcionário para ver os critérios aplicáveis.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            {!funcionario ? (
              <FuncionariosComCriterios onSelect={seleccionarFuncionario} />
            ) : (
              <div className="px-6 py-4">
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 mb-5">
                  <Avatar className="h-10 w-10 shrink-0 ring-1 ring-zinc-200">
                    <AvatarImage src={funcionario.avatarUrl} />
                    <AvatarFallback className="bg-zinc-200 text-zinc-600 text-xs font-semibold">
                      {getInitials(funcionario.nomeCompleto)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-900">
                      {funcionario.nomeCompleto}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {funcionario.cargo} ·{' '}
                      {funcionario.departamento?.nome ?? 'Sem departamento'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setFuncionario(null)
                      setCriteriosFuncionario([])
                    }}
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors px-2 py-1.5 rounded-lg hover:bg-zinc-100"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Voltar
                  </button>
                </div>
                {loadingSheet ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-16 bg-zinc-100 rounded-xl animate-pulse mb-3"
                    />
                  ))
                ) : criteriosFuncionario.length === 0 ? (
                  <div className="text-center py-8">
                    <ClipboardList className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                    <p className="text-sm text-zinc-400">
                      Nenhum critério definido para este funcionário.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-3">
                      {criteriosFuncionario.length} critério
                      {criteriosFuncionario.length !== 1 ? 's' : ''} aplicável
                      {criteriosFuncionario.length !== 1 ? 'is' : ''}
                    </p>
                    {criteriosFuncionario.map((c) => {
                      const p = pesoLabel(c.peso)
                      return (
                        <div
                          key={c.id}
                          className="rounded-xl border border-zinc-200 p-3.5 bg-white"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-medium text-zinc-900">
                                  {c.nome}
                                </p>
                                {c.tecnico && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600">
                                    Individual
                                  </span>
                                )}
                              </div>
                              {c.descricao && (
                                <p className="text-xs text-zinc-500 leading-relaxed">
                                  {c.descricao}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${p.cls}`}
                              >
                                {p.label}
                              </span>
                              <span className="text-[11px] text-zinc-400 font-mono">
                                ×{c.peso}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
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
              Eliminar critério?
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
              {deleting ? 'A eliminar...' : 'Eliminar critério'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── Subcomponente ─────────────────────────────────────────────
function FuncionariosComCriterios({
  onSelect,
}: {
  onSelect: (u: Utilizador) => void
}) {
  const [lista, setLista] = useState<Utilizador[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const dataCrit = await fetch('/api/criterios?limit=500', {
          credentials: 'include',
        }).then((r) => r.json())
        const criterios: any[] = Array.isArray(dataCrit)
          ? dataCrit
          : (dataCrit.data ?? [])
        const ids = new Set(
          criterios.filter((c) => c.tecnico?.id).map((c) => c.tecnico.id),
        )
        if (ids.size === 0) {
          setLista([])
          return
        }
        const dataUtiliz = await fetch('/api/utilizadores?limit=500', {
          credentials: 'include',
        }).then((r) => r.json())
        const todos: Utilizador[] = Array.isArray(dataUtiliz)
          ? dataUtiliz
          : (dataUtiliz.data ?? [])
        setLista(todos.filter((u) => ids.has(u.id)))
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading)
    return (
      <div className="px-6 py-8 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-zinc-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )

  if (lista.length === 0)
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center mb-3">
          <ClipboardList className="h-6 w-6 text-zinc-300" />
        </div>
        <p className="text-sm font-medium text-zinc-600">
          Sem funcionários com critérios individuais
        </p>
        <p className="text-xs text-zinc-400 mt-1">
          Nenhum técnico tem critérios individuais atribuídos.
        </p>
      </div>
    )

  return (
    <div className="px-6 py-6 space-y-4">
      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em]">
        {lista.length} funcionário{lista.length !== 1 ? 's' : ''} com critérios
        individuais
      </p>
      <Select
        value={selected}
        onValueChange={(id) => {
          setSelected(id)
          const u = lista.find((u) => u.id === id)
          if (u) onSelect(u)
        }}
      >
        <SelectTrigger className="h-10 rounded-lg border-zinc-200 text-sm w-full">
          <SelectValue placeholder="Seleccione um funcionário..." />
        </SelectTrigger>
        <SelectContent>
          {lista.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              <span className="font-medium">{u.nomeCompleto}</span>
              <span className="text-zinc-400 text-xs ml-1">
                · {u.departamento?.nome ?? 'Sem dept.'}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 overflow-hidden">
        {lista.map((u) => (
          <button
            key={u.id}
            onClick={() => onSelect(u)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 text-left transition-colors"
          >
            <Avatar className="h-8 w-8 shrink-0 ring-1 ring-zinc-200">
              <AvatarImage src={u.avatarUrl} />
              <AvatarFallback className="bg-zinc-100 text-zinc-600 text-xs font-semibold">
                {getInitials(u.nomeCompleto)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-900 truncate">
                {u.nomeCompleto}
              </p>
              <p className="text-xs text-zinc-400 truncate">
                {u.cargo} · {u.departamento?.nome ?? 'Sem departamento'}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-300 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}
