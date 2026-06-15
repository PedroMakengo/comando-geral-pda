// app/api/submissoes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, getPayloadFromRequest } from '@/lib/permissions'

// ── POST /api/submissoes ──────────────────────────────────────
// Quem pode submeter:
//   ChefeDepartamento → avalia Técnicos do seu departamento
//   Director          → avalia Chefes do departamento da sua Direcção
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ['ChefeDepartamento', 'Director', 'Master'])
  if (auth instanceof NextResponse) return auth

  const payload = getPayloadFromRequest(req)!

  try {
    const { fichaId, comentarios, respostas } = await req.json()

    if (!fichaId || !Array.isArray(respostas) || respostas.length === 0) {
      return NextResponse.json(
        { error: 'fichaId e respostas são obrigatórios.' },
        { status: 400 },
      )
    }

    const ficha = await prisma.fichaAvaliacao.findUnique({
      where: { id: fichaId },
      include: {
        submissao: true,
        avaliado: {
          select: {
            id: true,
            role: true,
            departamentoId: true,
            departamento: {
              select: { id: true, direcaoId: true, chefeId: true },
            },
          },
        },
      },
    })

    if (!ficha) {
      return NextResponse.json(
        { error: 'Ficha não encontrada.' },
        { status: 404 },
      )
    }

    if (ficha.estado !== 'Pendente') {
      return NextResponse.json(
        {
          error: `A ficha deve estar em "Pendente" para ser avaliada. Estado actual: ${ficha.estado}.`,
        },
        { status: 400 },
      )
    }

    if (ficha.submissao) {
      return NextResponse.json(
        { error: 'Esta ficha já tem uma submissão.' },
        { status: 409 },
      )
    }

    const avaliado = ficha.avaliado

    if (payload.role === 'ChefeDepartamento') {
      // Chefe só avalia Técnicos
      if (avaliado.role !== 'Tecnico') {
        return NextResponse.json(
          { error: 'O Chefe de Departamento só pode avaliar Técnicos.' },
          { status: 403 },
        )
      }

      // Buscar o avaliador com as duas formas de associação ao departamento:
      //   1. departamentoId  — o chefe é membro do departamento
      //   2. chefeDe         — o chefe lidera o departamento (relação @unique)
      const avaliador = await prisma.utilizador.findUnique({
        where: { id: payload.sub },
        select: {
          departamentoId: true,
          chefeDe: { select: { id: true } },
        },
      })

      // O departamento do chefe é determinado por chefeDe primeiro,
      // depois por departamentoId como fallback
      const deptDoChefe = avaliador?.chefeDe?.id ?? avaliador?.departamentoId

      if (!deptDoChefe) {
        return NextResponse.json(
          {
            error: 'O seu utilizador não está associado a nenhum departamento.',
          },
          { status: 403 },
        )
      }

      if (deptDoChefe !== avaliado.departamentoId) {
        return NextResponse.json(
          { error: 'Só o chefe do departamento pode avaliar este técnico.' },
          { status: 403 },
        )
      }
    } else if (payload.role === 'Director') {
      // Director só avalia Chefes de Departamento
      if (avaliado.role !== 'ChefeDepartamento') {
        return NextResponse.json(
          { error: 'O Director só pode avaliar Chefes de Departamento.' },
          { status: 403 },
        )
      }
      const avaliador = await prisma.utilizador.findUnique({
        where: { id: payload.sub },
        select: { direcaoId: true },
      })
      if (avaliador?.direcaoId !== avaliado.departamento?.direcaoId) {
        return NextResponse.json(
          { error: 'Só pode avaliar Chefes de departamentos da sua Direcção.' },
          { status: 403 },
        )
      }
    }
    // Master pode avaliar qualquer um

    // ── Calcular pontuação ponderada ─────────────────────────
    const criteriosIds = respostas.map((r: any) => r.criterioId)
    const criterios = await prisma.criterio.findMany({
      where: { id: { in: criteriosIds } },
      select: { id: true, peso: true },
    })

    const pesoMap = Object.fromEntries(criterios.map((c) => [c.id, c.peso]))
    const totalPeso = criterios.reduce((s, c) => s + c.peso, 0)
    const pontuacaoTotal =
      totalPeso > 0
        ? respostas.reduce(
            (s: number, r: any) =>
              s + r.pontuacao * (pesoMap[r.criterioId] ?? 1),
            0,
          ) / totalPeso
        : null

    // ── Criar submissão + actualizar estado da ficha ──────────
    const submissao = await prisma.$transaction(async (tx) => {
      const sub = await tx.submissaoAvaliacao.create({
        data: {
          fichaId,
          avaliadorId: payload.sub,
          comentarios: comentarios?.trim() || null,
          pontuacaoTotal:
            pontuacaoTotal != null
              ? Math.round(pontuacaoTotal * 100) / 100
              : null,
          respostas: {
            create: respostas.map((r: any) => ({
              criterioId: r.criterioId,
              pontuacao: r.pontuacao,
              observacao: r.observacao?.trim() || null,
            })),
          },
        },
        include: {
          avaliador: { select: { id: true, nomeCompleto: true, role: true } },
          respostas: {
            include: {
              criterio: { select: { id: true, nome: true, peso: true } },
            },
          },
        },
      })

      await tx.fichaAvaliacao.update({
        where: { id: fichaId },
        data: { estado: 'AvaliadoPorChefe' },
      })

      return sub
    })

    return NextResponse.json(submissao, { status: 201 })
  } catch (error) {
    console.error('[SUBMISSOES_POST]', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 },
    )
  }
}
