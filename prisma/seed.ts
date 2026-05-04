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
  console.log('\n🗑️  LIMPANDO BASE DE DADOS...\n')

  // ════════════════════════════════════════════════════════════════════════════
  // 1. LIMPAR DADOS EXISTENTES (ORDEM CORRETA PARA EVITAR CONSTRAINTS)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('📌 Removendo dados existentes...')

  // Remover respostas de critérios
  await prisma.criterioResposta.deleteMany()
  console.log('   ✓ Respostas de critérios removidas')

  // Remover reavaliações indicadas
  await prisma.reavaliacaoIndicada.deleteMany()
  console.log('   ✓ Reavaliações indicadas removidas')

  // Remover validações de diretor
  await prisma.validacaoDirector.deleteMany()
  console.log('   ✓ Validações de diretor removidas')

  // Remover submissões de avaliação
  await prisma.submissaoAvaliacao.deleteMany()
  console.log('   ✓ Submissões de avaliação removidas')

  // Remover fichas de avaliação
  await prisma.fichaAvaliacao.deleteMany()
  console.log('   ✓ Fichas de avaliação removidas')

  // Remover períodos de avaliação
  await prisma.periodoAvaliacao.deleteMany()
  console.log('   ✓ Períodos de avaliação removidos')

  // Remover associações critério-departamento
  await prisma.criterioDepartamento.deleteMany()
  console.log('   ✓ Associações critério-departamento removidas')

  // Remover critérios
  await prisma.criterio.deleteMany()
  console.log('   ✓ Critérios removidos')

  // Remover chefes dos departamentos
  await prisma.departamento.updateMany({
    data: { chefeId: null },
  })
  console.log('   ✓ Referências de chefes removidas')

  // Remover departamentos
  await prisma.departamento.deleteMany()
  console.log('   ✓ Departamentos removidos')

  // Remover direções
  await prisma.direcao.deleteMany()
  console.log('   ✓ Direções removidas')

  // Remover pelouros
  await prisma.pelouro.deleteMany()
  console.log('   ✓ Pelouros removidos')

  // Remover TODOS os utilizadores (incluindo qualquer Master existente)
  await prisma.utilizador.deleteMany()
  console.log('   ✓ TODOS os utilizadores removidos')

  console.log('\n✅ Base de dados completamente limpa!\n')

  // ════════════════════════════════════════════════════════════════════════════
  // 2. CRIAR APENAS O USUÁRIO MASTER
  // ════════════════════════════════════════════════════════════════════════════
  console.log('📌 Criando usuário Master...\n')

  const passwordHash = await bcrypt.hash('Admin@1234', 12)

  const masterUser = await prisma.utilizador.create({
    data: {
      nomeCompleto: 'Administrador Master',
      email: 'master@empresa.ao',
      numeroMecanografico: 'MEC-0001',
      cargo: 'Administrador do Sistema',
      role: Role.Master,
      passwordHash: passwordHash,
      avatarUrl: '',
      estado: Estado.Activo,
      pelouroId: null,
      direcaoId: null,
      departamentoId: null,
    },
  })

  console.log(`✅ Usuário Master criado com sucesso!`)
  console.log(`   ID: ${masterUser.id}`)
  console.log(`   Nome: ${masterUser.nomeCompleto}`)
  console.log(`   Email: ${masterUser.email}`)
  console.log(`   Role: ${masterUser.role}`)

  // ════════════════════════════════════════════════════════════════════════════
  // 3. VERIFICAR SE EXISTE APENAS 1 USUÁRIO
  // ════════════════════════════════════════════════════════════════════════════
  const totalUsers = await prisma.utilizador.count()

  console.log('\n📊 VERIFICAÇÃO:')
  console.log(`   Total de utilizadores na base de dados: ${totalUsers}`)

  if (totalUsers === 1) {
    console.log('   ✅ Apenas 1 usuário existe (conforme solicitado)')
  } else {
    console.log(`   ⚠️ Existem ${totalUsers} usuários (era esperado apenas 1)`)
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 4. RESUMO FINAL
  // ════════════════════════════════════════════════════════════════════════════
  console.log(
    '\n════════════════════════════════════════════════════════════════════',
  )
  console.log('🎉 LIMPEZA FINALIZADA COM SUCESSO!')
  console.log(
    '════════════════════════════════════════════════════════════════════\n',
  )

  console.log('📊 RESUMO DA OPERAÇÃO:')
  console.log('   ❌ Todos os pelouros removidos')
  console.log('   ❌ Todas as direções removidas')
  console.log('   ❌ Todos os departamentos removidos')
  console.log('   ❌ Todos os critérios removidos')
  console.log('   ❌ Todos os períodos de avaliação removidos')
  console.log('   ❌ Todas as fichas de avaliação removidas')
  console.log('   ❌ Todas as avaliações/submissões removidas')
  console.log(
    '   ❌ TODOS os utilizadores removidos (incluindo Masters antigos)\n',
  )

  console.log('   ✅ Apenas 1 usuário foi criado (o novo Master)\n')

  console.log('🔑 CREDENCIAIS DO ÚNICO USUÁRIO (MASTER):')
  console.log('   📧 Email: master@empresa.ao')
  console.log('   🔒 Senha: Admin@1234')
  console.log(`   👤 Role: ${Role.Master}\n`)

  console.log('📋 PRÓXIMOS PASSOS:')
  console.log('   1. Faça login com o usuário Master')
  console.log('   2. Crie novos Pelouros, Direções e Departamentos')
  console.log('   3. Cadastre novos funcionários')
  console.log('   4. Configure os critérios de avaliação')
  console.log('   5. Crie períodos de avaliação')
  console.log('   6. Inicie o processo de avaliação de desempenho')
  console.log(
    '════════════════════════════════════════════════════════════════════\n',
  )
}

main()
  .catch((e) => {
    console.error('❌ Erro durante a limpeza:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
