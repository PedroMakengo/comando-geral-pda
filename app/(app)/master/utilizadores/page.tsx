'use client'

import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  UserPlus,
  Search,
  MoreHorizontal,
  KeyRound,
  Power,
  Pencil,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Users,
  Shield,
  Building2,
  Filter,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { ExportMenu } from '../../../../components/export-menu'

// ── Tipos ─────────────────────────────────────────────────────
interface Pelouro {
  id: string
  nome: string
}
interface Direcao {
  id: string
  nome: string
  pelouroId: string
}
interface Departamento {
  id: string
  nome: string
  direcaoId: string
}

interface Utilizador {
  id: string
  nomeCompleto: string
  email: string
  numeroMecanografico: string
  cargo: string
  avatarUrl: string
  role: string
  estado: string
  createdAt: string
  departamento?: { id: string; nome: string } | null
  direcao?: { id: string; nome: string } | null
  pelouro?: { id: string; nome: string } | null
}
interface Meta {
  total: number
  page: number
  limit: number
  totalPages: number
}

type SortKey =
  | 'nomeCompleto'
  | 'numeroMecanografico'
  | 'cargo'
  | 'role'
  | 'departamento'
  | 'estado'
type SortDirection = 'asc' | 'desc'
interface SortState {
  key: SortKey | null
  direction: SortDirection
}

// ── Helpers ───────────────────────────────────────────────────
function toArray<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res
  if (res && typeof res === 'object' && Array.isArray((res as any).data))
    return (res as any).data
  return []
}
function getSortValue(u: Utilizador, key: SortKey): string {
  switch (key) {
    case 'nomeCompleto':
      return u.nomeCompleto ?? ''
    case 'numeroMecanografico':
      return u.numeroMecanografico ?? ''
    case 'cargo':
      return u.cargo ?? ''
    case 'role':
      return u.role ?? ''
    case 'departamento':
      return u.departamento?.nome ?? ''
    case 'estado':
      return u.estado ?? ''
    default:
      return ''
  }
}
function sortUtilizadores(list: Utilizador[], sort: SortState): Utilizador[] {
  if (!sort.key) return list
  return [...list].sort((a, b) => {
    const cmp = getSortValue(a, sort.key!)
      .toLowerCase()
      .localeCompare(getSortValue(b, sort.key!).toLowerCase(), 'pt')
    return sort.direction === 'asc' ? cmp : -cmp
  })
}
function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}

