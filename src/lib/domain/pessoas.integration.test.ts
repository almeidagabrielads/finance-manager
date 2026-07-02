import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { limparBanco, prismaTest } from "@/test/prisma";
import {
  atualizarPessoa,
  buscarPessoa,
  criarPessoa,
  listarPessoas,
  removerPessoa,
} from "./pessoas";

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

describe("criarPessoa", () => {
  it("cria pessoa vinculada ao household", async () => {
    const h = await criarHousehold();
    const pessoa = await criarPessoa(prismaTest, h.id, {
      nome: "Gabi",
      tipo: "INDIVIDUAL",
    });

    expect(pessoa.householdId).toBe(h.id);
    expect(pessoa.tipo).toBe("INDIVIDUAL");
  });
});

describe("listarPessoas", () => {
  it("lista apenas pessoas do household informado", async () => {
    const h1 = await criarHousehold("Casa A");
    const h2 = await criarHousehold("Casa B");
    await criarPessoa(prismaTest, h1.id, { nome: "Gabi", tipo: "INDIVIDUAL" });
    await criarPessoa(prismaTest, h2.id, { nome: "Isa", tipo: "INDIVIDUAL" });

    const pessoasH1 = await listarPessoas(prismaTest, h1.id);
    expect(pessoasH1).toHaveLength(1);
    expect(pessoasH1[0].nome).toBe("Gabi");
  });

  it("ordena por nome", async () => {
    const h = await criarHousehold();
    await criarPessoa(prismaTest, h.id, { nome: "Zeca", tipo: "OUTRO" });
    await criarPessoa(prismaTest, h.id, { nome: "Ana", tipo: "OUTRO" });

    const pessoas = await listarPessoas(prismaTest, h.id);
    expect(pessoas.map((p) => p.nome)).toEqual(["Ana", "Zeca"]);
  });
});

describe("buscarPessoa", () => {
  it("não retorna pessoa de outro household", async () => {
    const h1 = await criarHousehold("Casa A");
    const h2 = await criarHousehold("Casa B");
    const pessoa = await criarPessoa(prismaTest, h1.id, {
      nome: "Gabi",
      tipo: "INDIVIDUAL",
    });

    const resultado = await buscarPessoa(prismaTest, h2.id, pessoa.id);
    expect(resultado).toBeNull();
  });
});

describe("atualizarPessoa", () => {
  it("atualiza tipo de titularidade", async () => {
    const h = await criarHousehold();
    const pessoa = await criarPessoa(prismaTest, h.id, {
      nome: "Isa",
      tipo: "INDIVIDUAL",
    });

    const atualizado = await atualizarPessoa(prismaTest, h.id, pessoa.id, {
      tipo: "CASAL",
    });

    expect(atualizado?.tipo).toBe("CASAL");
  });

  it("retorna null ao tentar atualizar pessoa de outro household", async () => {
    const h1 = await criarHousehold("Casa A");
    const h2 = await criarHousehold("Casa B");
    const pessoa = await criarPessoa(prismaTest, h1.id, {
      nome: "Gabi",
      tipo: "INDIVIDUAL",
    });

    const resultado = await atualizarPessoa(prismaTest, h2.id, pessoa.id, {
      nome: "Invasor",
    });
    expect(resultado).toBeNull();
  });
});

describe("removerPessoa", () => {
  it("remove pessoa do household", async () => {
    const h = await criarHousehold();
    const pessoa = await criarPessoa(prismaTest, h.id, {
      nome: "Gabi",
      tipo: "INDIVIDUAL",
    });

    const removida = await removerPessoa(prismaTest, h.id, pessoa.id);
    expect(removida?.id).toBe(pessoa.id);

    const pessoas = await listarPessoas(prismaTest, h.id);
    expect(pessoas).toHaveLength(0);
  });

  it("retorna null ao tentar remover pessoa de outro household", async () => {
    const h1 = await criarHousehold("Casa A");
    const h2 = await criarHousehold("Casa B");
    const pessoa = await criarPessoa(prismaTest, h1.id, {
      nome: "Gabi",
      tipo: "INDIVIDUAL",
    });

    const resultado = await removerPessoa(prismaTest, h2.id, pessoa.id);
    expect(resultado).toBeNull();

    const pessoas = await listarPessoas(prismaTest, h1.id);
    expect(pessoas).toHaveLength(1);
  });
});
