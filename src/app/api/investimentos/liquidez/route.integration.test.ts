import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { limparBanco, prismaTest } from "@/test/prisma";
import { SESSION_COOKIE, encryptSession } from "@/lib/auth/session";

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

let GET: typeof import("./route").GET;

async function criarHouseholdComSessao() {
  const household = await prismaTest.household.create({
    data: { nome: `Casa ${Math.random()}` },
  });
  const token = encryptSession({
    userId: "user-fake",
    householdId: household.id,
    expiresAt: Date.now() + 60_000,
  });
  return { household, cookie: `${SESSION_COOKIE}=${token}` };
}

async function criarBancoEPessoa(householdId: string) {
  const banco = await prismaTest.banco.create({
    data: { nome: "XP", tipo: "CORRETORA", householdId },
  });
  const pessoa = await prismaTest.pessoa.create({
    data: { nome: "Isa", tipo: "INDIVIDUAL", householdId },
  });
  return { banco, pessoa };
}

function getRequest(cookie?: string, query = "") {
  return new NextRequest(
    `http://localhost/api/investimentos/liquidez${query}`,
    { headers: cookie ? { cookie } : {} },
  );
}

beforeAll(async () => {
  ({ GET } = await import("./route"));
  await limparBanco();
});

afterEach(async () => {
  await limparBanco();
});

afterAll(async () => {
  await prismaTest.$disconnect();
});

describe("GET /api/investimentos/liquidez", () => {
  it("retorna 401 sem sessão", async () => {
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
  });

  it("agrupa investimentos do household por faixa de liquidez", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    const { banco, pessoa } = await criarBancoEPessoa(household.id);
    await prismaTest.investimento.create({
      data: {
        bancoId: banco.id,
        pessoaId: pessoa.id,
        tipo: "RENDA_FIXA",
        produto: "Poupança",
        valorAtualCentavos: 500000,
        liquidezDias: 0,
        householdId: household.id,
      },
    });
    await prismaTest.investimento.create({
      data: {
        bancoId: banco.id,
        pessoaId: pessoa.id,
        tipo: "FGTS",
        produto: "FGTS",
        valorAtualCentavos: 100000,
        householdId: household.id,
      },
    });

    const response = await GET(getRequest(cookie));
    const body = await response.json();

    expect(response.status).toBe(200);
    const imediato = body.find((g: { faixa: string }) => g.faixa === "IMEDIATO");
    const indefinido = body.find(
      (g: { faixa: string }) => g.faixa === "INDEFINIDO",
    );
    expect(imediato.totalCentavos).toBe(500000);
    expect(indefinido.totalCentavos).toBe(100000);
  });

  it("não mistura investimentos de outro household", async () => {
    const { cookie } = await criarHouseholdComSessao();
    const { household: outraHousehold } = await criarHouseholdComSessao();
    const { banco, pessoa } = await criarBancoEPessoa(outraHousehold.id);
    await prismaTest.investimento.create({
      data: {
        bancoId: banco.id,
        pessoaId: pessoa.id,
        tipo: "RENDA_FIXA",
        produto: "Outra casa",
        valorAtualCentavos: 999999,
        liquidezDias: 0,
        householdId: outraHousehold.id,
      },
    });

    const response = await GET(getRequest(cookie));
    const body = await response.json();

    for (const grupo of body) {
      expect(grupo.totalCentavos).toBe(0);
    }
  });
});
