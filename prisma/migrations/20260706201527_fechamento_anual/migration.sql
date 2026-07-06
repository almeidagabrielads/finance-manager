-- CreateTable
CREATE TABLE "FechamentoAnual" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "saldoCentavos" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FechamentoAnual_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FechamentoAnual_householdId_ano_key" ON "FechamentoAnual"("householdId", "ano");

-- AddForeignKey
ALTER TABLE "FechamentoAnual" ADD CONSTRAINT "FechamentoAnual_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
