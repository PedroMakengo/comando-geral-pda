/*
  Warnings:

  - You are about to drop the column `departamentoId` on the `criterio` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `criterio` DROP FOREIGN KEY `criterio_departamentoId_fkey`;

-- DropIndex
DROP INDEX `criterio_departamentoId_fkey` ON `criterio`;

-- AlterTable
ALTER TABLE `criterio` DROP COLUMN `departamentoId`;

-- CreateTable
CREATE TABLE `criterio_departamento` (
    `criterioId` VARCHAR(191) NOT NULL,
    `departamentoId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`criterioId`, `departamentoId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `criterio_departamento` ADD CONSTRAINT `criterio_departamento_criterioId_fkey` FOREIGN KEY (`criterioId`) REFERENCES `criterio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `criterio_departamento` ADD CONSTRAINT `criterio_departamento_departamentoId_fkey` FOREIGN KEY (`departamentoId`) REFERENCES `departamento`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
