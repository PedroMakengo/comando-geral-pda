-- CreateTable
CREATE TABLE `pelouro` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NULL,
    `dataCriacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pelouro_nome_key`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `direcao` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NULL,
    `dataCriacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `pelouroId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `direcao_nome_key`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departamento` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `dataCriacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `direcaoId` VARCHAR(191) NOT NULL,
    `chefeId` VARCHAR(191) NULL,

    UNIQUE INDEX `departamento_chefeId_key`(`chefeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `utilizador` (
    `id` VARCHAR(191) NOT NULL,
    `nomeCompleto` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `numeroMecanografico` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `cargo` VARCHAR(191) NOT NULL,
    `avatarUrl` VARCHAR(191) NOT NULL,
    `role` ENUM('Master', 'Director', 'ChefeDepartamento', 'Tecnico') NOT NULL DEFAULT 'Tecnico',
    `estado` ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
    `dataAdmissao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `pelouroId` VARCHAR(191) NULL,
    `direcaoId` VARCHAR(191) NULL,
    `departamentoId` VARCHAR(191) NULL,

    UNIQUE INDEX `utilizador_email_key`(`email`),
    UNIQUE INDEX `utilizador_numeroMecanografico_key`(`numeroMecanografico`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `periodo_avaliacao` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `dataInicio` DATETIME(3) NOT NULL,
    `dataFim` DATETIME(3) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `criterio` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NULL,
    `peso` DOUBLE NOT NULL DEFAULT 1.0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `departamentoId` VARCHAR(191) NULL,
    `tecnicoId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ficha_avaliacao` (
    `id` VARCHAR(191) NOT NULL,
    `estado` ENUM('Pendente', 'AutoAvaliacao', 'AvaliadoPorChefe', 'EmReavaliacao', 'Reavaliado', 'ValidadoPorDirector') NOT NULL DEFAULT 'Pendente',
    `pontuacaoFinal` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `avaliadoId` VARCHAR(191) NOT NULL,
    `periodoId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `ficha_avaliacao_avaliadoId_periodoId_key`(`avaliadoId`, `periodoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `submissao_avaliacao` (
    `id` VARCHAR(191) NOT NULL,
    `tipo` ENUM('AutoAvaliacao', 'AvaliacaoChefe', 'Reavaliacao') NOT NULL,
    `comentarios` VARCHAR(191) NULL,
    `pontuacaoTotal` DOUBLE NULL,
    `dataSubmissao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fichaId` VARCHAR(191) NOT NULL,
    `avaliadorId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `criterio_resposta` (
    `id` VARCHAR(191) NOT NULL,
    `pontuacao` DOUBLE NOT NULL,
    `observacao` VARCHAR(191) NULL,
    `submissaoId` VARCHAR(191) NOT NULL,
    `criterioId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `criterio_resposta_submissaoId_criterioId_key`(`submissaoId`, `criterioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reavaliacao_indicada` (
    `id` VARCHAR(191) NOT NULL,
    `motivacao` VARCHAR(191) NULL,
    `dataIndicacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `concluida` BOOLEAN NOT NULL DEFAULT false,
    `fichaId` VARCHAR(191) NOT NULL,
    `reavaliadorId` VARCHAR(191) NOT NULL,
    `indicadoPorId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `reavaliacao_indicada_fichaId_key`(`fichaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `validacao_director` (
    `id` VARCHAR(191) NOT NULL,
    `aprovado` BOOLEAN NOT NULL,
    `comentarios` VARCHAR(191) NULL,
    `dataValidacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fichaId` VARCHAR(191) NOT NULL,
    `directorId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `validacao_director_fichaId_key`(`fichaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `direcao` ADD CONSTRAINT `direcao_pelouroId_fkey` FOREIGN KEY (`pelouroId`) REFERENCES `pelouro`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `departamento` ADD CONSTRAINT `departamento_direcaoId_fkey` FOREIGN KEY (`direcaoId`) REFERENCES `direcao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `departamento` ADD CONSTRAINT `departamento_chefeId_fkey` FOREIGN KEY (`chefeId`) REFERENCES `utilizador`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `utilizador` ADD CONSTRAINT `utilizador_pelouroId_fkey` FOREIGN KEY (`pelouroId`) REFERENCES `pelouro`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `utilizador` ADD CONSTRAINT `utilizador_direcaoId_fkey` FOREIGN KEY (`direcaoId`) REFERENCES `direcao`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `utilizador` ADD CONSTRAINT `utilizador_departamentoId_fkey` FOREIGN KEY (`departamentoId`) REFERENCES `departamento`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `criterio` ADD CONSTRAINT `criterio_departamentoId_fkey` FOREIGN KEY (`departamentoId`) REFERENCES `departamento`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `criterio` ADD CONSTRAINT `criterio_tecnicoId_fkey` FOREIGN KEY (`tecnicoId`) REFERENCES `utilizador`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ficha_avaliacao` ADD CONSTRAINT `ficha_avaliacao_avaliadoId_fkey` FOREIGN KEY (`avaliadoId`) REFERENCES `utilizador`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ficha_avaliacao` ADD CONSTRAINT `ficha_avaliacao_periodoId_fkey` FOREIGN KEY (`periodoId`) REFERENCES `periodo_avaliacao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissao_avaliacao` ADD CONSTRAINT `submissao_avaliacao_fichaId_fkey` FOREIGN KEY (`fichaId`) REFERENCES `ficha_avaliacao`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissao_avaliacao` ADD CONSTRAINT `submissao_avaliacao_avaliadorId_fkey` FOREIGN KEY (`avaliadorId`) REFERENCES `utilizador`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `criterio_resposta` ADD CONSTRAINT `criterio_resposta_submissaoId_fkey` FOREIGN KEY (`submissaoId`) REFERENCES `submissao_avaliacao`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `criterio_resposta` ADD CONSTRAINT `criterio_resposta_criterioId_fkey` FOREIGN KEY (`criterioId`) REFERENCES `criterio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reavaliacao_indicada` ADD CONSTRAINT `reavaliacao_indicada_fichaId_fkey` FOREIGN KEY (`fichaId`) REFERENCES `ficha_avaliacao`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reavaliacao_indicada` ADD CONSTRAINT `reavaliacao_indicada_reavaliadorId_fkey` FOREIGN KEY (`reavaliadorId`) REFERENCES `utilizador`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reavaliacao_indicada` ADD CONSTRAINT `reavaliacao_indicada_indicadoPorId_fkey` FOREIGN KEY (`indicadoPorId`) REFERENCES `utilizador`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `validacao_director` ADD CONSTRAINT `validacao_director_fichaId_fkey` FOREIGN KEY (`fichaId`) REFERENCES `ficha_avaliacao`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `validacao_director` ADD CONSTRAINT `validacao_director_directorId_fkey` FOREIGN KEY (`directorId`) REFERENCES `utilizador`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
