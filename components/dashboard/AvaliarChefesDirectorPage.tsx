'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CheckCircle2,
  Loader2,
  Star,
  Users,
  Eye,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Hash,
  Building2,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { toast } from 'sonner'

// ── Tipos ─────────────────────────────────────────────────────
interface AuthUser {
  id: string
  direcao?: { id: string; nome: string } | null
  direcaoId?: string | null
}
interface FichaActual {
  id: string
  estado: string
  periodo: { id: string; nome: string }
}
interface Chefe {
  id: string
  nomeCompleto: string
  cargo: string
  email: string
  numeroMecanografico: string
  avatarUrl?: string
  telefone?: string | null
  telemovel?: string | null
  dataNascimento?: string | null
  dataAdmissao?: string | null
  localidade?: string | null
  provincia?: string | null
  departamento?: { id: string; nome: string } | null
  fichaActual?: FichaActual | null
}
interface Criterio {
  id: string
  nome: string
  peso: number
  descricao?: string | null
}
interface Meta {
  total: number
  page: number
  limit: number
  totalPages: number
}

// ── Helpers ───────────────────────────────────────────────────
function toArray<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res
  if (res && typeof res === 'object' && Array.isArray((res as any).data))
    return (res as any).data
  return []
}
async function safeFetch(url: string) {
  try {
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) return null
    return res.json()
  } catch {
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
function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const estadoCfg: Record<string, { label: string; badge: string; bg: string }> =
  {
    Pendente: {
      label: 'Pendente',
      badge: 'bg-indigo-100 text-indigo-700',
      bg: 'bg-indigo-50 border-indigo-200',
    },
    AvaliadoPorChefe: {
      label: 'Avaliado',
      badge: 'bg-blue-100 text-blue-700',
      bg: 'bg-blue-50 border-blue-200',
    },
    ValidadoPorDirector: {
      label: 'Validado',
      badge: 'bg-emerald-100 text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-200',
    },
  }

// ── Star Rating ───────────────────────────────────────────────
function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  const [hover, setHover] = useState(0)
  const labels = ['', 'Insuficiente', 'Fraco', 'Suficiente', 'Bom', 'Excelente']
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            onMouseEnter={() => !disabled && setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform hover:scale-110 disabled:cursor-default"
          >
            <Star
              className={`h-7 w-7 transition-colors ${
                n <= (hover || value)
                  ? 'fill-indigo-500 text-indigo-500'
                  : 'fill-zinc-100 text-zinc-300'
              }`}
            />
          </button>
        ))}
      </div>
      {(hover || value) > 0 && (
        <span className="text-xs font-medium text-zinc-500">
          {labels[hover || value]}
        </span>
      )}
    </div>
  )
}

function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    safeFetch('/api/auth/me')
      .then((me) => {
        if (me?.id) setUser(me)
      })
      .finally(() => setReady(true))
  }, [])
  return { user, ready }
}

