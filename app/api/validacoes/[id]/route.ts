// app/api/validacoes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/permissions'

type Params = { params: Promise<{ id: string }> }

// ── GET /api/validacoes/[id] ──────────────────────────────────
export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, ['Master', 'Director'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const validacao = await prisma.validacaoDirector.findUnique({
    where: { id },
    select: {
      id: true,
      aprovado: true,
      comentarios: true,
      dataValidacao: true,
      director: { select: { id: true, nomeCompleto: true } },
      ficha: {
        select: {
          id: true,
          estado: true,
          pontuacaoFinal: true,
          avaliado: {
            select: {
              id: true,
              nomeCompleto: true,
              cargo: true,
              departamento: { select: { id: true, nome: true } },
            },
          },
          periodo: { select: { id: true, nome: true } },
          // submissao singular
          submissao: {
            select: {
              pontuacaoTotal: true,
              dataSubmissao: true,
              avaliador: { select: { id: true, nomeCompleto: true } },
            },
          },
        },
      },
    },
  })

  if (!validacao) {
    return NextResponse.json(
      { error: 'Validação não encontrada.' },
      { status: 404 },
    )
  }

  return NextResponse.json(validacao)
}

// ── DELETE /api/validacoes/[id] ───────────────────────────────
// Apenas Master — reverte uma validação incorrecta.
// A ficha volta a AvaliadoPorChefe para o Director validar novamente.
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, ['Master'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const validacao = await prisma.validacaoDirector.findUnique({ where: { id } })
  if (!validacao) {
    return NextResponse.json(
      { error: 'Validação não encontrada.' },
      { status: 404 },
    )
  }

  await prisma.$transaction(async (tx) => {
    await tx.validacaoDirector.delete({ where: { id } })

    // Reverter ficha para AvaliadoPorChefe — submissão ainda existe
    await tx.fichaAvaliacao.update({
      where: { id: validacao.fichaId },
      data: { estado: 'AvaliadoPorChefe', pontuacaoFinal: null },
    })
  })

  return NextResponse.json({ message: 'Validação revertida com sucesso.' })
}
