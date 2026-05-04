'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  UserCircle,
  LogOut,
  ChevronRight,
  X,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/AuthContext'

const roleLabel: Record<string, string> = {
  Master: 'Master',
  Director: 'Director',
  ChefeDepartamento: 'Chefe de Departamento',
  Tecnico: 'Técnico',
}

const ROLE_PERFIL: Record<string, string> = {
  Master: '/master/perfil',
  Director: '/director/perfil',
  ChefeDepartamento: '/chefe/perfil',
  Tecnico: '/tecnico/perfil',
}

const notificacoesMock = [
  {
    id: 1,
    texto: 'Período Q1 2025 termina em 12 dias.',
    tempo: 'Agora',
    lida: false,
  },
  {
    id: 2,
    texto: '5 técnicos ainda sem ficha de avaliação.',
    tempo: '2h',
    lida: false,
  },
  {
    id: 3,
    texto: 'Director validou ficha de Carlos Domingos.',
    tempo: 'Ontem',
    lida: true,
  },
  {
    id: 4,
    texto: 'Nova reavaliação indicada por Maria Costa.',
    tempo: '2 dias',
    lida: true,
  },
]

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}

interface HeaderProps {
  sidebarOpen: boolean
  onToggleMobile: () => void
  onToggleDesktop: () => void
  sidebarCollapsed?: boolean
}

export function Header({
  sidebarOpen,
  onToggleMobile,
  onToggleDesktop,
  sidebarCollapsed,
}: HeaderProps) {
  const router = useRouter()

  // ← usa o contexto em vez de fetch próprio
  const { user } = useAuth()

  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifs, setNotifs] = useState(notificacoesMock)
  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function down(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false)
    }
    document.addEventListener('mousedown', down)
    return () => document.removeEventListener('mousedown', down)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    router.push('/')
  }

  const handlePerfil = () => {
    router.push(user ? (ROLE_PERFIL[user.role] ?? '/tecnico/perfil') : '/login')
    setProfileOpen(false)
  }

  const naoLidas = notifs.filter((n) => !n.lida).length
  const marcarTodasLidas = () =>
    setNotifs((p) => p.map((n) => ({ ...n, lida: true })))

  return (
    <header className="h-[56px] w-full bg-white border-b border-gray-100 flex items-center justify-between px-3 shrink-0">
      {/* Esquerda */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onToggleMobile}
          className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Menu className="h-4 w-4" />
        </button>
        <button
          onClick={onToggleDesktop}
          className="hidden lg:flex p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Direita */}
      <div className="flex items-center gap-0.5">
        {/* Notificações */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => {
              setNotifOpen((v) => !v)
              setProfileOpen(false)
            }}
            className="relative p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Bell className="h-[15px] w-[15px]" />
            {naoLidas > 0 && (
              <span className="absolute top-[7px] right-[7px] h-[7px] w-[7px] rounded-full bg-red-500 ring-[1.5px] ring-white" />
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-[46px] z-50 w-80 rounded-sm border border-gray-200 bg-white shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-gray-800">
                    Notificações
                  </span>
                  {naoLidas > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">
                      {naoLidas}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {naoLidas > 0 && (
                    <button
                      onClick={marcarTodasLidas}
                      className="text-[11px] text-blue-500 hover:text-blue-600 font-medium"
                    >
                      Marcar todas
                    </button>
                  )}
                  <button
                    onClick={() => setNotifOpen(false)}
                    className="p-0.5 text-gray-300 hover:text-gray-500 rounded"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <ul className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                {notifs.map((n) => (
                  <li
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${!n.lida ? 'bg-blue-50/50' : ''}`}
                  >
                    <div
                      className={`mt-[7px] h-1.5 w-1.5 rounded-full shrink-0 ${n.lida ? 'bg-gray-200' : 'bg-blue-500'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-[12.5px] leading-relaxed ${n.lida ? 'text-gray-400' : 'text-gray-700'}`}
                      >
                        {n.texto}
                      </p>
                      <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                        {n.tempo}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-gray-200 mx-1.5" />

        {/* Perfil */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => {
              setProfileOpen((v) => !v)
              setNotifOpen(false)
            }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Avatar className="h-[28px] w-[28px] shrink-0 ring-[1.5px] ring-gray-200">
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback className="bg-gray-100 text-gray-600 text-[11px] font-semibold">
                {user ? getInitials(user.nomeCompleto) : '?'}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <p className="text-[12.5px] font-semibold text-gray-800 leading-tight max-w-[110px] truncate">
                {user?.nomeCompleto ?? '—'}
              </p>
              <p className="text-[11px] text-gray-400 leading-tight">
                {user ? (roleLabel[user.role] ?? user.role) : '—'}
              </p>
            </div>
            <ChevronRight
              className={`hidden sm:block h-3 w-3 text-gray-300 transition-transform duration-200 ${profileOpen ? 'rotate-90' : ''}`}
            />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-[46px] z-50 w-52 rounded-sm border border-gray-200 bg-white shadow-2xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-[13px] font-semibold text-gray-900 truncate">
                  {user?.nomeCompleto ?? '—'}
                </p>
                <p className="text-[11px] text-gray-400 truncate mt-0.5">
                  {user?.email ?? '—'}
                </p>
              </div>
              <ul className="p-1.5 space-y-0.5">
                <li>
                  <button
                    onClick={handlePerfil}
                    className="flex items-center justify-between w-full px-3 py-2 text-[12.5px] text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors group"
                  >
                    <span className="flex items-center gap-2.5">
                      <UserCircle className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                      Meu Perfil
                    </span>
                    <ChevronRight className="h-3 w-3 text-gray-300" />
                  </button>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-[12.5px] text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Terminar Sessão
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
