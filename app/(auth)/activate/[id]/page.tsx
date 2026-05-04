import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ActivatePage({ params }: Props) {
  const { id } = await params

  let utilizador
  try {
    utilizador = await prisma.utilizador.findUnique({ where: { id } })
  } catch {
    redirect('/login?error=erro_interno')
  }

  if (!utilizador) redirect('/login?error=conta_nao_encontrada')
  if (utilizador!.estado === 'Activo') redirect('/login?activated=already')

  await prisma.utilizador.update({
    where: { id },
    data: { estado: 'Activo' },
  })

  redirect('/login?activated=true')
}
