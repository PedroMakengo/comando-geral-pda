// contexts/auth-context.tsx
'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

// ── Tipos ─────────────────────────────────────────────────────
export interface AuthUser {
  id: string
  nomeCompleto: string
  email: string
  numeroMecanografico: string
  cargo: string
  role: string
  avatarUrl?: string
  departamento?: { id: string; nome: string } | null
  direcao?:      { id: string; nome: string } | null
  pelouro?:      { id: string; nome: string } | null
}

interface AuthContextValue {
  user:       AuthUser | null
  ready:      boolean
  /** Força um re-fetch do utilizador (chamar após guardar perfil) */
  refresh:    () => Promise<void>
  /** Actualização optimista — aplica mudanças locais sem re-fetch */
  updateUser: (patch: Partial<AuthUser>) => void
}

// ── Contexto ──────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue>({
  user:       null,
  ready:      false,
  refresh:    async () => {},
  updateUser: () => {},
})

// ── Provider ──────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,  setUser]  = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  const fetchUser = useCallback(async () => {
    try {
      const res  = await fetch('/api/auth/me', { credentials: 'include' })
      const data = await res.json()
      if (data?.id) setUser(data)
    } catch {
      // silencioso — não bloqueia a UI
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => { fetchUser() }, [fetchUser])

  const refresh = useCallback(async () => {
    await fetchUser()
  }, [fetchUser])

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  return (
    <AuthContext.Provider value={{ user, ready, refresh, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────
export function useAuth() {
  return useContext(AuthContext)
}