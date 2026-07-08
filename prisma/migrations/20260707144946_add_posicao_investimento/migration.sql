-- CreateTable
CREATE TABLE "PosicaoInvestimento" (
    "id" TEXT NOT NULL,
    "investimentoId" TEXT NOT NULL,
    "mes" DATE NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "householdId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosicaoInvestimento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PosicaoInvestimento_householdId_mes_idx" ON "PosicaoInvestimento"("householdId", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "PosicaoInvestimento_investimentoId_mes_key" ON "PosicaoInvestimento"("investimentoId", "mes");

-- AddForeignKey
ALTER TABLE "PosicaoInvestimento" ADD CONSTRAINT "PosicaoInvestimento_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosicaoInvestimento" ADD CONSTRAINT "PosicaoInvestimento_investimentoId_fkey" FOREIGN KEY ("investimentoId") REFERENCES "Investimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
