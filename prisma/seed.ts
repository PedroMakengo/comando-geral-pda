// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 A iniciar seed...')

  // ── Limpar dados existentes ───────────────────────────────
  await prisma.validacaoDirector.deleteMany()
  await prisma.criterioResposta.deleteMany()
  await prisma.submissaoAvaliacao.deleteMany()
  await prisma.fichaAvaliacao.deleteMany()
  await prisma.criterio.deleteMany()
  await prisma.periodoAvaliacao.deleteMany()
  await prisma.utilizador.deleteMany()
  await prisma.departamento.deleteMany()
  await prisma.direcao.deleteMany()
  await prisma.pelouro.deleteMany()

  console.log('✓ Dados anteriores limpos')

  // ── Passwords ─────────────────────────────────────────────
  const hash = (p: string) => bcrypt.hashSync(p, 12)

  // ── Estrutura organizacional ──────────────────────────────
  const pelouro = await prisma.pelouro.create({
    data: { nome: 'Pelouro das Finanças e Administração' },
  })

  const direcao = await prisma.direcao.create({
    data: { nome: 'Direcção de Recursos Humanos', pelouroId: pelouro.id },
  })

  const departamento = await prisma.departamento.create({
    data: {
      nome: 'Departamento de Formação',
      direcaoId: direcao.id,
    },
  })

  console.log('✓ Estrutura organizacional criada')

  // ── 1 Master ──────────────────────────────────────────────
  const master = await prisma.utilizador.create({
    data: {
      nomeCompleto: 'Administrador do Sistema',
      email: 'master@adapec.ao',
      passwordHash: hash('Master@2025'),
      numeroMecanografico: 'MEC-0000',
      cargo: 'Administrador',
      role: 'Master',
      estado: 'Activo',
      avatarUrl: '',
    },
  })

  // ── 1 Director ────────────────────────────────────────────
  const director = await prisma.utilizador.create({
    data: {
      nomeCompleto: 'António Manuel Sebastião',
      email: 'director@adapec.ao',
      passwordHash: hash('Director@2025'),
      numeroMecanografico: 'MEC-0001',
      cargo: 'Director de Recursos Humanos',
      role: 'Director',
      estado: 'Activo',
      avatarUrl: '',
      direcaoId: direcao.id,
    },
  })

  // ── 1 Chefe de Departamento ───────────────────────────────
  const chefe = await prisma.utilizador.create({
    data: {
      nomeCompleto: 'Maria da Conceição Ferreira',
      email: 'chefe@adapec.ao',
      passwordHash: hash('Chefe@2025'),
      numeroMecanografico: 'MEC-0002',
      cargo: 'Chefe do Departamento de Formação',
      role: 'ChefeDepartamento',
      estado: 'Activo',
      avatarUrl: '',
      direcaoId: direcao.id,
      departamentoId: departamento.id,
    },
  })

  // Associar chefe ao departamento
  await prisma.departamento.update({
    where: { id: departamento.id },
    data: { chefeId: chefe.id },
  })

  // ── 3 Técnicos ────────────────────────────────────────────
  const tecnicosData = [
    {
      nomeCompleto: 'Carlos Alberto Lopes',
      email: 'carlos.lopes@adapec.ao',
      numeroMecanografico: 'MEC-0003',
      cargo: 'Técnico de Formação',
    },
    {
      nomeCompleto: 'Filomena Rosa Domingos',
      email: 'filomena.domingos@adapec.ao',
      numeroMecanografico: 'MEC-0004',
      cargo: 'Técnica de Recursos Humanos',
    },
    {
      nomeCompleto: 'Joaquim Paulo Teixeira',
      email: 'joaquim.teixeira@adapec.ao',
      numeroMecanografico: 'MEC-0005',
      cargo: 'Técnico Administrativo',
    },
  ]

  const tecnicos: Awaited<ReturnType<typeof prisma.utilizador.create>>[] = []
  for (const t of tecnicosData) {
    const tecnico = await prisma.utilizador.create({
      data: {
        ...t,
        passwordHash: hash('Tecnico@2025'),
        role: 'Tecnico',
        estado: 'Activo',
        avatarUrl: '',
        direcaoId: direcao.id,
        departamentoId: departamento.id,
      },
    })
    tecnicos.push(tecnico)
  }

  console.log(
    '✓ Utilizadores criados: 1 Master, 1 Director, 1 Chefe, 3 Técnicos',
  )

  // ── Critérios de avaliação ────────────────────────────────
  const criteriosData: { nome: string; peso: number; descricao: string }[] = [
    {
      nome: 'Qualidade do Trabalho',
      peso: 3,
      descricao: 'Precisão, rigor e qualidade dos resultados produzidos.',
    },
    {
      nome: 'Cumprimento de Prazos',
      peso: 2,
      descricao:
        'Capacidade de entregar tarefas dentro dos prazos estabelecidos.',
    },
    {
      nome: 'Trabalho em Equipa',
      peso: 2,
      descricao: 'Colaboração, comunicação e espírito de equipa.',
    },
    {
      nome: 'Iniciativa e Proactividade',
      peso: 2,
      descricao: 'Capacidade de agir sem necessidade de supervisão constante.',
    },
    {
      nome: 'Assiduidade e Pontualidade',
      peso: 1,
      descricao: 'Presença regular e cumprimento dos horários.',
    },
  ]

  const criterios: Awaited<ReturnType<typeof prisma.criterio.create>>[] = []
  for (const c of criteriosData) {
    const criterio = await prisma.criterio.create({
      data: {
        nome: c.nome,
        peso: c.peso,
        descricao: c.descricao,
        departamentos: {
          create: [{ departamentoId: departamento.id }],
        },
      },
    })
    criterios.push(criterio)
  }

  console.log(`✓ ${criterios.length} critérios criados`)

  // ── Período de avaliação activo ───────────────────────────
  const periodo = await prisma.periodoAvaliacao.create({
    data: {
      nome: 'Avaliação de Desempenho 2025',
      dataInicio: new Date('2025-01-01'),
      dataFim: new Date('2025-12-31'),
      activo: true,
    },
  })

  console.log('✓ Período de avaliação criado')

  // ── Fichas para os 3 técnicos ─────────────────────────────
  // Técnico 0: ValidadoPorDirector (com avaliação completa)
  // Técnico 1: AvaliadoPorChefe (aguarda validação)
  // Técnico 2: Pendente

  // Técnico 0 — ficha completa e validada
  const ficha0 = await prisma.fichaAvaliacao.create({
    data: {
      avaliadoId: tecnicos[0].id,
      periodoId: periodo.id,
      estado: 'ValidadoPorDirector',
    },
  })

  const respostas0 = criterios.map((c, i) => ({
    criterioId: c.id,
    pontuacao: [5, 4, 4, 3, 5][i] ?? 4,
  }))
  const pontuacao0 =
    respostas0.reduce((sum, r) => {
      const peso =
        criteriosData[criterios.findIndex((c) => c.id === r.criterioId)]
          ?.peso ?? 1
      return sum + r.pontuacao * peso
    }, 0) / criteriosData.reduce((s, c) => s + c.peso, 0)

  const submissao0 = await prisma.submissaoAvaliacao.create({
    data: {
      fichaId: ficha0.id,
      avaliadorId: chefe.id,
      pontuacaoTotal: Math.round(pontuacao0 * 100) / 100,
      comentarios: 'Excelente desempenho. Técnico muito dedicado e proactivo.',
      respostas: {
        create: respostas0.map((r) => ({
          criterioId: r.criterioId,
          pontuacao: r.pontuacao,
        })),
      },
    },
  })

  await prisma.validacaoDirector.create({
    data: {
      fichaId: ficha0.id,
      directorId: director.id,
      aprovado: true,
      comentarios: 'Avaliação validada. Excelente trabalho.',
    },
  })

  await prisma.fichaAvaliacao.update({
    where: { id: ficha0.id },
    data: { pontuacaoFinal: submissao0.pontuacaoTotal },
  })

  // Técnico 1 — avaliado pelo chefe, aguarda director
  const ficha1 = await prisma.fichaAvaliacao.create({
    data: {
      avaliadoId: tecnicos[1].id,
      periodoId: periodo.id,
      estado: 'AvaliadoPorChefe',
    },
  })

  const respostas1 = criterios.map((c, i) => ({
    criterioId: c.id,
    pontuacao: [3, 3, 4, 3, 4][i] ?? 3,
  }))
  const pontuacao1 =
    respostas1.reduce((sum, r) => {
      const peso =
        criteriosData[criterios.findIndex((c) => c.id === r.criterioId)]
          ?.peso ?? 1
      return sum + r.pontuacao * peso
    }, 0) / criteriosData.reduce((s, c) => s + c.peso, 0)

  await prisma.submissaoAvaliacao.create({
    data: {
      fichaId: ficha1.id,
      avaliadorId: chefe.id,
      pontuacaoTotal: Math.round(pontuacao1 * 100) / 100,
      comentarios: 'Desempenho satisfatório. Pode melhorar na proactividade.',
      respostas: {
        create: respostas1.map((r) => ({
          criterioId: r.criterioId,
          pontuacao: r.pontuacao,
        })),
      },
    },
  })

  // Técnico 2 — pendente (sem avaliação ainda)
  await prisma.fichaAvaliacao.create({
    data: {
      avaliadoId: tecnicos[2].id,
      periodoId: periodo.id,
      estado: 'Pendente',
    },
  })

  console.log('✓ Fichas de avaliação criadas')
  console.log('')
  console.log('═══════════════════════════════════════════')
  console.log('  Seed concluído com sucesso!')
  console.log('═══════════════════════════════════════════')
  console.log('')
  console.log('  Credenciais de acesso:')
  console.log(`  Master   → master@adapec.ao       / Master@2025`)
  console.log(`  Director → director@adapec.ao     / Director@2025`)
  console.log(`  Chefe    → chefe@adapec.ao         / Chefe@2025`)
  console.log(`  Técnicos → carlos.lopes@adapec.ao  / Tecnico@2025`)
  console.log(`             filomena.domingos@...   / Tecnico@2025`)
  console.log(`             joaquim.teixeira@...    / Tecnico@2025`)
  console.log('═══════════════════════════════════════════')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
