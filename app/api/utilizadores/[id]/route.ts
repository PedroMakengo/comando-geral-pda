// app/api/utilizadores/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { requireRole } from '@/lib/permissions'
import { sendPasswordResetEmail } from '@/lib/mailer'

type Params = { params: Promise<{ id: string }> }

// ── GET /api/utilizadores/[id] ────────────────────────────────
export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, ['Master', 'Director', 'ChefeDepartamento'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const utilizador = await prisma.utilizador.findUnique({
    where: { id },
    select: {
      id: true,
      nomeCompleto: true,
      email: true,
      numeroMecanografico: true,
      cargo: true,
      avatarUrl: true,
      role: true,
      estado: true,
      dataAdmissao: true,
      createdAt: true,
      updatedAt: true,
      pelouro: { select: { id: true, nome: true } },
      direcao: { select: { id: true, nome: true } },
      departamento: { select: { id: true, nome: true } },
    },
  })

  if (!utilizador) {
    return NextResponse.json(
      { error: 'Utilizador não encontrado.' },
      { status: 404 },
    )
  }

  return NextResponse.json(utilizador)
}

// ── PATCH /api/utilizadores/[id] ──────────────────────────────
// Suporta actualizações parciais:
//   - dados gerais (nomeCompleto, cargo, role, pelouroId, direcaoId, departamentoId)
//   - estado (Activo / Inactivo)
//   - reset de senha (action: 'reset-password')
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, ['Master'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const utilizador = await prisma.utilizador.findUnique({ where: { id } })
  if (!utilizador) {
    return NextResponse.json(
      { error: 'Utilizador não encontrado.' },
      { status: 404 },
    )
  }

  try {
    const body = await req.json()
    const { action } = body

    // ── Reset de senha ────────────────────────────────────────
    if (action === 'reset-password') {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!'
      const novaSenha = Array.from(
        { length: 8 },
        () => chars[Math.floor(Math.random() * chars.length)],
      ).join('')

      await prisma.utilizador.update({
        where: { id },
        data: { passwordHash: await hashPassword(novaSenha) },
      })

      await sendPasswordResetEmail({
        nome: utilizador.nomeCompleto,
        email: utilizador.email,
        novaSenha,
      })

      return NextResponse.json({
        message: 'Senha redefinida e enviada por email.',
      })
    }

    // ── Activar / Desactivar ──────────────────────────────────
    if (action === 'toggle-estado') {
      const novoEstado = utilizador.estado === 'Activo' ? 'Inactivo' : 'Activo'
      const updated = await prisma.utilizador.update({
        where: { id },
        data: { estado: novoEstado },
        select: { id: true, estado: true },
      })
      return NextResponse.json(updated)
    }

    // ── Actualização geral ────────────────────────────────────
    const {
      nomeCompleto,
      cargo,
      role,
      estado,
      pelouroId,
      direcaoId,
      departamentoId,
    } = body

    // Verificar email/mecanográfico duplicado se forem alterados
    if (body.email && body.email !== utilizador.email) {
      const existe = await prisma.utilizador.findUnique({
        where: { email: body.email },
      })
      if (existe) {
        return NextResponse.json(
          { error: 'Este email já está em uso.' },
          { status: 409 },
        )
      }
    }

    if (
      body.numeroMecanografico &&
      body.numeroMecanografico !== utilizador.numeroMecanografico
    ) {
      const existe = await prisma.utilizador.findUnique({
        where: { numeroMecanografico: body.numeroMecanografico },
      })
      if (existe) {
        return NextResponse.json(
          { error: 'Este número mecanográfico já está em uso.' },
          { status: 409 },
        )
      }
    }

    const updated = await prisma.utilizador.update({
      where: { id },
      data: {
        ...(nomeCompleto !== undefined && { nomeCompleto }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.numeroMecanografico !== undefined && {
          numeroMecanografico: body.numeroMecanografico,
        }),
        ...(cargo !== undefined && { cargo }),
        ...(role !== undefined && { role }),
        ...(estado !== undefined && { estado }),
        ...(pelouroId !== undefined && { pelouroId: pelouroId || null }),
        ...(direcaoId !== undefined && { direcaoId: direcaoId || null }),
        ...(departamentoId !== undefined && {
          departamentoId: departamentoId || null,
        }),
      },
      select: {
        id: true,
        nomeCompleto: true,
        email: true,
        numeroMecanografico: true,
        cargo: true,
        role: true,
        estado: true,
        updatedAt: true,
        pelouro: { select: { id: true, nome: true } },
        direcao: { select: { id: true, nome: true } },
        departamento: { select: { id: true, nome: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[UTILIZADORES_PATCH]', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 },
    )
  }
}

// ── DELETE /api/utilizadores/[id] ─────────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, ['Master'])
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const utilizador = await prisma.utilizador.findUnique({ where: { id } })
  if (!utilizador) {
    return NextResponse.json(
      { error: 'Utilizador não encontrado.' },
      { status: 404 },
    )
  }

  // Protege contra auto-eliminação
  const { payload } = auth as { payload: { sub: string } }
  if (payload.sub === id) {
    return NextResponse.json(
      { error: 'Não pode eliminar a sua própria conta.' },
      { status: 400 },
    )
  }

  await prisma.utilizador.delete({ where: { id } })

  return NextResponse.json({ message: 'Utilizador eliminado com sucesso.' })
}
