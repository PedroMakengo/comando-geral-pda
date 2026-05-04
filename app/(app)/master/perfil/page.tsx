'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Camera, Loader2, Eye, EyeOff } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'

const roleLabel: Record<string, string> = {
  Master: 'Master',
  Director: 'Director',
  ChefeDepartamento: 'Chefe de Departamento',
  Tecnico: 'Técnico',
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}

const schemaNome = z.object({
  nomeCompleto: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres.'),
})

const schemaSenha = z
  .object({
    senhaActual: z.string().min(1, 'Senha actual é obrigatória.'),
    novaSenha: z
      .string()
      .min(6, 'A nova senha deve ter pelo menos 6 caracteres.'),
    confirmar: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine((d) => d.novaSenha === d.confirmar, {
    message: 'As senhas não coincidem.',
    path: ['confirmar'],
  })

type FormNome = z.infer<typeof schemaNome>
type FormSenha = z.infer<typeof schemaSenha>

export default function PerfilPage() {
  // ← usa o contexto — não faz fetch separado
  const { user, ready, updateUser, refresh } = useAuth()

  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [showSenhaActual, setShowSenhaActual] = useState(false)
  const [showNovaSenha, setShowNovaSenha] = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formNome = useForm<FormNome>({ resolver: zodResolver(schemaNome) })
  const formSenha = useForm<FormSenha>({ resolver: zodResolver(schemaSenha) })

  // Inicializar o form quando o user carregar
  useEffect(() => {
    if (user) formNome.reset({ nomeCompleto: user.nomeCompleto })
  }, [user?.nomeCompleto])

  // ── Upload avatar ──────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Preview imediato
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    setUploadingAvatar(true)
    try {
      const form = new FormData()
      form.append('avatar', file)
      const res = await fetch(`/api/utilizadores/${user.id}/avatar`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao fazer upload.')
        setAvatarPreview(null)
        return
      }

      // Actualiza o contexto imediatamente — Sidebar e Header reflectem sem reload
      updateUser({ avatarUrl: data.avatarUrl })
      setAvatarPreview(null)
      toast.success('Avatar actualizado com sucesso.')
    } catch {
      toast.error('Erro de ligação.')
      setAvatarPreview(null)
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Guardar nome ───────────────────────────────────────────
  const onSaveNome = async (values: FormNome) => {
    if (!user) return
    try {
      const res = await fetch(`/api/utilizadores/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nomeCompleto: values.nomeCompleto }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao guardar.')
        return
      }

      // Actualiza o contexto — Sidebar e Header mostram o novo nome de imediato
      updateUser({ nomeCompleto: values.nomeCompleto })
      toast.success('Nome actualizado com sucesso.')
    } catch {
      toast.error('Erro de ligação.')
    }
  }

  // ── Alterar senha ──────────────────────────────────────────
  const onChangeSenha = async (values: FormSenha) => {
    if (!user) return
    try {
      const res = await fetch(`/api/utilizadores/${user.id}/senha`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          senhaActual: values.senhaActual,
          novaSenha: values.novaSenha,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao alterar senha.')
        return
      }
      toast.success('Senha alterada com sucesso.')
      formSenha.reset()
    } catch {
      toast.error('Erro de ligação.')
    }
  }

  // ── Loading / guard ────────────────────────────────────────
  if (!ready) {
    return (
      <div className="space-y-6 max-w-2xl">
        {[80, 200, 160].map((h, i) => (
          <div
            key={i}
            style={{ height: h }}
            className="bg-zinc-100 rounded-md animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (!user) return null

  const avatarSrc = avatarPreview ?? user.avatarUrl

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Meu Perfil</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Gerencie as suas informações pessoais
        </p>
      </div>

      {/* Avatar + info */}
      <div className="rounded-md border border-zinc-200 bg-white p-6">
        <div className="flex items-start gap-5">
          <div className="relative shrink-0">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarSrc} alt={user.nomeCompleto} />
              <AvatarFallback className="bg-zinc-100 text-zinc-600 text-lg font-semibold">
                {getInitials(user.nomeCompleto)}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-zinc-900 hover:bg-zinc-700 border-2 border-white flex items-center justify-center transition-colors disabled:opacity-60"
            >
              {uploadingAvatar ? (
                <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5 text-white" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-base font-semibold text-zinc-900">
              {user.nomeCompleto}
            </h2>
            <p className="text-sm text-zinc-500">{user.cargo}</p>
            <p className="text-sm text-zinc-400">{user.email}</p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-900 text-white">
                {roleLabel[user.role] ?? user.role}
              </span>
              {user.departamento && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-600">
                  {user.departamento.nome}
                </span>
              )}
              {user.direcao && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">
                  {user.direcao.nome}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 pt-0.5 font-mono">
              {user.numeroMecanografico}
            </p>
          </div>
        </div>
        <p className="text-xs text-zinc-400 mt-4">
          Clique no ícone <span className="font-medium text-zinc-500">📷</span>{' '}
          para alterar o avatar. Formatos aceites: JPG, PNG, WEBP, GIF · Máximo
          2MB.
        </p>
      </div>

      {/* Informações da conta (leitura) */}
      <div className="rounded-md border border-zinc-200 bg-white p-6 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-900">
          Informações da conta
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Email corporativo', value: user.email },
            { label: 'Nº Mecanográfico', value: user.numeroMecanografico },
            {
              label: 'Perfil de acesso',
              value: roleLabel[user.role] ?? user.role,
            },
            { label: 'Cargo', value: user.cargo },
            { label: 'Departamento', value: user.departamento?.nome ?? '—' },
            { label: 'Direção', value: user.direcao?.nome ?? '—' },
          ].map((item, i) => (
            <div key={i} className="space-y-1">
              <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">
                {item.label}
              </p>
              <p className="text-sm text-zinc-700">{item.value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-zinc-400 pt-1">
          Para alterar email, nº mecanográfico ou cargo contacte o administrador
          do sistema.
        </p>
      </div>

      {/* Alterar nome */}
      <div className="rounded-md border border-zinc-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-zinc-900 mb-4">
          Alterar nome
        </h3>
        <form
          onSubmit={formNome.handleSubmit(onSaveNome)}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-zinc-700">
              Nome completo
            </Label>
            <Input
              {...formNome.register('nomeCompleto')}
              className="h-9 rounded-lg border-zinc-200 text-sm"
              placeholder="João Pedro Silva"
            />
            {formNome.formState.errors.nomeCompleto && (
              <p className="text-xs text-red-500">
                {formNome.formState.errors.nomeCompleto.message}
              </p>
            )}
          </div>
          <Button
            type="submit"
            disabled={formNome.formState.isSubmitting}
            className="h-9 px-5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-sm"
          >
            {formNome.formState.isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Guardar nome'
            )}
          </Button>
        </form>
      </div>

      {/* Alterar senha */}
      <div className="rounded-md border border-zinc-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-zinc-900 mb-1">
          Alterar senha
        </h3>
        <p className="text-xs text-zinc-400 mb-4">
          A nova senha deve ter pelo menos 6 caracteres.
        </p>
        <form
          onSubmit={formSenha.handleSubmit(onChangeSenha)}
          className="space-y-4"
        >
          {[
            {
              name: 'senhaActual' as const,
              label: 'Senha actual',
              show: showSenhaActual,
              toggle: setShowSenhaActual,
            },
            {
              name: 'novaSenha' as const,
              label: 'Nova senha',
              show: showNovaSenha,
              toggle: setShowNovaSenha,
            },
            {
              name: 'confirmar' as const,
              label: 'Confirmar nova senha',
              show: showConfirmar,
              toggle: setShowConfirmar,
            },
          ].map((field, fi) => (
            <div key={fi} className="space-y-1.5">
              <Label className="text-sm font-medium text-zinc-700">
                {field.label}
              </Label>
              <div className="relative">
                <Input
                  {...formSenha.register(field.name)}
                  type={field.show ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="h-9 rounded-lg border-zinc-200 text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => field.toggle((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {field.show ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {formSenha.formState.errors[field.name] && (
                <p className="text-xs text-red-500">
                  {formSenha.formState.errors[field.name]?.message}
                </p>
              )}
              {fi === 0 && <Separator className="mt-2" />}
            </div>
          ))}
          <Button
            type="submit"
            disabled={formSenha.formState.isSubmitting}
            className="h-9 px-5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-sm"
          >
            {formSenha.formState.isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Alterar senha'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
