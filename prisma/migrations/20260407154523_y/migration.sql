/*
  Warnings:

  - You are about to drop the `log_sistema` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `log_sistema` DROP FOREIGN KEY `log_sistema_utilizadorId_fkey`;

-- DropTable
DROP TABLE `log_sistema`;
