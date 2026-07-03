import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { limparBanco, prismaTest } from "@/test/prisma";
import {
  atualizarBanco,
  buscarBanco,
  criarBanco,
  inativarBanco,
  listarBancos,
  reativarBanco,
} from "./bancos";

async function criarHousehold(nome = "Isa & Gabi") {
  return prismaTest.household.create({ data: { nome } });
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

describe("criarBanco", () => {
  it("cria banco vinculado ao household, ativo por padrão", async () => {
    const h = await criarHousehold();
    const banco = await criarBanco(prismaTest, h.id, {
      nome: "Itaú Crédito",
      tipo: "CARTAO_CREDITO",
    });

    expect(banco.householdId).toBe(h.id);
    expect(banco.ativo).toBe(true);
    expect(banco.tipo).toBe("CARTAO_CREDITO");
  });
});

describe("listarBancos", () => {
  it("lista apenas bancos do household informado", async () => {
    const h1 = await criarHousehold("Casa A");
    const h2 = await criarHousehold("Casa B");
    await criarBanco(prismaTest, h1.id, {
      nome: "Nubank Crédito",
      tipo: "CARTAO_CREDITO",
    });
    await criarBanco(prismaTest, h2.id, { nome: "XP", tipo: "CORRETORA" });

    const bancosH1 = await listarBancos(prismaTest, h1.id);
    expect(bancosH1).toHaveLength(1);
    expect(bancosH1[0].nome).toBe("Nubank Crédito");
  });

  it("ordena por nome", async () => {
    const h = await criarHousehold();
    await criarBanco(prismaTest, h.id, { nome: "XP", tipo: "CORRETORA" });
    await criarBanco(prismaTest, h.id, {
      nome: "BB Crédito",
      tipo: "CARTAO_CREDITO",
    });

    const bancos = await listarBancos(prismaTest, h.id);
    expect(bancos.map((b) => b.nome)).toEqual(["BB Crédito", "XP"]);
  });

  it("por padrão não lista bancos inativos", async () => {
    const h = await criarHousehold();
    const banco = await criarBanco(prismaTest, h.id, {
      nome: "Itaú Crédito",
      tipo: "CARTAO_CREDITO",
    });
    await inativarBanco(prismaTest, h.id, banco.id);

    const bancos = await listarBancos(prismaTest, h.id);
    expect(bancos).toHaveLength(0);
  });

  it("inclui bancos inativos quando solicitado", async () => {
    const h = await criarHousehold();
    const banco = await criarBanco(prismaTest, h.id, {
      nome: "Itaú Crédito",
      tipo: "CARTAO_CREDITO",
    });
    await inativarBanco(prismaTest, h.id, banco.id);

    const bancos = await listarBancos(prismaTest, h.id, {
      incluirInativos: true,
    });
    expect(bancos).toHaveLength(1);
  });
});

describe("buscarBanco", () => {
  it("não retorna banco de outro household", async () => {
    const h1 = await criarHousehold("Casa A");
    const h2 = await criarHousehold("Casa B");
    const banco = await criarBanco(prismaTest, h1.id, {
      nome: "Itaú Crédito",
      tipo: "CARTAO_CREDITO",
    });

    const resultado = await buscarBanco(prismaTest, h2.id, banco.id);
    expect(resultado).toBeNull();
  });
});

describe("atualizarBanco", () => {
  it("atualiza nome e tipo", async () => {
    const h = await criarHousehold();
    const banco = await criarBanco(prismaTest, h.id, {
      nome: "Itaú Crédito",
      tipo: "CARTAO_CREDITO",
    });

    const atualizado = await atualizarBanco(prismaTest, h.id, banco.id, {
      tipo: "CONTA_CORRENTE",
    });

    expect(atualizado?.tipo).toBe("CONTA_CORRENTE");
  });

  it("retorna null ao tentar atualizar banco de outro household", async () => {
    const h1 = await criarHousehold("Casa A");
    const h2 = await criarHousehold("Casa B");
    const banco = await criarBanco(prismaTest, h1.id, {
      nome: "Itaú Crédito",
      tipo: "CARTAO_CREDITO",
    });

    const resultado = await atualizarBanco(prismaTest, h2.id, banco.id, {
      nome: "Invasora",
    });
    expect(resultado).toBeNull();
  });
});

describe("inativarBanco / reativarBanco", () => {
  it("inativa sem excluir fisicamente e permite reativar", async () => {
    const h = await criarHousehold();
    const banco = await criarBanco(prismaTest, h.id, {
      nome: "Itaú Crédito",
      tipo: "CARTAO_CREDITO",
    });

    const inativado = await inativarBanco(prismaTest, h.id, banco.id);
    expect(inativado?.ativo).toBe(false);

    const aindaExiste = await prismaTest.banco.findUnique({
      where: { id: banco.id },
    });
    expect(aindaExiste).not.toBeNull();

    const reativado = await reativarBanco(prismaTest, h.id, banco.id);
    expect(reativado?.ativo).toBe(true);
  });

  it("retorna null ao tentar inativar banco de outro household", async () => {
    const h1 = await criarHousehold("Casa A");
    const h2 = await criarHousehold("Casa B");
    const banco = await criarBanco(prismaTest, h1.id, {
      nome: "Itaú Crédito",
      tipo: "CARTAO_CREDITO",
    });

    const resultado = await inativarBanco(prismaTest, h2.id, banco.id);
    expect(resultado).toBeNull();
  });
});
