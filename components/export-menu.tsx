'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

export type ExportTipo =
  | 'utilizadores'
  | 'pelouros'
  | 'direcoes'
  | 'departamentos'
  | 'periodos'
  | 'criterios'
  | 'fichas'

interface ExportMenuProps {
  tipo: ExportTipo
  disabled?: boolean
}

async function downloadFicheiro(tipo: ExportTipo, formato: 'pdf' | 'excel') {
  const res = await fetch(`/api/exportar?tipo=${tipo}&formato=${formato}`, {
    credentials: 'include',
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Erro ${res.status}`)
  }

  const blob = await res.blob()
  const ext = formato === 'pdf' ? 'pdf' : 'xlsx'
  const name = `${tipo}_${new Date().toISOString().split('T')[0]}.${ext}`

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function ExportMenu({ tipo, disabled = false }: ExportMenuProps) {
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [loadingXlsx, setLoadingXlsx] = useState(false)

  const isLoading = loadingPdf || loadingXlsx

  const handle = (formato: 'pdf' | 'excel') => async () => {
    const set = formato === 'pdf' ? setLoadingPdf : setLoadingXlsx
    set(true)
    try {
      await downloadFicheiro(tipo, formato)
      toast.success(
        formato === 'pdf'
          ? 'PDF gerado com sucesso.'
          : 'Excel gerado com sucesso.',
      )
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao exportar.')
    } finally {
      set(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isLoading}
          className="gap-2 h-8 border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-md text-sm font-medium"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-zinc-400 font-normal">
          Exportar dados actuais
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handle('pdf')}
          disabled={loadingPdf}
          className="gap-2.5 text-sm cursor-pointer"
        >
          {loadingPdf ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          ) : (
            <FileText className="h-4 w-4 text-red-500" />
          )}
          <div className="flex flex-col">
            <span className="font-medium">Exportar PDF</span>
            <span className="text-[11px] text-zinc-400">
              Relatório imprimível
            </span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handle('excel')}
          disabled={loadingXlsx}
          className="gap-2.5 text-sm cursor-pointer"
        >
          {loadingXlsx ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          ) : (
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          )}
          <div className="flex flex-col">
            <span className="font-medium">Exportar Excel</span>
            <span className="text-[11px] text-zinc-400">Folha de cálculo</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
