// app/api/departamentos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/permissions'
import { sendChefeDepartamentoEmail } from '@/lib/mailer'

type Params = { params: Promise<{ id: string }> }

// ── GET /api/departamentos/[id] ───────────────────────────────
export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, ['Master', 'Director', 'ChefeDepartamento'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const departamento = await prisma.departamento.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      dataCriacao: true,
      updatedAt: true,
      direcao: { select: { id: true, nome: true } },
      chefe: {
        select: {
          id: true,
          nomeCompleto: true,
          email: true,
          cargo: true,
          avatarUrl: true,
          role: true,
        },
      },
      utilizadores: {
        select: {
          id: true,
          nomeCompleto: true,
          email: true,
          cargo: true,
          role: true,
          estado: true,
          avatarUrl: true,
        },
      },
      // Pivot M:N — expande até ao critério
      criterios: {
        select: {
          criterio: { select: { id: true, nome: true, peso: true } },
        },
      },
      _count: {
        select: {
          utilizadores: true,
          criterios: true, // conta linhas pivot (= nº de critérios)
        },
      },
    },
  })

  if (!departamento) {
    return NextResponse.json(
      { error: 'Departamento não encontrado.' },
      { status: 404 },
    )
  }

  // Normaliza a resposta: expõe criterios como array plano
  // em vez de [{ criterio: { id, nome, peso } }, ...]
  const response = {
    ...departamento,
    criterios: departamento.criterios.map((c) => c.criterio),
  }

  return NextResponse.json(response)
}

// ── PATCH /api/departamentos/[id] ─────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, ['Master'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const departamento = await prisma.departamento.findUnique({
    where: { id },
    include: { direcao: true },
  })
  if (!departamento) {
    return NextResponse.json(
      { error: 'Departamento não encontrado.' },
      { status: 404 },
    )
  }

  try {
    const { nome, direcaoId, chefeId } = await req.json()

    let direcao = departamento.direcao
    if (direcaoId && direcaoId !== departamento.direcaoId) {
      const novaDirecao = await prisma.direcao.findUnique({
        where: { id: direcaoId },
      })
      if (!novaDirecao) {
        return NextResponse.json(
          { error: 'Direção não encontrada.' },
          { status: 404 },
        )
      }
      direcao = novaDirecao
    }

    const chefeAnteriorId = departamento.chefeId
    const novoChefeId: string | null =
      chefeId !== undefined ? chefeId || null : chefeAnteriorId
    const chefeAlterado = novoChefeId !== chefeAnteriorId

    let novoChefe = null
    if (chefeAlterado && novoChefeId) {
      novoChefe = await prisma.utilizador.findUnique({
        where: { id: novoChefeId },
      })
      if (!novoChefe) {
        return NextResponse.json(
          { error: 'Utilizador indicado como chefe não encontrado.' },
          { status: 404 },
        )
      }
      const jaEChefe = await prisma.departamento.findFirst({
        where: { chefeId: novoChefeId, NOT: { id } },
      })
      if (jaEChefe) {
        return NextResponse.json(
          {
            error: `Este utilizador já é chefe do departamento "${jaEChefe.nome}".`,
          },
          { status: 409 },
        )
      }
    }

    const direcaoFinal = direcaoId ?? departamento.direcaoId

    const updated = await prisma.$transaction(async (tx) => {
      const dept = await tx.departamento.update({
        where: { id },
        data: {
          ...(nome !== undefined && { nome }),
          ...(direcaoId !== undefined && { direcaoId }),
          chefeId: novoChefeId,
        },
        select: {
          id: true,
          nome: true,
          updatedAt: true,
          direcao: { select: { id: true, nome: true } },
          chefe: {
            select: { id: true, nomeCompleto: true, email: true, cargo: true },
          },
        },
      })

      if (chefeAlterado && chefeAnteriorId) {
        await tx.utilizador.update({
          where: { id: chefeAnteriorId },
          data: { role: 'Tecnico', departamentoId: null },
        })
      }

      if (chefeAlterado && novoChefeId) {
        await tx.utilizador.update({
          where: { id: novoChefeId },
          data: {
            role: 'ChefeDepartamento',
            departamentoId: dept.id,
            direcaoId: direcaoFinal,
          },
        })
      }

      if (!chefeAlterado && direcaoId && novoChefeId) {
        await tx.utilizador.update({
          where: { id: novoChefeId },
          data: { direcaoId },
        })
      }

      return dept
    })

    if (chefeAlterado && novoChefe) {
      await sendChefeDepartamentoEmail({
        nome: novoChefe.nomeCompleto,
        email: novoChefe.email,
        departamentoNome: updated.nome,
        direcaoNome: direcao.nome,
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[DEPARTAMENTOS_PATCH]', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 },
    )
  }
}

// ── DELETE /api/departamentos/[id] ────────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, ['Master'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const departamento = await prisma.departamento.findUnique({
    where: { id },
    include: { _count: { select: { utilizadores: true } } },
  })

  if (!departamento) {
    return NextResponse.json(
      { error: 'Departamento não encontrado.' },
      { status: 404 },
    )
  }

  if (departamento._count.utilizadores > 0) {
    return NextResponse.json(
      {
        error: `Não é possível eliminar. O departamento tem ${departamento._count.utilizadores} funcionário(s) associado(s). Transfira-os primeiro.`,
      },
      { status: 400 },
    )
  }

  if (departamento.chefeId) {
    await prisma.utilizador.update({
      where: { id: departamento.chefeId },
      data: { role: 'Tecnico', departamentoId: null },
    })
  }

  // As linhas pivot em criterio_departamento são eliminadas
  // automaticamente pelo onDelete: Cascade definido no schema
  await prisma.departamento.delete({ where: { id } })

  return NextResponse.json({ message: 'Departamento eliminado com sucesso.' })
}
