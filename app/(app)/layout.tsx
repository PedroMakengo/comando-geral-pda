// app/(app)/layout.tsx
'use client'

import { useState } from 'react'
import Sidebar from '@/components/dashboard/Sidebar'
import { Header } from '@/components/dashboard/Header'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/contexts/AuthContext'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    // AuthProvider envolve TUDO — Sidebar, Header e pages partilham o mesmo user
    <AuthProvider>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar
          isOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
        />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header
            sidebarOpen={!collapsed}
            onToggleMobile={() => setMobileOpen((v) => !v)}
            onToggleDesktop={() => setCollapsed((v) => !v)}
            sidebarCollapsed={collapsed}
          />
          <main className="flex-1 overflow-y-auto p-4">
            {children}
            <Toaster richColors position="top-right" />
          </main>
        </div>
      </div>
    </AuthProvider>
  )
}
