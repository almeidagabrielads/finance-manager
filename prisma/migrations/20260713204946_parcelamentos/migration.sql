-- CreateEnum
CREATE TYPE "ModoParcelamento" AS ENUM ('GRADUAL', 'AVISTA', 'PREVISAO');

-- AlterTable
ALTER TABLE "Lancamento" ADD COLUMN     "numeroParcela" INTEGER,
ADD COLUMN     "parcelamentoId" TEXT,
ADD COLUMN     "previsto" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Preferencia" ADD COLUMN     "modoParcelamentoPadrao" "ModoParcelamento" NOT NULL DEFAULT 'GRADUAL';

-- CreateTable
CREATE TABLE "Parcelamento" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "descricaoOrigem" TEXT,
    "descricaoPropria" TEXT,
    "valorTotalCentavos" INTEGER NOT NULL,
    "quantidadeParcelas" INTEGER NOT NULL,
    "dataPrimeiraParcela" DATE NOT NULL,
    "modo" "ModoParcelamento" NOT NULL,
    "categoriaId" TEXT,
    "subcategoriaId" TEXT,
    "bancoId" TEXT NOT NULL,
    "pessoaDivisaoId" TEXT NOT NULL,
    "pessoaPagouId" TEXT NOT NULL,
    "tipoGasto" "TipoGasto" NOT NULL DEFAULT 'VARIAVEL',
    "quitadoEm" TIMESTAMP(3),
    "descontoQuitacaoCentavos" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,

    CONSTRAINT "Parcelamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Parcelamento_householdId_idx" ON "Parcelamento"("householdId");

-- CreateIndex
CREATE INDEX "Parcelamento_householdId_quitadoEm_idx" ON "Parcelamento"("householdId", "quitadoEm");

-- CreateIndex
CREATE INDEX "Parcelamento_householdId_bancoId_idx" ON "Parcelamento"("householdId", "bancoId");

-- CreateIndex
CREATE INDEX "Lancamento_householdId_parcelamentoId_idx" ON "Lancamento"("householdId", "parcelamentoId");

-- CreateIndex
-- NOTA: índice único parcial editado à mão (Prisma não suporta unique parcial
-- no schema DSL). Garante que não existam duas linhas para a mesma parcela de
-- um Parcelamento. Se o schema.prisma for regenerado via introspecção
-- (prisma db pull), este índice não será representado lá — não removê-lo por
-- isso; a checagem de aplicação em src/lib/domain/parcelamentos.ts é apenas
-- defesa em profundidade, não substitui esta constraint.
CREATE UNIQUE INDEX "Lancamento_parcelamentoId_numeroParcela_key"
  ON "Lancamento" ("parcelamentoId", "numeroParcela")
  WHERE "parcelamentoId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_parcelamentoId_fkey" FOREIGN KEY ("parcelamentoId") REFERENCES "Parcelamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcelamento" ADD CONSTRAINT "Parcelamento_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcelamento" ADD CONSTRAINT "Parcelamento_bancoId_fkey" FOREIGN KEY ("bancoId") REFERENCES "Banco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcelamento" ADD CONSTRAINT "Parcelamento_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcelamento" ADD CONSTRAINT "Parcelamento_subcategoriaId_fkey" FOREIGN KEY ("subcategoriaId") REFERENCES "Subcategoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcelamento" ADD CONSTRAINT "Parcelamento_pessoaDivisaoId_fkey" FOREIGN KEY ("pessoaDivisaoId") REFERENCES "Pessoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcelamento" ADD CONSTRAINT "Parcelamento_pessoaPagouId_fkey" FOREIGN KEY ("pessoaPagouId") REFERENCES "Pessoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
