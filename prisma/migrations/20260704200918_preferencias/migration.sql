-- CreateTable
CREATE TABLE "Preferencia" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "moeda" TEXT NOT NULL DEFAULT 'BRL',
    "idioma" TEXT NOT NULL DEFAULT 'pt-BR',
    "tema" TEXT NOT NULL DEFAULT 'CLARO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Preferencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Preferencia_householdId_key" ON "Preferencia"("householdId");

-- AddForeignKey
ALTER TABLE "Preferencia" ADD CONSTRAINT "Preferencia_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
