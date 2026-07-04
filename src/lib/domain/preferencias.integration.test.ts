import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { limparBanco, prismaTest } from "@/test/prisma";
import {
  atualizarPreferencias,
  obterOuCriarPreferencias,
} from "./preferencias";

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

describe("obterOuCriarPreferencias", () => {
  it("cria a linha com os padrões na primeira leitura", async () => {
    const h = await criarHousehold();

    const preferencias = await obterOuCriarPreferencias(prismaTest, h.id);

    expect(preferencias.moeda).toBe("BRL");
    expect(preferencias.idioma).toBe("pt-BR");
    expect(preferencias.tema).toBe("CLARO");
  });

  it("é idempotente — não duplica a linha em leituras repetidas", async () => {
    const h = await criarHousehold();

    const primeira = await obterOuCriarPreferencias(prismaTest, h.id);
    const segunda = await obterOuCriarPreferencias(prismaTest, h.id);

    expect(segunda.id).toBe(primeira.id);
  });
});

describe("atualizarPreferencias", () => {
  it("atualiza apenas os campos informados", async () => {
    const h = await criarHousehold();
    await obterOuCriarPreferencias(prismaTest, h.id);

    const atualizado = await atualizarPreferencias(prismaTest, h.id, {
      tema: "ESCURO",
    });

    expect(atualizado.tema).toBe("ESCURO");
    expect(atualizado.moeda).toBe("BRL");
  });

  it("cria a linha se ainda não existir", async () => {
    const h = await criarHousehold();

    const atualizado = await atualizarPreferencias(prismaTest, h.id, {
      idioma: "en-US",
    });

    expect(atualizado.idioma).toBe("en-US");
  });
});
