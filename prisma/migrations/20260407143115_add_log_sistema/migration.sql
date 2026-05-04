-- CreateTable
CREATE TABLE `log_sistema` (
    `id` VARCHAR(191) NOT NULL,
    `categoria` ENUM('Autenticacao', 'Utilizador', 'Organizacao', 'Criterio', 'Avaliacao', 'Validacao', 'Periodo', 'Sistema') NOT NULL,
    `nivel` ENUM('Info', 'Aviso', 'Erro', 'Critico') NOT NULL DEFAULT 'Info',
    `accao` VARCHAR(191) NOT NULL,
    `descricao` TEXT NOT NULL,
    `entidadeId` VARCHAR(191) NULL,
    `payload` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `utilizadorId` VARCHAR(191) NULL,

    INDEX `log_sistema_createdAt_idx`(`createdAt`),
    INDEX `log_sistema_categoria_idx`(`categoria`),
    INDEX `log_sistema_nivel_idx`(`nivel`),
    INDEX `log_sistema_utilizadorId_idx`(`utilizadorId`),
    INDEX `log_sistema_accao_idx`(`accao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `log_sistema` ADD CONSTRAINT `log_sistema_utilizadorId_fkey` FOREIGN KEY (`utilizadorId`) REFERENCES `utilizador`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
