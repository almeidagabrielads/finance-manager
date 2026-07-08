import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { limparBanco, prismaTest } from "@/test/prisma";
import { criarPessoa } from "./pessoas";
import { criarBanco } from "./bancos";
import { criarInvestimento } from "./investimentos";
import {
  listarPosicoesInvestimento,
  removerPosicaoInvestimento,
  upsertPosicaoInvestimento,
} from "./posicoesInvestimento";

async function criarHousehold(nome = "Isa & Gabi") {
  return prismaTest.household.create({ data: { nome } });
}

async function montarBase(householdNome = "Isa & Gabi") {
  const household = await criarHousehold(householdNome);
  const isa = await criarPessoa(prismaTest, household.id, {
    nome: "Isa",
    tipo: "INDIVIDUAL",
  });
  const banco = await criarBanco(prismaTest, household.id, {
    nome: "XP",
    tipo: "CORRETORA",
  });
  const investimento = await criarInvestimento(prismaTest, household.id, {
    bancoId: banco.id,
    tipo: "FUNDO",
    produto: "Fundo Multimercado",
    valorAtualCentavos: 100000,
    pessoaId: isa.id,
  });
  return { household, isa, banco, investimento: investimento! };
}

beforeAll(async () => {
  await limparBanco();
});

afterEach(async () => {
  await limparBanco();
});

afterAll(async () => {
  await prismaTest.$disconnect();
});

describe("upsertPosicaoInvestimento", () => {
  it("cria posição mensal normalizando a data para o 1º dia do mês", async () => {
    const { household, investimento } = await montarBase();

    const posicao = await upsertPosicaoInvestimento(prismaTest, household.id, {
      investimentoId: investimento.id,
      mes: new Date("2026-03-15"),
      valorCentavos: 105000,
    });

    expect(posicao?.valorCentavos).toBe(105000);
    expect(posicao?.mes.toISOString().slice(0, 10)).toBe("2026-03-01");
  });

  it("atualiza a posição existente do mesmo mês em vez de duplicar", async () => {
    const { household, investimento } = await montarBase();

    await upsertPosicaoInvestimento(prismaTest, household.id, {
      investimentoId: investimento.id,
      mes: new Date("2026-03-01"),
      valorCentavos: 105000,
    });
    await upsertPosicaoInvestimento(prismaTest, household.id, {
      investimentoId: investimento.id,
      mes: new Date("2026-03-20"),
      valorCentavos: 110000,
    });

    const posicoes = await prismaTest.posicaoInvestimento.findMany({
      where: { investimentoId: investimento.id },
    });
    expect(posicoes).toHaveLength(1);
    expect(posicoes[0].valorCentavos).toBe(110000);
  });

  it("retorna null se o investimento pertence a outro household", async () => {
    const { investimento } = await montarBase("Casa A");
    const h2 = await criarHousehold("Casa B");

    const posicao = await upsertPosicaoInvestimento(prismaTest, h2.id, {
      investimentoId: investimento.id,
      mes: new Date("2026-03-01"),
      valorCentavos: 1000,
    });

    expect(posicao).toBeNull();
  });
});

describe("listarPosicoesInvestimento", () => {
  it("lista apenas posições dentro do ano informado", async () => {
    const { household, investimento } = await montarBase();
    await upsertPosicaoInvestimento(prismaTest, household.id, {
      investimentoId: investimento.id,
      mes: new Date("2025-12-01"),
      valorCentavos: 90000,
    });
    await upsertPosicaoInvestimento(prismaTest, household.id, {
      investimentoId: investimento.id,
      mes: new Date("2026-01-01"),
      valorCentavos: 95000,
    });

    const posicoes = await listarPosicoesInvestimento(
      prismaTest,
      household.id,
      {
        ano: 2026,
      },
    );

    expect(posicoes).toHaveLength(1);
    expect(posicoes[0].valorCentavos).toBe(95000);
  });
});

describe("removerPosicaoInvestimento", () => {
  it("remove a posição do mês informado", async () => {
    const { household, investimento } = await montarBase();
    await upsertPosicaoInvestimento(prismaTest, household.id, {
      investimentoId: investimento.id,
      mes: new Date("2026-03-01"),
      valorCentavos: 105000,
    });

    await removerPosicaoInvestimento(prismaTest, household.id, {
      investimentoId: investimento.id,
      mes: new Date("2026-03-01"),
    });

    const posicoes = await prismaTest.posicaoInvestimento.findMany({
      where: { investimentoId: investimento.id },
    });
    expect(posicoes).toHaveLength(0);
  });
});
