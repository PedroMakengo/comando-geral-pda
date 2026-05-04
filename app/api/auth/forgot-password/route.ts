import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { login } = await req.json()

    if (!login) {
      return NextResponse.json(
        { error: 'Email ou número mecanográfico obrigatório.' },
        { status: 400 },
      )
    }

    // Verifica se o utilizador existe sem revelar se existe ou não (segurança)
    await prisma.utilizador.findFirst({
      where: {
        OR: [{ email: login }, { numeroMecanografico: login }],
      },
    })

    // Resposta genérica — recuperação é feita pela equipa de TI/RH
    return NextResponse.json({
      message:
        'Se a conta existir, foi registado o pedido. Contacte a equipa de TI ou RH para redefinir a sua senha.',
    })
  } catch (error) {
    console.error('[FORGOT_PASSWORD]', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 },
    )
  }
}
