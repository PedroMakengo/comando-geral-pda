import {
  PrismaClient,
  Role,
  Estado,
  EstadoAvaliacao,
  TipoAvaliacao,
} from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('\n🌱 Iniciando seed completo do sistema...\n')

  const passwordHash = await bcrypt.hash('Admin@1234', 12)

  // ════════════════════════════════════════════════════════════════════════════
  // 1. PELOUROS
  // ════════════════════════════════════════════════════════════════════════════
  console.log('📌 Criando Pelouros...')

  const pelouros = await Promise.all([
    prisma.pelouro.upsert({
      where: { nome: 'Pelouro Administrativo' },
      update: {},
      create: {
        nome: 'Pelouro Administrativo',
        descricao: 'Gestão administrativa e recursos humanos',
      },
    }),
    prisma.pelouro.upsert({
      where: { nome: 'Pelouro Técnico' },
      update: {},
      create: {
        nome: 'Pelouro Técnico',
        descricao: 'Operações técnicas e infraestrutura',
      },
    }),
    prisma.pelouro.upsert({
      where: { nome: 'Pelouro Financeiro' },
      update: {},
      create: {
        nome: 'Pelouro Financeiro',
        descricao: 'Gestão financeira e contabilidade',
      },
    }),
  ])

  console.log(`✅ ${pelouros.length} pelouros criados`)

  // ════════════════════════════════════════════════════════════════════════════
  // 2. DIREÇÕES
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n📌 Criando Direções...')

  const direcoes = await Promise.all([
    prisma.direcao.upsert({
      where: { nome: 'Direção de Recursos Humanos' },
      update: {},
      create: {
        nome: 'Direção de Recursos Humanos',
        descricao: 'Gestão de pessoas e talentos',
        pelouroId: pelouros[0].id,
      },
    }),
    prisma.direcao.upsert({
      where: { nome: 'Direção de Tecnologia' },
      update: {},
      create: {
        nome: 'Direção de Tecnologia',
        descricao: 'Inovação e infraestrutura tecnológica',
        pelouroId: pelouros[1].id,
      },
    }),
    prisma.direcao.upsert({
      where: { nome: 'Direção Financeira' },
      update: {},
      create: {
        nome: 'Direção Financeira',
        descricao: 'Planejamento e controle financeiro',
        pelouroId: pelouros[2].id,
      },
    }),
  ])

  console.log(`✅ ${direcoes.length} direções criadas`)

  // ════════════════════════════════════════════════════════════════════════════
  // 3. DEPARTAMENTOS
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n📌 Criando Departamentos...')

  const departamentos = await Promise.all([
    prisma.departamento.upsert({
      where: { id: 'recrutamento-selecao' },
      update: {},
      create: {
        id: 'recrutamento-selecao',
        nome: 'Recrutamento e Seleção',
        direcaoId: direcoes[0].id,
      },
    }),
    prisma.departamento.upsert({
      where: { id: 'desenvolvimento-pessoas' },
      update: {},
      create: {
        id: 'desenvolvimento-pessoas',
        nome: 'Desenvolvimento de Pessoas',
        direcaoId: direcoes[0].id,
      },
    }),
    prisma.departamento.upsert({
      where: { id: 'infraestrutura-ti' },
      update: {},
      create: {
        id: 'infraestrutura-ti',
        nome: 'Infraestrutura de TI',
        direcaoId: direcoes[1].id,
      },
    }),
    prisma.departamento.upsert({
      where: { id: 'desenvolvimento-sistemas' },
      update: {},
      create: {
        id: 'desenvolvimento-sistemas',
        nome: 'Desenvolvimento de Sistemas',
        direcaoId: direcoes[1].id,
      },
    }),
    prisma.departamento.upsert({
      where: { id: 'contabilidade' },
      update: {},
      create: {
        id: 'contabilidade',
        nome: 'Contabilidade',
        direcaoId: direcoes[2].id,
      },
    }),
  ])

  console.log(`✅ ${departamentos.length} departamentos criados`)

  // ════════════════════════════════════════════════════════════════════════════
  // 4. UTILIZADORES
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n📌 Criando Utilizadores...')

  const utilizadoresData = [
    // Master
    {
      nomeCompleto: 'Administrador Master',
      email: 'master@empresa.ao',
      numeroMecanografico: 'MEC-0001',
      cargo: 'Administrador do Sistema',
      role: Role.Master,
      pelouroId: null,
      direcaoId: null,
      departamentoId: null,
    },
    // Directores
    {
      nomeCompleto: 'António Ferreira',
      email: 'director@empresa.ao',
      numeroMecanografico: 'MEC-0002',
      cargo: 'Director de RH',
      role: Role.Director,
      pelouroId: pelouros[0].id,
      direcaoId: direcoes[0].id,
      departamentoId: null,
    },
    {
      nomeCompleto: 'Helena Santos',
      email: 'director.ti@empresa.ao',
      numeroMecanografico: 'MEC-0006',
      cargo: 'Directora de Tecnologia',
      role: Role.Director,
      pelouroId: pelouros[1].id,
      direcaoId: direcoes[1].id,
      departamentoId: null,
    },
    {
      nomeCompleto: 'Ricardo Mendes',
      email: 'director.financeiro@empresa.ao',
      numeroMecanografico: 'MEC-0007',
      cargo: 'Director Financeiro',
      role: Role.Director,
      pelouroId: pelouros[2].id,
      direcaoId: direcoes[2].id,
      departamentoId: null,
    },
    // Chefes de Departamento
    {
      nomeCompleto: 'Maria da Conceição',
      email: 'chefe@empresa.ao',
      numeroMecanografico: 'MEC-0003',
      cargo: 'Chefe de Recrutamento',
      role: Role.ChefeDepartamento,
      pelouroId: pelouros[0].id,
      direcaoId: direcoes[0].id,
      departamentoId: departamentos[0].id,
    },
    {
      nomeCompleto: 'Paulo Roberto',
      email: 'chefe.ti@empresa.ao',
      numeroMecanografico: 'MEC-0008',
      cargo: 'Chefe de Infraestrutura',
      role: Role.ChefeDepartamento,
      pelouroId: pelouros[1].id,
      direcaoId: direcoes[1].id,
      departamentoId: departamentos[2].id,
    },
    {
      nomeCompleto: 'Carla Souza',
      email: 'chefe.contabilidade@empresa.ao',
      numeroMecanografico: 'MEC-0009',
      cargo: 'Chefe de Contabilidade',
      role: Role.ChefeDepartamento,
      pelouroId: pelouros[2].id,
      direcaoId: direcoes[2].id,
      departamentoId: departamentos[4].id,
    },
    // Técnicos
    {
      nomeCompleto: 'Carlos Manuel Domingos',
      email: 'tecnico1@empresa.ao',
      numeroMecanografico: 'MEC-0004',
      cargo: 'Técnico de RH',
      role: Role.Tecnico,
      pelouroId: pelouros[0].id,
      direcaoId: direcoes[0].id,
      departamentoId: departamentos[0].id,
    },
    {
      nomeCompleto: 'Ana Beatriz Lopes',
      email: 'tecnico2@empresa.ao',
      numeroMecanografico: 'MEC-0005',
      cargo: 'Técnica de TI',
      role: Role.Tecnico,
      pelouroId: pelouros[1].id,
      direcaoId: direcoes[1].id,
      departamentoId: departamentos[2].id,
    },
    {
      nomeCompleto: 'José Eduardo',
      email: 'tecnico3@empresa.ao',
      numeroMecanografico: 'MEC-0010',
      cargo: 'Desenvolvedor',
      role: Role.Tecnico,
      pelouroId: pelouros[1].id,
      direcaoId: direcoes[1].id,
      departamentoId: departamentos[3].id,
    },
    {
      nomeCompleto: 'Marta Silva',
      email: 'tecnico4@empresa.ao',
      numeroMecanografico: 'MEC-0011',
      cargo: 'Analista Contábil',
      role: Role.Tecnico,
      pelouroId: pelouros[2].id,
      direcaoId: direcoes[2].id,
      departamentoId: departamentos[4].id,
    },
  ]

  const utilizadores = []
  for (const data of utilizadoresData) {
    const user = await prisma.utilizador.upsert({
      where: { email: data.email },
      update: {},
      create: {
        ...data,
        passwordHash,
        avatarUrl: '',
        estado: Estado.Activo,
      },
    })
    utilizadores.push(user)
  }

  // Atualizar chefes de departamento
  await prisma.departamento.update({
    where: { id: departamentos[0].id },
    data: {
      chefeId: utilizadores.find((u) => u.email === 'chefe@empresa.ao')?.id,
    },
  })

  await prisma.departamento.update({
    where: { id: departamentos[2].id },
    data: {
      chefeId: utilizadores.find((u) => u.email === 'chefe.ti@empresa.ao')?.id,
    },
  })

  await prisma.departamento.update({
    where: { id: departamentos[4].id },
    data: {
      chefeId: utilizadores.find(
        (u) => u.email === 'chefe.contabilidade@empresa.ao',
      )?.id,
    },
  })

  console.log(`✅ ${utilizadores.length} utilizadores criados`)

  // ════════════════════════════════════════════════════════════════════════════
  // 5. CRITÉRIOS DE AVALIAÇÃO
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n📌 Criando Critérios de Avaliação...')

  const criteriosGerais = [
    {
      nome: 'Assiduidade',
      descricao: 'Presença e pontualidade no trabalho',
      peso: 1.0,
    },
    {
      nome: 'Produtividade',
      descricao: 'Capacidade de entregar resultados',
      peso: 1.5,
    },
    {
      nome: 'Trabalho em Equipe',
      descricao: 'Colaboração com colegas',
      peso: 1.0,
    },
    {
      nome: 'Iniciativa',
      descricao: 'Proatividade e soluções criativas',
      peso: 1.0,
    },
    {
      nome: 'Qualidade do Trabalho',
      descricao: 'Atenção aos detalhes e excelência',
      peso: 1.5,
    },
  ]

  const criterios = []
  for (const criterio of criteriosGerais) {
    const created = await prisma.criterio.upsert({
      where: {
        id: `criterio-${criterio.nome.toLowerCase().replace(/ /g, '-')}`,
      },
      update: {},
      create: {
        id: `criterio-${criterio.nome.toLowerCase().replace(/ /g, '-')}`,
        ...criterio,
      },
    })
    criterios.push(created)
  }

  // Associar critérios aos departamentos
  for (const dept of departamentos) {
    for (const criterio of criterios) {
      await prisma.criterioDepartamento.upsert({
        where: {
          criterioId_departamentoId: {
            criterioId: criterio.id,
            departamentoId: dept.id,
          },
        },
        update: {},
        create: {
          criterioId: criterio.id,
          departamentoId: dept.id,
        },
      })
    }
  }

  console.log(`✅ ${criterios.length} critérios criados e associados`)

  // ════════════════════════════════════════════════════════════════════════════
  // 6. PERÍODOS DE AVALIAÇÃO
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n📌 Criando Períodos de Avaliação...')

  const agora = new Date()
  const periodoAtual = await prisma.periodoAvaliacao.upsert({
    where: { id: 'periodo-2025-1' },
    update: {},
    create: {
      id: 'periodo-2025-1',
      nome: 'Avaliação 1º Semestre 2025',
      dataInicio: new Date(agora.getFullYear(), agora.getMonth(), 1),
      dataFim: new Date(agora.getFullYear(), agora.getMonth() + 2, 0),
      activo: true,
    },
  })

  const periodoAnterior = await prisma.periodoAvaliacao.upsert({
    where: { id: 'periodo-2024-2' },
    update: {},
    create: {
      id: 'periodo-2024-2',
      nome: 'Avaliação 2º Semestre 2024',
      dataInicio: new Date(agora.getFullYear() - 1, 6, 1),
      dataFim: new Date(agora.getFullYear() - 1, 11, 31),
      activo: false,
    },
  })

  console.log(`✅ Períodos de avaliação criados`)

  // ════════════════════════════════════════════════════════════════════════════
  // 7. FICHAS DE AVALIAÇÃO E SUBMISSÕES
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n📌 Criando Fichas de Avaliação e Submissões...')

  const tecnicos = utilizadores.filter((u) => u.role === Role.Tecnico)
  const chefeRh = utilizadores.find((u) => u.email === 'chefe@empresa.ao')
  const chefeTi = utilizadores.find((u) => u.email === 'chefe.ti@empresa.ao')
  const chefeCont = utilizadores.find(
    (u) => u.email === 'chefe.contabilidade@empresa.ao',
  )
  const directorRh = utilizadores.find((u) => u.email === 'director@empresa.ao')

  for (const tecnico of tecnicos) {
    // Definir chefe baseado no departamento do técnico
    let chefe = chefeRh
    if (
      tecnico.departamentoId === departamentos[2].id ||
      tecnico.departamentoId === departamentos[3].id
    ) {
      chefe = chefeTi
    } else if (tecnico.departamentoId === departamentos[4].id) {
      chefe = chefeCont
    }

    // Criar ficha de avaliação
    const ficha = await prisma.fichaAvaliacao.upsert({
      where: {
        avaliadoId_periodoId: {
          avaliadoId: tecnico.id,
          periodoId: periodoAtual.id,
        },
      },
      update: {},
      create: {
        avaliadoId: tecnico.id,
        periodoId: periodoAtual.id,
        estado: EstadoAvaliacao.AutoAvaliacao,
      },
    })

    // Autoavaliação do técnico
    const autoavaliacao = await prisma.submissaoAvaliacao.create({
      data: {
        tipo: TipoAvaliacao.AutoAvaliacao,
        comentarios:
          'Realizei minhas atividades com dedicação e busquei melhorar continuamente.',
        fichaId: ficha.id,
        avaliadorId: tecnico.id,
      },
    })

    // Adicionar respostas para a autoavaliação
    for (const criterio of criterios) {
      const pontuacao = Math.floor(Math.random() * (5 - 3 + 1) + 3) // 3-5
      await prisma.criterioResposta.create({
        data: {
          pontuacao: pontuacao,
          observacao: `Autoavaliação - ${criterio.nome}: Atendimento satisfatório.`,
          submissaoId: autoavaliacao.id,
          criterioId: criterio.id,
        },
      })
    }

    // Atualizar pontuação total da autoavaliação
    const somaPesos = criterios.reduce((sum, c) => sum + c.peso, 0)
    const totalAuto = criterios.reduce((sum, c) => sum + 4 * c.peso, 0) // Média 4
    await prisma.submissaoAvaliacao.update({
      where: { id: autoavaliacao.id },
      data: { pontuacaoTotal: totalAuto / somaPesos },
    })

    // Avaliação do chefe
    if (chefe) {
      const avaliacaoChefe = await prisma.submissaoAvaliacao.create({
        data: {
          tipo: TipoAvaliacao.AvaliacaoChefe,
          comentarios:
            'Funcionário dedicado e com bom desempenho. Apresenta potencial de crescimento.',
          fichaId: ficha.id,
          avaliadorId: chefe.id,
        },
      })

      for (const criterio of criterios) {
        const pontuacao = Math.floor(Math.random() * (5 - 3 + 1) + 3) // 3-5
        await prisma.criterioResposta.create({
          data: {
            pontuacao: pontuacao,
            observacao: `Avaliação do chefe - ${criterio.nome}: Bom desempenho.`,
            submissaoId: avaliacaoChefe.id,
            criterioId: criterio.id,
          },
        })
      }

      const totalChefe = criterios.reduce((sum, c) => sum + 4 * c.peso, 0)
      await prisma.submissaoAvaliacao.update({
        where: { id: avaliacaoChefe.id },
        data: { pontuacaoTotal: totalChefe / somaPesos },
      })

      // Atualizar estado da ficha
      await prisma.fichaAvaliacao.update({
        where: { id: ficha.id },
        data: { estado: EstadoAvaliacao.AvaliadoPorChefe },
      })

      // Para alguns técnicos, criar reavaliação
      if (tecnico.numeroMecanografico === 'MEC-0004' && directorRh) {
        const fichaAtualizada = await prisma.fichaAvaliacao.update({
          where: { id: ficha.id },
          data: { estado: EstadoAvaliacao.EmReavaliacao },
        })

        await prisma.reavaliacaoIndicada.create({
          data: {
            motivacao:
              'Necessidade de reavaliação devido a melhorias identificadas no desempenho.',
            fichaId: fichaAtualizada.id,
            reavaliadorId: chefe.id,
            indicadoPorId: directorRh.id,
          },
        })
      }

      // Validação do diretor
      if (directorRh && tecnico.departamentoId === departamentos[0].id) {
        await prisma.validacaoDirector.create({
          data: {
            aprovado: true,
            comentarios: 'Avaliação aprovada. Parabéns pelo desempenho!',
            fichaId: ficha.id,
            directorId: directorRh.id,
          },
        })

        await prisma.fichaAvaliacao.update({
          where: { id: ficha.id },
          data: { estado: EstadoAvaliacao.ValidadoPorDirector },
        })
      }
    }
  }

  console.log(`✅ Fichas, avaliações e validações criadas`)

  // ════════════════════════════════════════════════════════════════════════════
  // 8. RESUMO FINAL
  // ════════════════════════════════════════════════════════════════════════════
  console.log(
    '\n════════════════════════════════════════════════════════════════════',
  )
  console.log('🎉 SEED COMPLETO FINALIZADO COM SUCESSO!')
  console.log(
    '════════════════════════════════════════════════════════════════════\n',
  )

  console.log('📊 RESUMO DO QUE FOI CRIADO:')
  console.log(`   • ${pelouros.length} Pelouros`)
  console.log(`   • ${direcoes.length} Direções`)
  console.log(`   • ${departamentos.length} Departamentos`)
  console.log(
    `   • ${utilizadores.length} Utilizadores (Master, Diretores, Chefes, Técnicos)`,
  )
  console.log(`   • ${criterios.length} Critérios de Avaliação`)
  console.log(`   • 2 Períodos de Avaliação (1 atual, 1 anterior)`)
  console.log(`   • ${tecnicos.length} Fichas de Avaliação criadas`)
  console.log(
    `   • Autoavaliações e avaliações dos chefes para todos os técnicos`,
  )
  console.log(
    `   • Reavaliação para o técnico ${tecnicos.find((t) => t.numeroMecanografico === 'MEC-0004')?.nomeCompleto}`,
  )
  console.log(`   • Validação do diretor para técnicos de RH\n`)

  console.log('🔑 CREDENCIAIS DE ACESSO:')
  console.log('   Todos os utilizadores → Senha: Admin@1234\n')
  console.log('   Master:')
  console.log('     📧 master@empresa.ao')
  console.log('   Diretores:')
  console.log('     📧 director@empresa.ao (RH)')
  console.log('     📧 director.ti@empresa.ao')
  console.log('     📧 director.financeiro@empresa.ao')
  console.log('   Chefes:')
  console.log('     📧 chefe@empresa.ao (RH)')
  console.log('     📧 chefe.ti@empresa.ao')
  console.log('     📧 chefe.contabilidade@empresa.ao')
  console.log('   Técnicos:')
  console.log('     📧 tecnico1@empresa.ao (RH)')
  console.log('     📧 tecnico2@empresa.ao (TI)')
  console.log('     📧 tecnico3@empresa.ao (Dev)')
  console.log('     📧 tecnico4@empresa.ao (Contabilidade)\n')

  console.log('📋 FLUXOS COMPLETOS DISPONÍVEIS PARA TESTE:')
  console.log('   1. ✅ Autoavaliação de técnicos')
  console.log('   2. ✅ Avaliação de chefes')
  console.log('   3. ✅ Reavaliação (técnico Carlos Manuel)')
  console.log('   4. ✅ Validação de diretores')
  console.log(
    '   5. ✅ Estrutura organizacional completa (Pelouro → Direção → Departamento)',
  )
  console.log('   6. ✅ Critérios associados a departamentos')
  console.log(
    '════════════════════════════════════════════════════════════════════\n',
  )
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
