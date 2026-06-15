/*
  Warnings:

  - The values [AutoAvaliacao,EmReavaliacao,Reavaliado] on the enum `ficha_avaliacao_estado` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `tipo` on the `submissao_avaliacao` table. All the data in the column will be lost.
  - You are about to drop the `reavaliacao_indicada` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[fichaId]` on the table `submissao_avaliacao` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `submissao_avaliacao` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `reavaliacao_indicada` DROP FOREIGN KEY `reavaliacao_indicada_fichaId_fkey`;

-- DropForeignKey
ALTER TABLE `reavaliacao_indicada` DROP FOREIGN KEY `reavaliacao_indicada_indicadoPorId_fkey`;

-- DropForeignKey
ALTER TABLE `reavaliacao_indicada` DROP FOREIGN KEY `reavaliacao_indicada_reavaliadorId_fkey`;

-- AlterTable
ALTER TABLE `ficha_avaliacao` MODIFY `estado` ENUM('Pendente', 'AvaliadoPorChefe', 'ValidadoPorDirector') NOT NULL DEFAULT 'Pendente';

-- AlterTable
ALTER TABLE `submissao_avaliacao` DROP COLUMN `tipo`,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- DropTable
DROP TABLE `reavaliacao_indicada`;

-- CreateIndex
CREATE UNIQUE INDEX `submissao_avaliacao_fichaId_key` ON `submissao_avaliacao`(`fichaId`);
