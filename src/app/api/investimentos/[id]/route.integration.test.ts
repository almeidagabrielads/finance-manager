import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { limparBanco, prismaTest } from "@/test/prisma";
import { SESSION_COOKIE, encryptSession } from "@/lib/auth/session";

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

let GET: typeof import("./route").GET;
let PATCH: typeof import("./route").PATCH;
let DELETE: typeof import("./route").DELETE;

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

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function req(method: string, cookie?: string, body?: unknown) {
  return new NextRequest("http://localhost/api/investimentos/x", {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

beforeAll(async () => {
  ({ GET, PATCH, DELETE } = await import("./route"));
  await limparBanco();
});

afterEach(async () => {
  await limparBanco();
});

afterAll(async () => {
  await prismaTest.$disconnect();
});

describe("GET /api/investimentos/[id]", () => {
  it("retorna 401 sem sessão", async () => {
    const response = await GET(req("GET"), ctx("qualquer-id"));
    expect(response.status).toBe(401);
  });

  it("retorna 404 para investimento de outro household", async () => {
    const { cookie } = await criarHouseholdComSessao();
    const outraHousehold = await prismaTest.household.create({
      data: { nome: "Outra casa" },
    });
    const { banco, pessoa } = await criarBancoEPessoa(outraHousehold.id);
    const investimento = await prismaTest.investimento.create({
      data: {
        bancoId: banco.id,
        pessoaId: pessoa.id,
        tipo: "RENDA_FIXA",
        produto: "LCI",
        valorAtualCentavos: 500000,
        householdId: outraHousehold.id,
      },
    });

    const response = await GET(req("GET", cookie), ctx(investimento.id));
    expect(response.status).toBe(404);
  });

  it("retorna o investimento do household correto", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    const { banco, pessoa } = await criarBancoEPessoa(household.id);
    const investimento = await prismaTest.investimento.create({
      data: {
        bancoId: banco.id,
        pessoaId: pessoa.id,
        tipo: "RENDA_FIXA",
        produto: "LCI",
        valorAtualCentavos: 500000,
        householdId: household.id,
      },
    });

    const response = await GET(req("GET", cookie), ctx(investimento.id));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.valorAtualCentavos).toBe(500000);
  });
});

describe("PATCH /api/investimentos/[id]", () => {
  it("atualiza valor atual", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    const { banco, pessoa } = await criarBancoEPessoa(household.id);
    const investimento = await prismaTest.investimento.create({
      data: {
        bancoId: banco.id,
        pessoaId: pessoa.id,
        tipo: "RENDA_FIXA",
        produto: "LCI",
        valorAtualCentavos: 500000,
        householdId: household.id,
      },
    });

    const response = await PATCH(
      req("PATCH", cookie, { valorAtualCentavos: 600000 }),
      ctx(investimento.id),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.valorAtualCentavos).toBe(600000);
  });

  it("retorna 404 ao atualizar investimento de outro household", async () => {
    const { cookie } = await criarHouseholdComSessao();
    const outraHousehold = await prismaTest.household.create({
      data: { nome: "Outra casa" },
    });
    const { banco, pessoa } = await criarBancoEPessoa(outraHousehold.id);
    const investimento = await prismaTest.investimento.create({
      data: {
        bancoId: banco.id,
        pessoaId: pessoa.id,
        tipo: "RENDA_FIXA",
        produto: "LCI",
        valorAtualCentavos: 500000,
        householdId: outraHousehold.id,
      },
    });

    const response = await PATCH(
      req("PATCH", cookie, { valorAtualCentavos: 100 }),
      ctx(investimento.id),
    );
    expect(response.status).toBe(404);
  });

  it("retorna 400 para payload inválido", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    const { banco, pessoa } = await criarBancoEPessoa(household.id);
    const investimento = await prismaTest.investimento.create({
      data: {
        bancoId: banco.id,
        pessoaId: pessoa.id,
        tipo: "RENDA_FIXA",
        produto: "LCI",
        valorAtualCentavos: 500000,
        householdId: household.id,
      },
    });

    const response = await PATCH(
      req("PATCH", cookie, {
        liquidezDias: 30,
        vencimento: "2027-01-01",
      }),
      ctx(investimento.id),
    );
    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/investimentos/[id]", () => {
  it("remove investimento existente", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    const { banco, pessoa } = await criarBancoEPessoa(household.id);
    const investimento = await prismaTest.investimento.create({
      data: {
        bancoId: banco.id,
        pessoaId: pessoa.id,
        tipo: "RENDA_FIXA",
        produto: "LCI",
        valorAtualCentavos: 500000,
        householdId: household.id,
      },
    });

    const response = await DELETE(req("DELETE", cookie), ctx(investimento.id));
    expect(response.status).toBe(200);

    const restante = await prismaTest.investimento.findUnique({
      where: { id: investimento.id },
    });
    expect(restante).toBeNull();
  });

  it("retorna 404 ao remover investimento de outro household", async () => {
    const { cookie } = await criarHouseholdComSessao();
    const outraHousehold = await prismaTest.household.create({
      data: { nome: "Outra casa" },
    });
    const { banco, pessoa } = await criarBancoEPessoa(outraHousehold.id);
    const investimento = await prismaTest.investimento.create({
      data: {
        bancoId: banco.id,
        pessoaId: pessoa.id,
        tipo: "RENDA_FIXA",
        produto: "LCI",
        valorAtualCentavos: 500000,
        householdId: outraHousehold.id,
      },
    });

    const response = await DELETE(req("DELETE", cookie), ctx(investimento.id));
    expect(response.status).toBe(404);
  });
});
