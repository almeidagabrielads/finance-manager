import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { limparBanco, prismaTest } from "@/test/prisma";
import { criarPessoa } from "./pessoas";
import { criarBanco } from "./bancos";
import {
  atualizarInvestimento,
  buscarInvestimento,
  criarInvestimento,
  liquidezConsolidada,
  listarInvestimentos,
  removerInvestimento,
} from "./investimentos";

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
  return { household, isa, banco };
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

describe("criarInvestimento", () => {
  it("cria investimento com liquidez em D+n", async () => {
    const { household, isa, banco } = await montarBase();

    const investimento = await criarInvestimento(prismaTest, household.id, {
      bancoId: banco.id,
      tipo: "FUNDO",
      produto: "V8 Cash Platinum FIF",
      valorAtualCentavos: 4947343,
      liquidezDias: 12,
      pessoaId: isa.id,
    });

    expect(investimento?.householdId).toBe(household.id);
    expect(investimento?.liquidezDias).toBe(12);
    expect(investimento?.vencimento).toBeNull();
  });

  it("cria investimento com data de vencimento", async () => {
    const { household, isa, banco } = await montarBase();

    const investimento = await criarInvestimento(prismaTest, household.id, {
      bancoId: banco.id,
      tipo: "RENDA_FIXA",
      produto: "LCI-DI",
      valorAtualCentavos: 6720049,
      vencimento: new Date("2027-07-05"),
      pessoaId: isa.id,
      observacao: "Só tirar no vencimento",
    });

    expect(investimento?.vencimento?.toISOString().slice(0, 10)).toBe(
      "2027-07-05",
    );
    expect(investimento?.liquidezDias).toBeNull();
  });

  it("cria investimento sem liquidez definida (ex.: FGTS)", async () => {
    const { household, isa, banco } = await montarBase();

    const investimento = await criarInvestimento(prismaTest, household.id, {
      bancoId: banco.id,
      tipo: "FGTS",
      produto: "FGTS",
      valorAtualCentavos: 1311410,
      pessoaId: isa.id,
    });

    expect(investimento?.vencimento).toBeNull();
    expect(investimento?.liquidezDias).toBeNull();
  });

  it("rejeita informar vencimento e liquidezDias ao mesmo tempo (validação de schema)", async () => {
    const { CriarInvestimentoSchema } = await import("./investimentos");
    const resultado = CriarInvestimentoSchema.safeParse({
      bancoId: "x",
      tipo: "RENDA_FIXA",
      produto: "Teste",
      valorAtualCentavos: 100,
      vencimento: new Date(),
      liquidezDias: 30,
      pessoaId: "y",
    });
    expect(resultado.success).toBe(false);
  });

  it("retorna null se banco pertence a outro household", async () => {
    const { isa } = await montarBase("Casa A");
    const h2 = await criarHousehold("Casa B");
    const bancoDeOutraCasa = await criarBanco(prismaTest, h2.id, {
      nome: "Nubank",
      tipo: "CORRETORA",
    });

    const investimento = await criarInvestimento(prismaTest, h2.id, {
      bancoId: bancoDeOutraCasa.id,
      tipo: "RENDA_FIXA",
      produto: "Teste",
      valorAtualCentavos: 1000,
      pessoaId: isa.id,
    });

    expect(investimento).toBeNull();
  });

  it("retorna null se pessoa pertence a outro household", async () => {
    const { banco } = await montarBase("Casa A");
    const h2 = await criarHousehold("Casa B");
    const isaDeOutraCasa = await criarPessoa(prismaTest, h2.id, {
      nome: "Isa",
      tipo: "INDIVIDUAL",
    });

    const investimento = await criarInvestimento(prismaTest, h2.id, {
      bancoId: banco.id,
      tipo: "RENDA_FIXA",
      produto: "Teste",
      valorAtualCentavos: 1000,
      pessoaId: isaDeOutraCasa.id,
    });

    expect(investimento).toBeNull();
  });
});