// ── Componente principal ──────────────────────────────────────
export default function AvaliarChefesDirectorPage() {
  const { user, ready } = useAuthUser()
  const [chefes, setChefes] = useState<Chefe[]>([])
  const [meta, setMeta] = useState<Meta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const [sheetChefe, setSheetChefe] = useState(false)
  const [chefeVer, setChefeVer] = useState<Chefe | null>(null)

  const [sheetAvaliar, setSheetAvaliar] = useState(false)
  const [chefeAvaliar, setChefeAvaliar] = useState<Chefe | null>(null)
  const [criterios, setCriterios] = useState<Criterio[]>([])
  const [notas, setNotas] = useState<Record<string, number>>({})
  const [observacoes, setObservacoes] = useState<Record<string, string>>({})
  const [comentarios, setComentarios] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const direcaoId = user?.direcao?.id ?? user?.direcaoId
  const direcaoNome = user?.direcao?.nome ?? '—'

  const fetchChefes = useCallback(async () => {
    if (!direcaoId) return
    setLoading(true)
    try {
      // 1. Buscar todos os ChefeDepartamento da Direcção
      const params = new URLSearchParams({
        page: String(page),
        limit: '50',
        direcaoId: direcaoId,
        role: 'ChefeDepartamento',
        ...(search && { search }),
      })
      const data = await safeFetch(`/api/utilizadores?${params}`)
      const todosChefes: Chefe[] = toArray<Chefe>(data).filter(
        (c: any) => c.id !== user?.id,
      )

      if (todosChefes.length === 0) {
        setChefes([])
        setLoading(false)
        return
      }

      // 2. Buscar todas as fichas da Direcção de uma vez
      const fichasData = await safeFetch(
        `/api/fichas?direcaoId=${direcaoId}&role=ChefeDepartamento&limit=200`,
      )
      const todasFichas: any[] = toArray(fichasData)

      // Prioridade: Pendente > AvaliadoPorChefe > ValidadoPorDirector
      const prioridade: Record<string, number> = {
        Pendente: 3,
        AvaliadoPorChefe: 2,
        ValidadoPorDirector: 1,
      }

      const comFichas = todosChefes.map((c) => {
        const fichasDoChefe = todasFichas
          .filter((f: any) => f.avaliado?.id === c.id)
          .sort(
            (a: any, b: any) =>
              (prioridade[b.estado] ?? 0) - (prioridade[a.estado] ?? 0),
          )
        return { ...c, fichaActual: fichasDoChefe[0] ?? null }
      })

      setChefes(comFichas)
      if (data?.meta) setMeta(data.meta)
    } catch {
      toast.error('Erro ao carregar chefes de departamento.')
    } finally {
      setLoading(false)
    }
  }, [direcaoId, page, search, user?.id])

  useEffect(() => {
    if (ready) fetchChefes()
  }, [fetchChefes, ready])

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const verChefe = (c: Chefe) => {
    setChefeVer(c)
    setSheetChefe(true)
  }

  const abrirAvaliar = async (c: Chefe) => {
    if (!c.fichaActual) {
      toast.error('Este chefe não tem ficha de avaliação.')
      return
    }
    if (c.fichaActual.estado !== 'Pendente') {
      toast.error(
        `Este chefe já foi avaliado (${estadoCfg[c.fichaActual.estado]?.label ?? c.fichaActual.estado}).`,
      )
      return
    }
    setChefeAvaliar(c)
    setNotas({})
    setObservacoes({})
    setComentarios('')

    // Buscar critérios do departamento do chefe
    const deptId = c.departamento?.id
    if (deptId) {
      const data = await safeFetch(
        `/api/criterios?departamentoId=${deptId}&limit=50`,
      )
      setCriterios(toArray<Criterio>(data))
    } else {
      setCriterios([])
    }
    setSheetAvaliar(true)
  }

  const pontuacaoMedia =
    criterios.length > 0 && criterios.every((c) => (notas[c.id] ?? 0) > 0)
      ? (() => {
          const totalPeso = criterios.reduce((s, c) => s + c.peso, 0)
          const totalNota = criterios.reduce(
            (s, c) => s + (notas[c.id] ?? 0) * c.peso,
            0,
          )
          return totalPeso > 0 ? (totalNota / totalPeso).toFixed(1) : null
        })()
      : null

  const todosAvaliados =
    criterios.length > 0 && criterios.every((c) => (notas[c.id] ?? 0) > 0)

  const submeterAvaliacao = async () => {
    if (!chefeAvaliar?.fichaActual || !todosAvaliados) {
      toast.error('Avalie todos os critérios antes de submeter.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/submissoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fichaId: chefeAvaliar.fichaActual.id,
          comentarios: comentarios.trim() || null,
          respostas: criterios.map((c) => ({
            criterioId: c.id,
            pontuacao: notas[c.id],
            observacao: observacoes[c.id]?.trim() || null,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao submeter.')
        return
      }

      toast.success(`Avaliação de ${chefeAvaliar.nomeCompleto} submetida!`, {
        description: 'Aguarda validação do Master.',
      })
      setSheetAvaliar(false)
      fetchChefes()
    } finally {
      setSubmitting(false)
    }
  }

  const chefesFiltrados = search
    ? chefes.filter((c) =>
        c.nomeCompleto.toLowerCase().includes(search.toLowerCase()),
      )
    : chefes

  const paraAvaliar = chefes.filter(
    (c) => c.fichaActual?.estado === 'Pendente',
  ).length

  // ── Loading ───────────────────────────────────────────────
  if (!ready)
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 bg-zinc-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )

  // ── Sem direcção ──────────────────────────────────────────
  if (!direcaoId)
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-14 text-center">
        <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
          <Building2 className="h-6 w-6 text-zinc-300" />
        </div>
        <p className="text-sm font-semibold text-zinc-600">
          Sem direcção associada
        </p>
        <p className="text-xs text-zinc-400 mt-1">
          Contacte o administrador para associar a sua direcção.
        </p>
      </div>
    )

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
          Avaliar Chefes de Departamento
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {direcaoNome} · {chefes.length} chefe{chefes.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Info */}
      <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 flex items-start gap-3">
        <Building2 className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-700">
          Como Director, avalia os <strong>Chefes de Departamento</strong> da
          sua Direcção. Após a submissão, a avaliação aguarda validação do{' '}
          <strong>Master</strong>.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-zinc-200 shadow-none bg-zinc-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-4 w-4 text-zinc-400" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                Total
              </p>
              <p className="text-2xl font-bold text-zinc-900 leading-none mt-0.5">
                {chefes.length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`border shadow-none ${paraAvaliar > 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-zinc-50 border-zinc-200'}`}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <ClipboardList
              className={`h-4 w-4 ${paraAvaliar > 0 ? 'text-indigo-500' : 'text-zinc-400'}`}
            />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                Para avaliar
              </p>
              <p
                className={`text-2xl font-bold leading-none mt-0.5 ${paraAvaliar > 0 ? 'text-indigo-700' : 'text-zinc-900'}`}
              >
                {paraAvaliar}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pesquisa */}
      <Card className="border-zinc-200 shadow-none">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Pesquisar chefe..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-9 text-sm border-zinc-200 rounded-lg bg-zinc-50 focus:bg-white transition-colors"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-16 bg-zinc-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : chefesFiltrados.length === 0 ? (
          <div className="p-16 text-center">
            <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
              <Users className="h-6 w-6 text-zinc-300" />
            </div>
            <p className="text-sm font-medium text-zinc-500">
              Nenhum chefe encontrado
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Verifique se existem chefes na direcção{' '}
              <strong>{direcaoNome}</strong>.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {chefesFiltrados.map((c) => {
              const cfg = estadoCfg[c.fichaActual?.estado ?? '']
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-50/60 transition-colors"
                >
                  <Avatar className="h-10 w-10 shrink-0 ring-1 ring-zinc-200">
                    <AvatarImage src={c.avatarUrl} />
                    <AvatarFallback className="bg-zinc-100 text-zinc-600 text-xs font-semibold">
                      {getInitials(c.nomeCompleto)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-900 truncate">
                      {c.nomeCompleto}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {c.cargo}
                      {c.departamento ? ` · ${c.departamento.nome}` : ''}
                    </p>
                  </div>
                  {/* Estado ficha */}
                  <div className="shrink-0 hidden sm:block">
                    {cfg ? (
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}
                      >
                        {cfg.label}
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-300">
                        Sem ficha
                      </span>
                    )}
                  </div>
                  {/* Acções */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => verChefe(c)}
                      title="Ver detalhes"
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {c.fichaActual?.estado === 'Pendente' && (
                      <Button
                        size="sm"
                        onClick={() => abrirAvaliar(c)}
                        className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                      >
                        <Star className="h-3.5 w-3.5" /> Avaliar
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

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

      {/* ── Sheet detalhe do chefe ── */}
      <Sheet open={sheetChefe} onOpenChange={setSheetChefe}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
          <SheetHeader className="px-6 py-5 border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-zinc-500" />
              </div>
              <div>
                <SheetTitle className="text-base font-semibold text-zinc-900">
                  Ficha do Chefe
                </SheetTitle>
                <SheetDescription className="text-[12px] text-zinc-500 mt-0.5">
                  {chefeVer?.nomeCompleto}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {chefeVer && (
              <>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                  <Avatar className="h-14 w-14 ring-2 ring-zinc-200">
                    <AvatarImage src={chefeVer.avatarUrl} />
                    <AvatarFallback className="bg-zinc-200 text-zinc-700 text-sm font-bold">
                      {getInitials(chefeVer.nomeCompleto)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-base font-bold text-zinc-900">
                      {chefeVer.nomeCompleto}
                    </p>
                    <p className="text-sm text-zinc-500 mt-0.5">
                      {chefeVer.cargo}
                    </p>
                    {chefeVer.departamento && (
                      <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {chefeVer.departamento.nome}
                      </p>
                    )}
                    <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full font-mono">
                      <Hash className="h-3 w-3" />
                      {chefeVer.numeroMecanografico}
                    </span>
                  </div>
                </div>

                {/* Estado da ficha */}
                {chefeVer.fichaActual ? (
                  <div
                    className={`rounded-xl border p-3.5 flex items-center justify-between ${estadoCfg[chefeVer.fichaActual.estado]?.bg ?? 'bg-zinc-50 border-zinc-200'}`}
                  >
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                        Período Actual
                      </p>
                      <p className="text-sm font-semibold text-zinc-800 mt-0.5">
                        {chefeVer.fichaActual.periodo.nome}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${estadoCfg[chefeVer.fichaActual.estado]?.badge ?? 'bg-zinc-100 text-zinc-600'}`}
                    >
                      {estadoCfg[chefeVer.fichaActual.estado]?.label ??
                        chefeVer.fichaActual.estado}
                    </span>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-zinc-200 p-3.5 text-center">
                    <p className="text-xs text-zinc-400">
                      Sem ficha de avaliação no período actual.
                    </p>
                  </div>
                )}

                <Separator />

                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-3">
                    Contacto
                  </p>
                  <div className="space-y-2.5">
                    {[
                      {
                        icon: <Mail className="h-3.5 w-3.5" />,
                        label: 'Email',
                        value: chefeVer.email,
                      },
                      {
                        icon: <Phone className="h-3.5 w-3.5" />,
                        label: 'Telefone',
                        value: chefeVer.telefone,
                      },
                      {
                        icon: <Phone className="h-3.5 w-3.5" />,
                        label: 'Telemóvel',
                        value: chefeVer.telemovel,
                      },
                    ]
                      .filter((r) => r.value)
                      .map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2.5 text-sm"
                        >
                          <span className="text-zinc-400">{r.icon}</span>
                          <span className="text-zinc-400 text-xs w-16 shrink-0">
                            {r.label}
                          </span>
                          <span className="text-zinc-700 font-medium">
                            {r.value}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em] mb-3">
                    Dados pessoais
                  </p>
                  <div className="space-y-2.5">
                    {[
                      {
                        icon: <Calendar className="h-3.5 w-3.5" />,
                        label: 'Nascimento',
                        value: formatDate(chefeVer.dataNascimento),
                      },
                      {
                        icon: <Calendar className="h-3.5 w-3.5" />,
                        label: 'Admissão',
                        value: formatDate(chefeVer.dataAdmissao),
                      },
                      {
                        icon: <MapPin className="h-3.5 w-3.5" />,
                        label: 'Localidade',
                        value:
                          [chefeVer.localidade, chefeVer.provincia]
                            .filter(Boolean)
                            .join(', ') || '—',
                      },
                    ].map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 text-sm"
                      >
                        <span className="text-zinc-400">{r.icon}</span>
                        <span className="text-zinc-400 text-xs w-16 shrink-0">
                          {r.label}
                        </span>
                        <span className="text-zinc-700 font-medium">
                          {r.value ?? '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {chefeVer.fichaActual?.estado === 'Pendente' && (
                  <Button
                    onClick={() => {
                      setSheetChefe(false)
                      setTimeout(() => abrirAvaliar(chefeVer), 150)
                    }}
                    className="w-full h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium gap-2"
                  >
                    <Star className="h-4 w-4" /> Avaliar agora
                  </Button>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Sheet de avaliação ── */}
      <Sheet open={sheetAvaliar} onOpenChange={setSheetAvaliar}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0 overflow-hidden">
          <SheetHeader className="px-6 py-5 border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                <Star className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <SheetTitle className="text-base font-semibold text-zinc-900">
                  Avaliar Chefe
                </SheetTitle>
                <SheetDescription className="text-[12px] text-zinc-500 mt-0.5">
                  {chefeAvaliar?.nomeCompleto} ·{' '}
                  {chefeAvaliar?.fichaActual?.periodo.nome}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {chefeAvaliar && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={chefeAvaliar.avatarUrl} />
                  <AvatarFallback className="bg-zinc-100 text-zinc-600 text-xs font-semibold">
                    {getInitials(chefeAvaliar.nomeCompleto)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zinc-900">
                    {chefeAvaliar.nomeCompleto}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {chefeAvaliar.cargo}
                    {chefeAvaliar.departamento
                      ? ` · ${chefeAvaliar.departamento.nome}`
                      : ''}
                  </p>
                </div>
                {pontuacaoMedia && (
                  <div className="shrink-0 text-right">
                    <p className="text-xl font-bold text-indigo-600 leading-none">
                      {pontuacaoMedia}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">/ 5.0</p>
                  </div>
                )}
              </div>
            )}

            {criterios.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center">
                <p className="text-sm text-zinc-400">
                  Sem critérios definidos para este departamento.
                </p>
                <p className="text-xs text-zinc-300 mt-1">
                  Contacte o Master para configurar os critérios.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em]">
                  Critérios ({criterios.length})
                </p>
                {criterios.map((c, idx) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-zinc-200 p-4 bg-white space-y-3"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-bold text-zinc-300 mt-0.5">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-zinc-900">
                            {c.nome}
                          </p>
                          <span className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded font-medium shrink-0">
                            ×{c.peso}
                          </span>
                        </div>
                        {c.descricao && (
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {c.descricao}
                          </p>
                        )}
                      </div>
                    </div>
                    <StarRating
                      value={notas[c.id] ?? 0}
                      onChange={(v) =>
                        setNotas((prev) => ({ ...prev, [c.id]: v }))
                      }
                    />
                    {(notas[c.id] ?? 0) > 0 && (
                      <Input
                        placeholder="Observação (opcional)..."
                        value={observacoes[c.id] ?? ''}
                        onChange={(e) =>
                          setObservacoes((prev) => ({
                            ...prev,
                            [c.id]: e.target.value,
                          }))
                        }
                        className="h-8 text-xs border-zinc-200 rounded-lg bg-zinc-50"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {criterios.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-zinc-700">
                  Comentário geral{' '}
                  <span className="text-zinc-400 font-normal">(opcional)</span>
                </Label>
                <Textarea
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  placeholder="Observações sobre o desempenho do chefe..."
                  className="rounded-lg border-zinc-200 text-sm resize-none"
                  rows={3}
                />
              </div>
            )}

            {pontuacaoMedia && (
              <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-indigo-700">
                    {pontuacaoMedia}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-indigo-800">
                    Pontuação calculada
                  </p>
                  <p className="text-xs text-indigo-600 mt-0.5">
                    Média ponderada dos critérios
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-zinc-100 shrink-0 flex gap-2.5 bg-white">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-9 rounded-lg border-zinc-200 text-sm"
              onClick={() => setSheetAvaliar(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={submeterAvaliacao}
              disabled={submitting || !todosAvaliados || criterios.length === 0}
              className="flex-1 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> A submeter...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Submeter avaliação de{' '}
                  {chefeAvaliar?.nomeCompleto.split(' ')[0]}
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
