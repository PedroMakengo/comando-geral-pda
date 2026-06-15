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
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Loader2,
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
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
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
interface SortState {
  key: SortKey | null
  direction: 'asc' | 'desc'
}
interface ImportResult {
  total: number
  criados: number
  actualizados: number
  ignorados: number
  erros: { linha: number; motivo: string }[]
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

// ── Sheet de Importação ───────────────────────────────────────
function ImportSheet({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const reset = () => {
    setFile(null)
    setResult(null)
  }

  const handleFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      toast.error('Formato inválido. Use .xlsx, .xls ou .csv')
      return
    }
    setFile(f)
    setResult(null)
  }

  const handleImport = async () => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/utilizadores/import', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Erro na importação.')
        return
      }
      setResult(data)
      if (data.criados > 0 || data.actualizados > 0) {
        onSuccess()
        toast.success(
          `Importação concluída — ${data.criados} criados, ${data.actualizados} actualizados`,
        )
      }
    } catch {
      toast.error('Erro ao enviar o ficheiro.')
    } finally {
      setUploading(false)
    }
  }

  // Download do template
  const downloadTemplate = () => {
    const headers = [
      'Nº Funcionário',
      'Nome',
      'Nome Abreviado',
      'Email',
      'Cargo',
      'Data Nascimento',
      'Género',
      'Nacionalidade',
      'Naturalidade',
      'Telefone',
      'Telemóvel',
      'Extensão',
      'Morada',
      'Localidade',
      'Código Postal',
      'País',
      'Província',
      'Município',
      'Comuna',
    ]
    const exemplo = [
      'MEC-0001',
      'João Pedro Silva',
      'João Silva',
      'joao.silva@adapec.ao',
      'Técnico de Sistemas',
      '15/06/1990',
      'Masculino',
      'Angolana',
      'Luanda',
      '923000001',
      '912000001',
      '101',
      'Rua 1 de Agosto, Nº 12',
      'Luanda',
      '1000-000',
      'Angola',
      'Luanda',
      'Luanda',
      'Ingombota',
    ]
    // Criar CSV simples
    const csv = [headers.join(';'), exemplo.join(';')].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_importacao_funcionarios.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const successRate = result
    ? Math.round(((result.criados + result.actualizados) / result.total) * 100)
    : 0

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) reset()
        onOpenChange(v)
      }}
    >
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
        <SheetHeader className="px-6 py-5 border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <SheetTitle className="text-base font-semibold text-zinc-900">
                Importar do Primavera
              </SheetTitle>
              <SheetDescription className="text-[12px] text-zinc-500 mt-0.5">
                Carregue um ficheiro Excel (.xlsx) ou CSV exportado do Primavera
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Download template */}
          <button
            type="button"
            onClick={downloadTemplate}
            className="w-full flex items-center gap-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 hover:bg-zinc-100 px-4 py-3 transition-colors text-left"
          >
            <Download className="h-4 w-4 text-zinc-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-zinc-700">
                Baixar template CSV
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Estrutura compatível com o Primavera
              </p>
            </div>
          </button>

          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const f = e.dataTransfer.files[0]
              if (f) handleFile(f)
            }}
            className={`relative rounded-xl border-2 border-dashed transition-colors ${dragOver ? 'border-blue-400 bg-blue-50/60' : file ? 'border-emerald-300 bg-emerald-50/40' : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-zinc-100'} p-8 text-center cursor-pointer`}
            onClick={() =>
              document.getElementById('import-file-input')?.click()
            }
          >
            <input
              id="import-file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
            {file ? (
              <div className="space-y-2">
                <FileSpreadsheet className="h-8 w-8 text-emerald-500 mx-auto" />
                <p className="text-sm font-semibold text-zinc-800">
                  {file.name}
                </p>
                <p className="text-xs text-zinc-400">
                  {(file.size / 1024).toFixed(1)} KB · Clique para trocar
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 text-zinc-300 mx-auto" />
                <p className="text-sm font-medium text-zinc-600">
                  Arraste o ficheiro aqui
                </p>
                <p className="text-xs text-zinc-400">
                  ou clique para seleccionar · .xlsx, .xls, .csv
                </p>
              </div>
            )}
          </div>

          {/* Mapeamento de colunas esperadas */}
          {!result && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
              <p className="text-xs font-semibold text-blue-800 mb-2">
                Colunas reconhecidas do Primavera
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {[
                  'Nº Funcionário',
                  'Nome',
                  'Nome Abreviado',
                  'Email',
                  'Cargo',
                  'Data Nascimento',
                  'Género',
                  'Nacionalidade',
                  'Telefone',
                  'Telemóvel',
                  'Morada',
                  'Província',
                ].map((col) => (
                  <p
                    key={col}
                    className="text-[11px] text-blue-700 flex items-center gap-1"
                  >
                    <span className="h-1 w-1 rounded-full bg-blue-400 shrink-0" />{' '}
                    {col}
                  </p>
                ))}
              </div>
              <p className="text-[11px] text-blue-600 mt-2">
                Funcionários existentes (mesmo nº mecanográfico) serão{' '}
                <strong>actualizados</strong>, novos serão{' '}
                <strong>criados</strong> com a senha padrão{' '}
                <code className="bg-blue-100 px-1 rounded">Adapec@2025</code>.
              </p>
            </div>
          )}

          {/* Resultado */}
          {result && (
            <div className="space-y-4">
              {/* Barra de progresso */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-semibold text-zinc-800">
                    Resultado da importação
                  </p>
                  <span
                    className={`text-xs font-bold ${successRate === 100 ? 'text-emerald-600' : successRate > 70 ? 'text-blue-600' : 'text-amber-600'}`}
                  >
                    {successRate}%
                  </span>
                </div>
                <Progress value={successRate} className="h-2" />
              </div>

              {/* Cards de resultado */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    label: 'Total linhas',
                    value: result.total,
                    cls: 'bg-zinc-50 border-zinc-200',
                    icon: <FileSpreadsheet className="h-4 w-4 text-zinc-400" />,
                  },
                  {
                    label: 'Criados',
                    value: result.criados,
                    cls: 'bg-emerald-50 border-emerald-200',
                    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
                  },
                  {
                    label: 'Actualizados',
                    value: result.actualizados,
                    cls: 'bg-blue-50 border-blue-200',
                    icon: <CheckCircle2 className="h-4 w-4 text-blue-600" />,
                  },
                  {
                    label: 'Ignorados',
                    value: result.ignorados,
                    cls:
                      result.ignorados > 0
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-zinc-50 border-zinc-200',
                    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-3 flex items-center gap-2.5 ${s.cls}`}
                  >
                    {s.icon}
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-semibold">
                        {s.label}
                      </p>
                      <p className="text-xl font-bold text-zinc-900 leading-none mt-0.5">
                        {s.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Erros detalhados */}
              {result.erros.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5" /> {result.erros.length}{' '}
                    erro{result.erros.length !== 1 ? 's' : ''} encontrado
                    {result.erros.length !== 1 ? 's' : ''}
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {result.erros.map((e, i) => (
                      <p key={i} className="text-[11px] text-red-600">
                        <span className="font-semibold">Linha {e.linha}:</span>{' '}
                        {e.motivo}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={reset}
                className="w-full text-xs text-zinc-500 hover:text-zinc-800 underline transition-colors"
              >
                Importar outro ficheiro
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="px-6 py-4 border-t border-zinc-100 shrink-0 flex gap-2.5 bg-white">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-9 rounded-lg border-zinc-200 text-sm"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || uploading}
              className="flex-1 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> A importar...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Importar
                </>
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
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
  const [importOpen, setImportOpen] = useState(false)
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
    toast.success(
      data.estado === 'Activo' ? 'Conta activada' : 'Conta desactivada',
    )
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
    toast.success('Senha redefinida')
  }

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
      {/* Cabeçalho */}
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
        <div className="flex items-center gap-2 flex-wrap">
          <ExportMenu tipo="utilizadores" />
          <Button
            onClick={() => setImportOpen(true)}
            variant="outline"
            size="sm"
            className="gap-2 h-9 border-zinc-200 text-zinc-600 hover:text-zinc-900 rounded-lg text-sm"
          >
            <Upload className="h-4 w-4" /> Importar Primavera
          </Button>
          <Button
            onClick={abrirNovo}
            size="sm"
            className="gap-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg h-9 px-4 shadow-sm"
          >
            <UserPlus className="h-4 w-4" /> Novo Funcionário
          </Button>
        </div>
      </div>

      {/* Mini stats */}
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

      {/* Filtros */}
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

      {/* Tabela */}
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
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-mono text-zinc-500 bg-zinc-100 px-2 py-1 rounded-md">
                          {u.numeroMecanografico}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[13px] text-zinc-600 truncate block max-w-[130px]">
                          {u.cargo}
                        </span>
                      </td>
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
                      <td className="px-4 py-3">
                        {u.departamento?.nome ? (
                          <span className="text-[12px] text-zinc-600 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded-md">
                            {u.departamento.nome}
                          </span>
                        ) : (
                          <span className="text-zinc-300 text-xs">—</span>
                        )}
                      </td>
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

      {/* Sheet criar/editar */}
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
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form
              id="form-funcionario"
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-6"
            >
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
                        Email
                      </Label>
                      <Input
                        {...register('email')}
                        type="email"
                        placeholder="joao@adapec.ao"
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
                        Perfil
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

      {/* Sheet de importação */}
      <ImportSheet
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={fetchUtilizadores}
      />
    </div>
  )
}
