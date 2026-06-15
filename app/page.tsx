'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'
import Image from 'next/image'

const loginSchema = z.object({
  login: z
    .string()
    .min(1, 'Email ou Nº Mecanográfico é obrigatório.')
    .refine(
      (v) => v.includes('@') || v.toUpperCase().startsWith('MEC-'),
      'Introduza um email válido ou Nº Mecanográfico (ex: MEC-0001).',
    ),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
})

type LoginForm = z.infer<typeof loginSchema>

const ROLE_ROUTES: Record<string, string> = {
  Master: '/master',
  Director: '/director',
  ChefeDepartamento: '/chefe',
  Tecnico: '/tecnico',
}

export default function Login() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (values: LoginForm) => {
    setServerError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      })

      const data = await res.json()

      if (!res.ok) {
        setServerError(data.error || 'Erro ao iniciar sessão.')
        return
      }

      router.push(ROLE_ROUTES[data.role] ?? '/tecnico')
    } catch {
      setServerError('Erro de ligação. Tente novamente.')
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      {/* Grid decorativo */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Glow suave */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="h-125 w-150 rounded-full bg-blue-100 blur-[140px] opacity-70" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Cabeçalho */}
        <div className="mb-10 text-center">
          <div className="mb-5 inline-flex h-12 w-50 items-center justify-center ">
            <Image
              src="/logo-auth.png"
              width={100}
              height={50}
              className="w-25"
              alt="Logo"
            />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            Portal de Avaliação
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Inicie sessão com as suas credenciais corporativas
          </p>
        </div>

        {/* Card */}
        <div className="rounded-md border border-zinc-200 bg-white p-6 shadow-sm">
          {/* Erro do servidor */}
          {serverError && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            {/* Login */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Email ou Nº Mecanográfico
              </label>
              <input
                {...register('login')}
                type="text"
                placeholder="master@empresa.ao ou MEC-0001"
                autoComplete="username"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-all
                  focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                  ${
                    errors.login
                      ? 'border-red-300 bg-red-50/50 focus:ring-red-500/20 focus:border-red-400'
                      : 'border-zinc-200 bg-zinc-50/50 hover:border-zinc-300'
                  }`}
              />
              {errors.login && (
                <p className="flex items-center gap-1.5 text-xs text-red-500">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {errors.login.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Senha
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-all
                    focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                    ${
                      errors.password
                        ? 'border-red-300 bg-red-50/50 focus:ring-red-500/20 focus:border-red-400'
                        : 'border-zinc-200 bg-zinc-50/50 hover:border-zinc-300'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="flex items-center gap-1.5 text-xs text-red-500">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Botão */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-zinc-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  A verificar...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Entrar
                </>
              )}
            </button>
          </form>
        </div>

        {/* Rodapé */}
        <p className="mt-6 text-center text-xs text-zinc-400">
          Problemas de acesso?{' '}
          <span className="font-medium text-zinc-600">
            Contacte a equipa de TI ou RH
          </span>
        </p>
      </div>
    </div>
  )
}
