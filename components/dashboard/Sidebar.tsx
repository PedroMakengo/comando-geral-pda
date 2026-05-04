'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Users,
  Building2,
  Layers,
  Network,
  CalendarRange,
  ClipboardList,
  BarChart2,
  FileText,
  UserCog,
  Settings2,
  CheckSquare,
  UserCheck,
  RefreshCw,
  Gauge,
  SearchCode,
  ChevronLeft,
  X,
  TrendingUp,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'

type MenuItem = { label: string; href: string; icon: React.ReactNode }
type MenuSection = { title?: string; items: MenuItem[] }

const roleLabel: Record<string, string> = {
  Master: 'Master',
  Director: 'Director',
  ChefeDepartamento: 'Chefe de Departamento',
  Tecnico: 'Técnico',
}

const menuSections: Record<string, MenuSection[]> = {
  Master: [
    { items: [{ label: 'Início', href: '/master', icon: <Home size={15} /> }] },
    {
      title: 'Organização',
      items: [
        {
          label: 'Funcionários',
          href: '/master/utilizadores',
          icon: <Users size={15} />,
        },
        {
          label: 'Departamentos',
          href: '/master/departamentos',
          icon: <Building2 size={15} />,
        },
        {
          label: 'Direções',
          href: '/master/direcoes',
          icon: <Layers size={15} />,
        },
        {
          label: 'Pelouros',
          href: '/master/pelouros',
          icon: <Network size={15} />,
        },
      ],
    },
    {
      title: 'Avaliação',
      items: [
        {
          label: 'Períodos',
          href: '/master/periodos',
          icon: <CalendarRange size={15} />,
        },
        {
          label: 'Critérios',
          href: '/master/criterios',
          icon: <ClipboardList size={15} />,
        },
        {
          label: 'Fichas',
          href: '/master/fichas',
          icon: <FileText size={15} />,
        },
        {
          label: 'Histórico',
          href: '/master/historico',
          icon: <BarChart2 size={15} />,
        },
      ],
    },
    {
      title: 'Sistema',
      items: [
        { label: 'Logs', href: '/master/log', icon: <SearchCode size={15} /> },
        {
          label: 'Indicadores',
          href: '/master/indicadores',
          icon: <TrendingUp size={15} />,
        },
      ],
    },
  ],
  Director: [
    {
      items: [{ label: 'Início', href: '/director', icon: <Home size={15} /> }],
    },
    {
      title: 'Avaliação',
      items: [
        {
          label: 'Auto-avaliação',
          href: '/director/auto-avaliacao',
          icon: <Gauge size={15} />,
        },
        {
          label: 'Critérios',
          href: '/director/criterios',
          icon: <Settings2 size={15} />,
        },
        {
          label: 'Fichas',
          href: '/director/fichas',
          icon: <FileText size={15} />,
        },
        {
          label: 'Reavaliações',
          href: '/director/reavaliacoes',
          icon: <RefreshCw size={15} />,
        },
        {
          label: 'Validações',
          href: '/director/validacoes',
          icon: <CheckSquare size={15} />,
        },
        {
          label: 'Histórico',
          href: '/director/historico',
          icon: <BarChart2 size={15} />,
        },
      ],
    },
    {
      title: 'Conta',
      items: [
        {
          label: 'Meu Perfil',
          href: '/director/perfil',
          icon: <UserCog size={15} />,
        },
      ],
    },
  ],
  ChefeDepartamento: [
    { items: [{ label: 'Início', href: '/chefe', icon: <Home size={15} /> }] },
    {
      title: 'Avaliação',
      items: [
        {
          label: 'Auto-avaliação',
          href: '/chefe/auto-avaliacao',
          icon: <Gauge size={15} />,
        },
        {
          label: 'Avaliar Técnicos',
          href: '/chefe/avaliar',
          icon: <UserCheck size={15} />,
        },
        {
          label: 'Reavaliações',
          href: '/chefe/reavaliacoes',
          icon: <RefreshCw size={15} />,
        },
        {
          label: 'Fichas',
          href: '/chefe/fichas',
          icon: <FileText size={15} />,
        },
        {
          label: 'Histórico',
          href: '/chefe/historico',
          icon: <BarChart2 size={15} />,
        },
      ],
    },
    {
      title: 'Conta',
      items: [
        {
          label: 'Meu Perfil',
          href: '/chefe/perfil',
          icon: <UserCog size={15} />,
        },
      ],
    },
  ],
  Tecnico: [
    {
      items: [{ label: 'Início', href: '/tecnico', icon: <Home size={15} /> }],
    },
    {
      title: 'Avaliação',
      items: [
        {
          label: 'Auto-avaliação',
          href: '/tecnico/auto-avaliacao',
          icon: <Gauge size={15} />,
        },
        {
          label: 'Reavaliação',
          href: '/tecnico/reavaliacao',
          icon: <RefreshCw size={15} />,
        },
        {
          label: 'Minhas Fichas',
          href: '/tecnico/fichas',
          icon: <FileText size={15} />,
        },
        {
          label: 'Histórico',
          href: '/tecnico/historico',
          icon: <BarChart2 size={15} />,
        },
      ],
    },
    {
      title: 'Conta',
      items: [
        {
          label: 'Meu Perfil',
          href: '/tecnico/perfil',
          icon: <UserCog size={15} />,
        },
      ],
    },
  ],
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}

