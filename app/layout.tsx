import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'PDA — Portal de Avaliação',
  description: 'Sistema de gestão e avaliação de desempenho',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt" className={cn('h-full antialiased', jakarta.variable)}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  )
}