const schema = z.object({
  nomeCompleto: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres.'),
  email: z.string().email('Email inválido.'),
  numeroMecanografico: z.string().min(3, 'Nº Mecanográfico obrigatório.'),
  cargo: z.string().min(2, 'Cargo obrigatório.'),
  role: z.enum(['Master', 'Director', 'ChefeDepartamento', 'Tecnico'], {
    error: 'Seleccione um perfil.',
  }),
  pelouroId: z.string().optional(),
  direcaoId: z.string().optional(),
  departamentoId: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

// ── Configurações de role ─────────────────────────────────────
const roleConfig: Record<
  string,
  { label: string; badge: string; dot: string }
> = {
  Master: {
    label: 'Master',
    badge: 'bg-zinc-900 text-white border-zinc-900',
    dot: 'bg-zinc-700',
  },
  Director: {
    label: 'Director',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500',
  },
  ChefeDepartamento: {
    label: 'Chefe Dept.',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  Tecnico: {
    label: 'Técnico',
    badge: 'bg-zinc-50 text-zinc-600 border-zinc-200',
    dot: 'bg-zinc-400',
  },
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

// ── Página principal ──────────────────────────────────────────
export default function UtilizadoresPage() {
  const [utilizadores, setUtilizadores] = useState<Utilizador[]>([])
  const [meta, setMeta] = useState<Meta>({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [filtroRole, setFiltroRole] = useState('_all')
  const [filtroDept, setFiltroDept] = useState('_all')
  const [filtroEstado, setFiltroEstado] = useState('_all')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<SortState>({ key: null, direction: 'asc' })
  const [pelouros, setPelouros] = useState<Pelouro[]>([])
  const [todasDirecoes, setTodasDirecoes] = useState<Direcao[]>([])
  const [todosDepts, setTodosDepts] = useState<Departamento[]>([])
  const [pelouroSel, setPelouroSel] = useState('')
  const [direcaoSel, setDirecaoSel] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Utilizador | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const direcoesFiltradas = pelouroSel
    ? todasDirecoes.filter((d) => d.pelouroId === pelouroSel)
    : todasDirecoes
  const deptsFiltrados = direcaoSel
    ? todosDepts.filter((d) => d.direcaoId === direcaoSel)
    : todosDepts
  const utilizadoresOrdenados = sortUtilizadores(utilizadores, sort)

  const handleSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )

  const fetchUtilizadores = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '15')
      if (search !== '') params.set('search', search)
      if (filtroRole !== '_all') params.set('role', filtroRole)
      if (filtroDept !== '_all') params.set('departamentoId', filtroDept)
      if (filtroEstado !== '_all') params.set('estado', filtroEstado)
      const res = await fetch(`/api/utilizadores?${params}`, {
        credentials: 'include',
      })
      const data = await res.json()
      setUtilizadores(toArray<Utilizador>(data))
      if (data.meta) setMeta(data.meta)
    } catch {
      toast.error('Não foi possível carregar os utilizadores.')
    } finally {
      setLoading(false)
    }
  }, [page, search, filtroRole, filtroDept, filtroEstado])

  useEffect(() => {
    fetchUtilizadores()
  }, [fetchUtilizadores])
  useEffect(() => {
    fetch('/api/pelouros?limit=100', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setPelouros(toArray(d)))
      .catch(() => {})
    fetch('/api/direcoes?limit=200', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setTodasDirecoes(toArray(d)))
      .catch(() => {})
    fetch('/api/departamentos?limit=500', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setTodosDepts(toArray(d)))
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
    setPelouroSel('')
    setDirecaoSel('')
    reset({})
    setSheetOpen(true)
  }
  const abrirEditar = (u: Utilizador) => {
    setEditTarget(u)
    setPelouroSel(u.pelouro?.id ?? '')
    setDirecaoSel(u.direcao?.id ?? '')
    reset({
      nomeCompleto: u.nomeCompleto,
      email: u.email,
      numeroMecanografico: u.numeroMecanografico,
      cargo: u.cargo,
      role: u.role as any,
      pelouroId: u.pelouro?.id ?? '',
      direcaoId: u.direcao?.id ?? '',
      departamentoId: u.departamento?.id ?? '',
    })
    setSheetOpen(true)
  }
  const handlePelouroChange = (id: string) => {
    setPelouroSel(id)
    setValue('pelouroId', id)
    setDirecaoSel('')
    setValue('direcaoId', '')
    setValue('departamentoId', '')
  }
  const handleDirecaoChange = (id: string) => {
    setDirecaoSel(id)
    setValue('direcaoId', id)
    setValue('departamentoId', '')
  }

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    try {
      const res = await fetch(
        editTarget ? `/api/utilizadores/${editTarget.id}` : '/api/utilizadores',
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
      toast.success(
        editTarget ? 'Funcionário actualizado' : 'Funcionário criado',
        {
          description: editTarget
            ? `${values.nomeCompleto} foi actualizado com sucesso.`
            : `${values.nomeCompleto} foi criado. Credenciais enviadas por email.`,
        },
      )
      setSheetOpen(false)
      fetchUtilizadores()
    } finally {
      setSubmitting(false)
    }
  }
  const toggleEstado = async (u: Utilizador) => {
    const res = await fetch(`/api/utilizadores/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'toggle-estado' }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error)
      return
    }
    const activado = data.estado === 'Activo'
    toast.success(activado ? 'Conta activada' : 'Conta desactivada', {
      description: `${u.nomeCompleto} foi ${activado ? 'activado' : 'desactivado'}.`,
    })
    fetchUtilizadores()
  }
  const resetSenha = async (u: Utilizador) => {
    const res = await fetch(`/api/utilizadores/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'reset-password' }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error)
      return
    }
    toast.success('Senha redefinida', {
      description: `Nova senha enviada para ${u.email}.`,
    })
  }

  // Contagens por role para o cabeçalho
  const countByRole = utilizadores.reduce(
    (acc, u) => {
      acc[u.role] = (acc[u.role] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
  const activeCount = utilizadores.filter((u) => u.estado === 'Activo').length

  return (
    <div className="space-y-6">
      {/* ── Cabeçalho ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            Funcionários
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {meta.total}{' '}
            {meta.total === 1
              ? 'utilizador registado'
              : 'utilizadores registados'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu tipo="utilizadores" />
          <Button
            onClick={abrirNovo}
            size="sm"
            className="gap-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg h-9 px-4 shadow-sm"
          >
            <UserPlus className="h-4 w-4" />
            Novo Funcionário
          </Button>
        </div>
      </div>

      {/* ── Mini stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Total',
            value: meta.total,
            icon: <Users className="h-4 w-4" />,
            color: 'text-zinc-600',
            bg: 'bg-white border-white',
          },
          {
            label: 'Activos',
            value: activeCount,
            icon: <Shield className="h-4 w-4" />,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50 border-emerald-200',
          },
          {
            label: 'Directores',
            value: countByRole['Director'] ?? 0,
            icon: <Shield className="h-4 w-4" />,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50 border-indigo-200',
          },
          {
            label: 'Técnicos',
            value: countByRole['Tecnico'] ?? 0,
            icon: <Building2 className="h-4 w-4" />,
            color: 'text-amber-600',
            bg: 'bg-amber-50 border-amber-200',
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
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Pesquisar nome, email ou nº mecânico..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 h-9 text-sm border-zinc-200 rounded-lg bg-zinc-50 focus:bg-white transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <Select
                value={filtroRole}
                onValueChange={(v) => {
                  setFiltroRole(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-38 text-sm border-zinc-200 rounded-lg">
                  <SelectValue placeholder="Perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos os perfis</SelectItem>
                  <SelectItem value="Master">Master</SelectItem>
                  <SelectItem value="Director">Director</SelectItem>
                  <SelectItem value="ChefeDepartamento">Chefe Dept.</SelectItem>
                  <SelectItem value="Tecnico">Técnico</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filtroDept}
                onValueChange={(v) => {
                  setFiltroDept(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-42 text-sm border-zinc-200 rounded-lg">
                  <SelectValue placeholder="Departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos os dept.</SelectItem>
                  {todosDepts.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filtroEstado}
                onValueChange={(v) => {
                  setFiltroEstado(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-32 text-sm border-zinc-200 rounded-lg">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos</SelectItem>
                  <SelectItem value="Activo">Activo</SelectItem>
                  <SelectItem value="Inactivo">Inactivo</SelectItem>
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
                  label="Funcionário"
                  sortKey="nomeCompleto"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Nº Mecano."
                  sortKey="numeroMecanografico"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Cargo"
                  sortKey="cargo"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Perfil"
                  sortKey="role"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Departamento"
                  sortKey="departamento"
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
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div
                          className={`h-3.5 bg-zinc-100 rounded-full animate-pulse ${j === 0 ? 'w-40' : j === 3 ? 'w-16' : 'w-24'}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : utilizadoresOrdenados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center">
                        <Users className="h-6 w-6 text-zinc-300" />
                      </div>
                      <p className="text-sm font-medium text-zinc-500">
                        Nenhum utilizador encontrado
                      </p>
                      <p className="text-xs text-zinc-400">
                        Tente ajustar os filtros de pesquisa
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                utilizadoresOrdenados.map((u) => {
                  const rc = roleConfig[u.role] ?? {
                    label: u.role,
                    badge: 'bg-zinc-100 text-zinc-600 border-zinc-200',
                    dot: 'bg-zinc-400',
                  }
                  return (
                    <tr
                      key={u.id}
                      className="group hover:bg-zinc-50/60 transition-colors duration-100"
                    >
                      {/* Funcionário */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 shrink-0 ring-1 ring-zinc-200/80">
                            <AvatarImage
                              src={u.avatarUrl}
                              alt={u.nomeCompleto}
                            />
                            <AvatarFallback className="bg-zinc-100 text-zinc-600 text-[11px] font-semibold">
                              {getInitials(u.nomeCompleto)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-zinc-900 truncate max-w-[170px] leading-tight">
                              {u.nomeCompleto}
                            </p>
                            <p className="text-[11px] text-zinc-400 truncate max-w-[170px] mt-0.5">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Nº Mecanográfico */}
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-mono text-zinc-500 bg-zinc-100 px-2 py-1 rounded-md">
                          {u.numeroMecanografico}
                        </span>
                      </td>

                      {/* Cargo */}
                      <td className="px-4 py-3">
                        <span className="text-[13px] text-zinc-600 truncate block max-w-[130px]">
                          {u.cargo}
                        </span>
                      </td>

                      {/* Perfil */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${rc.badge}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${rc.dot}`}
                          />
                          {rc.label}
                        </span>
                      </td>

                      {/* Departamento */}
                      <td className="px-4 py-3">
                        {u.departamento?.nome ? (
                          <span className="text-[12px] text-zinc-600 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded-md">
                            {u.departamento.nome}
                          </span>
                        ) : (
                          <span className="text-zinc-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${u.estado === 'Activo' ? 'text-emerald-700' : 'text-zinc-400'}`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${u.estado === 'Activo' ? 'bg-emerald-500 shadow-sm shadow-emerald-300' : 'bg-zinc-300'}`}
                          />
                          {u.estado}
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
                            className="w-44 rounded-xl shadow-xl border-zinc-200"
                          >
                            <DropdownMenuItem
                              onClick={() => abrirEditar(u)}
                              className="gap-2.5 text-sm cursor-pointer rounded-lg"
                            >
                              <Pencil className="h-3.5 w-3.5 text-zinc-400" />{' '}
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => resetSenha(u)}
                              className="gap-2.5 text-sm cursor-pointer rounded-lg"
                            >
                              <KeyRound className="h-3.5 w-3.5 text-zinc-400" />{' '}
                              Redefinir senha
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => toggleEstado(u)}
                              className={`gap-2.5 text-sm cursor-pointer rounded-lg ${u.estado === 'Activo' ? 'text-red-600 focus:text-red-600 focus:bg-red-50' : 'text-emerald-700 focus:text-emerald-700 focus:bg-emerald-50'}`}
                            >
                              <Power className="h-3.5 w-3.5" />
                              {u.estado === 'Activo'
                                ? 'Desactivar conta'
                                : 'Activar conta'}
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
          {/* Header */}
          <SheetHeader className="px-6 py-5 border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-3">
              <div
                className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${editTarget ? 'bg-indigo-50' : 'bg-emerald-50'}`}
              >
                {editTarget ? (
                  <Pencil className="h-4 w-4 text-indigo-600" />
                ) : (
                  <UserPlus className="h-4 w-4 text-emerald-600" />
                )}
              </div>
              <div>
                <SheetTitle className="text-base font-semibold text-zinc-900">
                  {editTarget ? 'Editar Funcionário' : 'Novo Funcionário'}
                </SheetTitle>
                <SheetDescription className="text-[12px] text-zinc-500 mt-0.5">
                  {editTarget
                    ? 'Actualize os dados do funcionário.'
                    : 'A senha é gerada automaticamente e enviada por email.'}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form
              id="form-funcionario"
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-6"
            >
              {/* ── Dados pessoais ── */}
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-3">
                  Dados pessoais
                </p>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-zinc-700">
                      Nome completo
                    </Label>
                    <Input
                      {...register('nomeCompleto')}
                      placeholder="João Pedro Silva"
                      className="h-9 rounded-lg border-zinc-200 text-sm"
                    />
                    {errors.nomeCompleto && (
                      <p className="text-xs text-red-500">
                        {errors.nomeCompleto.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-zinc-700">
                        Email corporativo
                      </Label>
                      <Input
                        {...register('email')}
                        type="email"
                        placeholder="joao@empresa.ao"
                        className="h-9 rounded-lg border-zinc-200 text-sm"
                      />
                      {errors.email && (
                        <p className="text-xs text-red-500">
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-zinc-700">
                        Nº Mecanográfico
                      </Label>
                      <Input
                        {...register('numeroMecanografico')}
                        placeholder="MEC-0001"
                        className="h-9 rounded-lg border-zinc-200 text-sm"
                      />
                      {errors.numeroMecanografico && (
                        <p className="text-xs text-red-500">
                          {errors.numeroMecanografico.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-zinc-700">
                        Cargo
                      </Label>
                      <Input
                        {...register('cargo')}
                        placeholder="Técnico de Sistemas"
                        className="h-9 rounded-lg border-zinc-200 text-sm"
                      />
                      {errors.cargo && (
                        <p className="text-xs text-red-500">
                          {errors.cargo.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-zinc-700">
                        Perfil de acesso
                      </Label>
                      <Select
                        defaultValue={editTarget?.role}
                        onValueChange={(v) => setValue('role', v as any)}
                      >
                        <SelectTrigger className="w-full h-9 rounded-lg border-zinc-200 text-sm">
                          <SelectValue placeholder="Seleccione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Master">Master</SelectItem>
                          <SelectItem value="Director">Director</SelectItem>
                          <SelectItem value="ChefeDepartamento">
                            Chefe Dept.
                          </SelectItem>
                          <SelectItem value="Tecnico">Técnico</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.role && (
                        <p className="text-xs text-red-500">
                          {errors.role.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* ── Hierarquia organizacional ── */}
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-3">
                  Hierarquia organizacional
                </p>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-zinc-700">
                      Pelouro
                    </Label>
                    <Select
                      value={pelouroSel}
                      onValueChange={handlePelouroChange}
                    >
                      <SelectTrigger className="h-9 rounded-lg border-zinc-200 text-sm w-full">
                        <SelectValue placeholder="Seleccione um pelouro" />
                      </SelectTrigger>
                      <SelectContent>
                        {pelouros.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-zinc-700">
                      Direção
                      {pelouroSel && direcoesFiltradas.length === 0 && (
                        <span className="text-[11px] text-zinc-400 font-normal ml-1.5">
                          (sem direções)
                        </span>
                      )}
                    </Label>
                    <Select
                      value={direcaoSel}
                      onValueChange={handleDirecaoChange}
                      disabled={!pelouroSel}
                    >
                      <SelectTrigger
                        className={`h-9 rounded-lg border-zinc-200 text-sm w-full ${!pelouroSel ? 'opacity-50' : ''}`}
                      >
                        <SelectValue
                          placeholder={
                            pelouroSel
                              ? 'Seleccione uma direção'
                              : 'Seleccione primeiro o pelouro'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {direcoesFiltradas.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-zinc-700">
                      Departamento
                      {direcaoSel && deptsFiltrados.length === 0 && (
                        <span className="text-[11px] text-zinc-400 font-normal ml-1.5">
                          (sem departamentos)
                        </span>
                      )}
                    </Label>
                    <Select
                      defaultValue={editTarget?.departamento?.id ?? ''}
                      onValueChange={(v) => setValue('departamentoId', v)}
                      disabled={!direcaoSel}
                    >
                      <SelectTrigger
                        className={`h-9 rounded-lg border-zinc-200 text-sm w-full ${!direcaoSel ? 'opacity-50' : ''}`}
                      >
                        <SelectValue
                          placeholder={
                            direcaoSel
                              ? 'Seleccione um departamento'
                              : 'Seleccione primeiro a direção'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {deptsFiltrados.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
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
              form="form-funcionario"
              disabled={submitting}
              className="flex-1 h-9 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-sm font-medium shadow-sm"
            >
              {submitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : editTarget ? (
                'Guardar alterações'
              ) : (
                'Criar funcionário'
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