function Tooltip({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="relative group/tip">
      {children}
      <div
        className="
        pointer-events-none select-none
        absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[200]
        px-3 py-1.5 rounded-sm whitespace-nowrap
        text-[12px] font-medium tracking-wide text-zinc-100
        bg-zinc-900 border border-zinc-700/60 shadow-2xl
        opacity-0 -translate-x-2 scale-95
        group-hover/tip:opacity-100 group-hover/tip:translate-x-0 group-hover/tip:scale-100
        transition-all duration-200 ease-out
      "
      >
        {label}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-zinc-900" />
      </div>
    </div>
  )
}

interface SidebarCoreProps {
  sections: MenuSection[]
  pathname: string
  collapsed: boolean
  onToggleCollapse: () => void
  onClose?: () => void
  isMobile?: boolean
}

function SidebarCore({
  sections,
  pathname,
  collapsed,
  onToggleCollapse,
  onClose,
  isMobile = false,
}: SidebarCoreProps) {
  // ← usa o contexto em vez de fetch próprio
  const { user } = useAuth()
  const isCollapsed = collapsed && !isMobile

  return (
    <aside
      style={{ width: isCollapsed ? '68px' : '264px' }}
      className="
        relative h-full flex flex-col bg-[#0e0f11]
        border-r border-white/[0.05]
        transition-[width] duration-300 ease-in-out overflow-hidden select-none
      "
    >
      {/* Textura de fundo */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 3h1v1H1V3zm2-2h1v1H3V1z' fill='%23ffffff' fill-opacity='1'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Cabeçalho */}
      <div
        className={`flex items-center h-[56px] shrink-0 px-4 ${isCollapsed ? 'justify-center' : 'justify-between'}`}
      >
        {isCollapsed ? (
          <button
            onClick={onToggleCollapse}
            title="Expandir"
            className="flex items-center justify-center w-9 h-9 rounded-sm hover:bg-white/[0.07] transition-colors"
          >
            <Image
              src="/logo.png"
              width={24}
              height={24}
              alt="Logo"
              className="filter brightness-0 invert"
            />
          </button>
        ) : (
          <>
            <Image
              src="/logo.png"
              width={84}
              height={32}
              alt="Logo"
              className="filter brightness-0 invert"
            />
            {isMobile ? (
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="h-8 w-8 rounded-sm flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.07] transition-colors"
              >
                <X size={16} />
              </button>
            ) : (
              <button
                onClick={onToggleCollapse}
                title="Recolher"
                className="h-8 w-8 rounded-sm flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.07] transition-colors"
              >
                <ChevronLeft size={15} />
              </button>
            )}
          </>
        )}
      </div>

      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent shrink-0" />

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 sidebar-scroll">
        {sections.map((section, si) => (
          <div key={si} className={isCollapsed ? 'px-2' : 'px-3'}>
            {section.title && !isCollapsed && (
              <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold tracking-widest uppercase text-zinc-600">
                {section.title}
              </p>
            )}
            {section.title && isCollapsed && si > 0 && (
              <div className="my-2 h-px bg-white/[0.06]" />
            )}
            <ul className="space-y-0.5">
              {section.items.map((item, i) => {
                const isActive = pathname === item.href
                const link = (
                  <Link
                    href={item.href}
                    className={`
                    group relative flex items-center rounded-sm
                    transition-all duration-150 ease-out
                    ${isCollapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-3 px-3 py-[9px]'}
                    ${
                      isActive
                        ? 'bg-indigo-500/[0.15] text-indigo-300'
                        : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05]'
                    }
                  `}
                  >
                    {isActive && !isCollapsed && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-indigo-400 to-indigo-600" />
                    )}
                    {isActive && isCollapsed && (
                      <span className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-indigo-400" />
                    )}
                    <span
                      className={`shrink-0 transition-colors duration-150 ${isActive ? 'text-indigo-400' : 'text-zinc-600 group-hover:text-zinc-300'}`}
                    >
                      {item.icon}
                    </span>
                    {!isCollapsed && (
                      <span className="text-[13px] font-medium leading-none tracking-[-0.01em] truncate">
                        {item.label}
                      </span>
                    )}
                  </Link>
                )
                return (
                  <li key={i}>
                    {isCollapsed ? (
                      <Tooltip label={item.label}>{link}</Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent shrink-0" />

      {/* Utilizador — vem do contexto, actualiza em tempo real */}
      <div className={`shrink-0 ${isCollapsed ? 'px-2 py-3' : 'px-3 py-3'}`}>
        {isCollapsed ? (
          <Tooltip
            label={`${user?.nomeCompleto ?? '—'} · ${user ? (roleLabel[user.role] ?? user.role) : ''}`}
          >
            <div className="flex justify-center">
              <Avatar className="h-9 w-9 ring-1 ring-white/10 cursor-default">
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback className="bg-zinc-800 text-zinc-300 text-[11px] font-semibold">
                  {user ? getInitials(user.nomeCompleto) : '?'}
                </AvatarFallback>
              </Avatar>
            </div>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-sm bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-colors cursor-default">
            <Avatar className="h-8 w-8 shrink-0 ring-1 ring-white/10">
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback className="bg-zinc-800 text-zinc-300 text-[11px] font-semibold">
                {user ? getInitials(user.nomeCompleto) : '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-semibold text-zinc-200 truncate leading-tight">
                {user?.nomeCompleto ?? '—'}
              </p>
              <p className="text-[11px] text-zinc-600 truncate leading-tight mt-0.5">
                {user ? (roleLabel[user.role] ?? user.role) : '—'}
              </p>
            </div>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 ring-2 ring-emerald-500/20" />
          </div>
        )}
      </div>
    </aside>
  )
}

export interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

export default function Sidebar({
  isOpen,
  onClose,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname()
  const { user, ready } = useAuth()

  // Fechar drawer ao navegar
  const [prevPath, setPrevPath] = useState(pathname)
  if (pathname !== prevPath) {
    setPrevPath(pathname)
    onClose()
  }

  // Bloquear scroll quando drawer aberto
  if (typeof window !== 'undefined') {
    document.body.style.overflow = isOpen ? 'hidden' : ''
  }

  if (!ready) return null

  const role = user?.role ?? 'Tecnico'
  const sections = menuSections[role] ?? menuSections.Tecnico

  return (
    <>
      <style>{`
        .sidebar-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.05) transparent; }
        .sidebar-scroll::-webkit-scrollbar { width: 3px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 99px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.12); }
      `}</style>

      {/* Desktop ≥ lg */}
      <div className="hidden lg:block h-screen shrink-0">
        <SidebarCore
          sections={sections}
          pathname={pathname}
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
        />
      </div>

      {/* Mobile + Tablet < lg */}
      <div className="lg:hidden">
        <div
          className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onClick={onClose}
        />
        <div
          className={`fixed top-0 left-0 z-50 h-full shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <SidebarCore
            sections={sections}
            pathname={pathname}
            collapsed={false}
            onToggleCollapse={() => {}}
            onClose={onClose}
            isMobile
          />
        </div>
      </div>
    </>
  )
}
