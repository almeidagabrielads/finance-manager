-- CreateEnum
CREATE TYPE "TipoPessoa" AS ENUM ('INDIVIDUAL', 'CASAL', 'FAMILIA', 'OUTRO');

-- CreateEnum
CREATE TYPE "SubtipoReceita" AS ENUM ('SALARIO', 'VOUCHER', 'OUTROS');

-- CreateEnum
CREATE TYPE "TipoInvestimento" AS ENUM ('RENDA_FIXA', 'FUNDO', 'FGTS', 'OUTRO');

-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pessoa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoPessoa" NOT NULL,
    "householdId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pessoa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "percentualOrcamento" DECIMAL(5,2),
    "householdId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subcategoria" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subcategoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Banco" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Banco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lancamento" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "descricaoOrigem" TEXT,
    "descricaoPropria" TEXT,
    "valorCentavos" INTEGER NOT NULL,
    "descontoCentavos" INTEGER NOT NULL DEFAULT 0,
    "categoriaId" TEXT,
    "subcategoriaId" TEXT,
    "bancoId" TEXT NOT NULL,
    "pessoaDivisaoId" TEXT NOT NULL,
    "pessoaPagouId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,

    CONSTRAINT "Lancamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receita" (
    "id" TEXT NOT NULL,
    "pessoaId" TEXT NOT NULL,
    "subtipo" "SubtipoReceita" NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "mes" DATE NOT NULL,
    "householdId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrcamentoPlanejado" (
    "id" TEXT NOT NULL,
    "pessoaId" TEXT,
    "categoriaId" TEXT NOT NULL,
    "subcategoriaId" TEXT,
    "mes" INTEGER,
    "ano" INTEGER NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "householdId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrcamentoPlanejado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investimento" (
    "id" TEXT NOT NULL,
    "bancoId" TEXT NOT NULL,
    "tipo" "TipoInvestimento" NOT NULL,
    "produto" TEXT NOT NULL,
    "valorAtualCentavos" INTEGER NOT NULL,
    "vencimento" DATE,
    "liquidezDias" INTEGER,
    "observacao" TEXT,
    "pessoaId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosicaoPatrimonio" (
    "id" TEXT NOT NULL,
    "bancoId" TEXT NOT NULL,
    "mes" DATE NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "householdId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosicaoPatrimonio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Household_nome_key" ON "Household"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Pessoa_householdId_nome_key" ON "Pessoa"("householdId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_householdId_nome_key" ON "Categoria"("householdId", "nome");

-- CreateIndex
CREATE INDEX "Subcategoria_householdId_idx" ON "Subcategoria"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "Subcategoria_categoriaId_nome_key" ON "Subcategoria"("categoriaId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "Banco_householdId_nome_key" ON "Banco"("householdId", "nome");

-- CreateIndex
CREATE INDEX "Lancamento_householdId_data_idx" ON "Lancamento"("householdId", "data");

-- CreateIndex
CREATE INDEX "Lancamento_householdId_categoriaId_idx" ON "Lancamento"("householdId", "categoriaId");

-- CreateIndex
CREATE INDEX "Lancamento_householdId_pessoaDivisaoId_idx" ON "Lancamento"("householdId", "pessoaDivisaoId");

-- CreateIndex
CREATE INDEX "Lancamento_householdId_pessoaPagouId_idx" ON "Lancamento"("householdId", "pessoaPagouId");

-- CreateIndex
CREATE INDEX "Receita_householdId_mes_idx" ON "Receita"("householdId", "mes");

-- CreateIndex
CREATE INDEX "OrcamentoPlanejado_householdId_ano_mes_idx" ON "OrcamentoPlanejado"("householdId", "ano", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "OrcamentoPlanejado_householdId_pessoaId_categoriaId_subcate_key" ON "OrcamentoPlanejado"("householdId", "pessoaId", "categoriaId", "subcategoriaId", "mes", "ano");

-- CreateIndex
CREATE INDEX "Investimento_householdId_idx" ON "Investimento"("householdId");

-- CreateIndex
CREATE INDEX "Investimento_householdId_pessoaId_idx" ON "Investimento"("householdId", "pessoaId");

-- CreateIndex
CREATE INDEX "PosicaoPatrimonio_householdId_mes_idx" ON "PosicaoPatrimonio"("householdId", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "PosicaoPatrimonio_householdId_bancoId_mes_key" ON "PosicaoPatrimonio"("householdId", "bancoId", "mes");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pessoa" ADD CONSTRAINT "Pessoa_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categoria" ADD CONSTRAINT "Categoria_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subcategoria" ADD CONSTRAINT "Subcategoria_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Banco" ADD CONSTRAINT "Banco_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_subcategoriaId_fkey" FOREIGN KEY ("subcategoriaId") REFERENCES "Subcategoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_bancoId_fkey" FOREIGN KEY ("bancoId") REFERENCES "Banco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_pessoaDivisaoId_fkey" FOREIGN KEY ("pessoaDivisaoId") REFERENCES "Pessoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_pessoaPagouId_fkey" FOREIGN KEY ("pessoaPagouId") REFERENCES "Pessoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receita" ADD CONSTRAINT "Receita_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receita" ADD CONSTRAINT "Receita_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoPlanejado" ADD CONSTRAINT "OrcamentoPlanejado_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoPlanejado" ADD CONSTRAINT "OrcamentoPlanejado_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoPlanejado" ADD CONSTRAINT "OrcamentoPlanejado_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcamentoPlanejado" ADD CONSTRAINT "OrcamentoPlanejado_subcategoriaId_fkey" FOREIGN KEY ("subcategoriaId") REFERENCES "Subcategoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investimento" ADD CONSTRAINT "Investimento_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investimento" ADD CONSTRAINT "Investimento_bancoId_fkey" FOREIGN KEY ("bancoId") REFERENCES "Banco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investimento" ADD CONSTRAINT "Investimento_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosicaoPatrimonio" ADD CONSTRAINT "PosicaoPatrimonio_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosicaoPatrimonio" ADD CONSTRAINT "PosicaoPatrimonio_bancoId_fkey" FOREIGN KEY ("bancoId") REFERENCES "Banco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