describe("atualizarInvestimento", () => {
  it("atualiza valor atual", async () => {
    const { household, isa, banco } = await montarBase();
    const investimento = await criarInvestimento(prismaTest, household.id, {
      bancoId: banco.id,
      tipo: "RENDA_FIXA",
      produto: "Teste",
      valorAtualCentavos: 100000,
      liquidezDias: 0,
      pessoaId: isa.id,
    });

    const atualizado = await atualizarInvestimento(
      prismaTest,
      household.id,
      investimento!.id,
      { valorAtualCentavos: 150000 },
    );

    expect(atualizado?.valorAtualCentavos).toBe(150000);
  });

  it("retorna null para investimento inexistente", async () => {
    const { household } = await montarBase();
    const atualizado = await atualizarInvestimento(
      prismaTest,
      household.id,
      "id-fake",
      { valorAtualCentavos: 100 },
    );
    expect(atualizado).toBeNull();
  });
});

describe("removerInvestimento", () => {
  it("remove fisicamente o investimento", async () => {
    const { household, isa, banco } = await montarBase();
    const investimento = await criarInvestimento(prismaTest, household.id, {
      bancoId: banco.id,
      tipo: "RENDA_FIXA",
      produto: "Teste",
      valorAtualCentavos: 100000,
      pessoaId: isa.id,
    });

    const removido = await removerInvestimento(
      prismaTest,
      household.id,
      investimento!.id,
    );
    expect(removido).not.toBeNull();

    const buscado = await prismaTest.investimento.findUnique({
      where: { id: investimento!.id },
    });
    expect(buscado).toBeNull();
  });
});

describe("buscarInvestimento", () => {
  it("não retorna investimento de outro household", async () => {
    const { household, isa, banco } = await montarBase("Casa A");
    const h2 = await criarHousehold("Casa B");
    const investimento = await criarInvestimento(prismaTest, household.id, {
      bancoId: banco.id,
      tipo: "RENDA_FIXA",
      produto: "Teste",
      valorAtualCentavos: 1000,
      pessoaId: isa.id,
    });

    const resultado = await buscarInvestimento(
      prismaTest,
      h2.id,
      investimento!.id,
    );
    expect(resultado).toBeNull();
  });
});

describe("listarInvestimentos (filtros)", () => {
  it("filtra por pessoa", async () => {
    const { household, isa, banco } = await montarBase();
    const gabi = await criarPessoa(prismaTest, household.id, {
      nome: "Gabi",
      tipo: "INDIVIDUAL",
    });
    await criarInvestimento(prismaTest, household.id, {
      bancoId: banco.id,
      tipo: "RENDA_FIXA",
      produto: "Isa Investimento",
      valorAtualCentavos: 1000,
      pessoaId: isa.id,
    });
    await criarInvestimento(prismaTest, household.id, {
      bancoId: banco.id,
      tipo: "RENDA_FIXA",
      produto: "Gabi Investimento",
      valorAtualCentavos: 2000,
      pessoaId: gabi.id,
    });

    const investimentos = await listarInvestimentos(prismaTest, household.id, {
      pessoaId: isa.id,
    });

    expect(investimentos).toHaveLength(1);
    expect(investimentos[0].pessoaId).toBe(isa.id);
  });

  it("filtra por tipo", async () => {
    const { household, isa, banco } = await montarBase();
    await criarInvestimento(prismaTest, household.id, {
      bancoId: banco.id,
      tipo: "FGTS",
      produto: "FGTS",
      valorAtualCentavos: 1000,
      pessoaId: isa.id,
    });
    await criarInvestimento(prismaTest, household.id, {
      bancoId: banco.id,
      tipo: "RENDA_FIXA",
      produto: "LCI",
      valorAtualCentavos: 2000,
      pessoaId: isa.id,
    });

    const investimentos = await listarInvestimentos(prismaTest, household.id, {
      tipo: "FGTS",
    });

    expect(investimentos).toHaveLength(1);
    expect(investimentos[0].produto).toBe("FGTS");
  });
});

