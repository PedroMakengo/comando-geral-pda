import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

type Params = { params: Promise<{ filename: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { filename } = await params

  // Bloqueia path traversal
  const safe = path.basename(filename)
  const filePath = path.join(process.cwd(), 'uploads', safe)

  try {
    const buffer = await readFile(filePath)
    const ext = safe.split('.').pop()?.toLowerCase() ?? 'jpg'
    const mime: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
    }
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mime[ext] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
