import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { requireAuth, getPayloadFromRequest } from '@/lib/permissions'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const auth = requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const payload = getPayloadFromRequest(req)!
  const { id } = await params

  // Só o próprio utilizador ou Master pode alterar o avatar
  if (payload.sub !== id && payload.role !== 'Master') {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('avatar') as File | null

  if (!file) {
    return NextResponse.json(
      { error: 'Ficheiro não enviado.' },
      { status: 400 },
    )
  }

  // Validações
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Formato inválido. Use JPG, PNG, WEBP ou GIF.' },
      { status: 400 },
    )
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'Ficheiro demasiado grande. Máximo 2MB.' },
      { status: 400 },
    )
  }

  // Guardar ficheiro
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const filename = `${id}-${Date.now()}.${ext}`
  const uploadsDir = path.join(process.cwd(), 'uploads')

  await mkdir(uploadsDir, { recursive: true })
  await writeFile(
    path.join(uploadsDir, filename),
    Buffer.from(await file.arrayBuffer()),
  )

  // Actualizar URL no utilizador
  const avatarUrl = `/api/uploads/${filename}`

  await prisma.utilizador.update({
    where: { id },
    data: { avatarUrl },
  })

  return NextResponse.json({ avatarUrl })
}
