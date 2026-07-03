/*
  Warnings:

  - Added the required column `tipo` to the `Banco` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoBanco" AS ENUM ('CARTAO_CREDITO', 'CONTA_CORRENTE', 'CORRETORA', 'DINHEIRO', 'OUTRO');

-- AlterTable
ALTER TABLE "Banco" ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tipo" "TipoBanco" NOT NULL;