describe("liquidezConsolidada", () => {
  it("agrupa investimentos por faixa de prazo de resgate (RF15)", async () => {
    const { household, isa, banco } = await montarBase();
    const dataReferencia = new Date("2026-07-03T00:00:00.000Z");

    await criarInvestimento(prismaTest, household.id, {
      bancoId: banco.id,
      tipo: "RENDA_FIXA",
      produto: "Poupança D+0",
      valorAtualCentavos: 6737056,
      liquidezDias: 0,
      pessoaId: isa.id,
    });
    await criarInvestimento(prismaTest, household.id, {
      bancoId: banco.id,
      tipo: "FUNDO",
      produto: "Fundo D+12",
      valorAtualCentavos: 4947343,
      liquidezDias: 12,
      pessoaId: isa.id,
    });
    await criarInvestimento(prismaTest, household.id, {
      bancoId: banco.id,
      tipo: "FUNDO",
      produto: "Fundo D+46",
      valorAtualCentavos: 4283251,
      liquidezDias: 46,
      pessoaId: isa.id,
    });
    // Vence em ~2 dias a partir da data de referência
    await criarInvestimento(prismaTest, household.id, {
      bancoId: banco.id,
      tipo: "RENDA_FIXA",
      produto: "LCA vence em breve",
      valorAtualCentavos: 123013,
      vencimento: new Date("2026-07-05"),
      pessoaId: isa.id,
    });
    // Vence em > 1 ano
    await criarInvestimento(prismaTest, household.id, {
      bancoId: banco.id,
      tipo: "RENDA_FIXA",
      produto: "LCD BNDES",
      valorAtualCentavos: 16994586,
      vencimento: new Date("2030-06-17"),
      pessoaId: isa.id,
    });
    // Sem prazo definido
    await criarInvestimento(prismaTest, household.id, {
      bancoId: banco.id,
      tipo: "FGTS",
      produto: "FGTS Isa",
      valorAtualCentavos: 1311410,
      pessoaId: isa.id,
    });

    const resultado = await liquidezConsolidada(prismaTest, household.id, {
      dataReferencia,
    });

    const faixa = (nome: string) =>
      resultado.find((r) => r.faixa === nome)!;

    expect(faixa("IMEDIATO").totalCentavos).toBe(6737056);
    expect(faixa("ATE_30_DIAS").totalCentavos).toBe(4947343 + 123013);
    expect(faixa("ATE_90_DIAS").totalCentavos).toBe(4283251);
    expect(faixa("MAIS_DE_1_ANO").totalCentavos).toBe(16994586);
    expect(faixa("INDEFINIDO").totalCentavos).toBe(1311410);
  });

  it("filtra por pessoa", async () => {
    const { household, isa, banco } = await montarBase();
    const gabi = await criarPessoa(prismaTest, household.id, {
      nome: "Gabi",
      tipo: "INDIVIDUAL",
    });
    await criarInvestimento(prismaTest, household.id, {
      bancoId: banco.id,
      tipo: "RENDA_FIXA",
      produto: "Isa",
      valorAtualCentavos: 1000,
      liquidezDias: 0,
      pessoaId: isa.id,
    });
    await criarInvestimento(prismaTest, household.id, {
      bancoId: banco.id,
      tipo: "RENDA_FIXA",
      produto: "Gabi",
      valorAtualCentavos: 2000,
      liquidezDias: 0,
      pessoaId: gabi.id,
    });

    const resultado = await liquidezConsolidada(prismaTest, household.id, {
      pessoaId: isa.id,
    });

    const imediato = resultado.find((r) => r.faixa === "IMEDIATO")!;
    expect(imediato.totalCentavos).toBe(1000);
  });

  it("soma zero para household sem investimentos", async () => {
    const { household } = await montarBase();
    const resultado = await liquidezConsolidada(prismaTest, household.id);
    for (const grupo of resultado) {
      expect(grupo.totalCentavos).toBe(0);
    }
  });
});
