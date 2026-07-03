import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { limparBanco, prismaTest } from "@/test/prisma";
import { SESSION_COOKIE, encryptSession } from "@/lib/auth/session";

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

let GET: typeof import("./route").GET;
let POST: typeof import("./route").POST;

async function criarHouseholdComSessao(nome = `Casa ${Math.random()}`) {
  const household = await prismaTest.household.create({ data: { nome } });
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
  return new NextRequest(`http://localhost/api/investimentos${query}`, {
    headers: cookie ? { cookie } : {},
  });
}

function postRequest(body: unknown, cookie?: string) {
  return new NextRequest("http://localhost/api/investimentos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  ({ GET, POST } = await import("./route"));
  await limparBanco();
});

afterEach(async () => {
  await limparBanco();
});

afterAll(async () => {
  await prismaTest.$disconnect();
});

describe("GET /api/investimentos", () => {
  it("retorna 401 sem sessão", async () => {
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
  });

  it("lista apenas investimentos do household da sessão", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    const { banco, pessoa } = await criarBancoEPessoa(household.id);
    await prismaTest.investimento.create({
      data: {
        bancoId: banco.id,
        pessoaId: pessoa.id,
        tipo: "RENDA_FIXA",
        produto: "LCI",
        valorAtualCentavos: 150000,
        householdId: household.id,
      },
    });
    const { household: outraHousehold } = await criarHouseholdComSessao();
    const outros = await criarBancoEPessoa(outraHousehold.id);
    await prismaTest.investimento.create({
      data: {
        bancoId: outros.banco.id,
        pessoaId: outros.pessoa.id,
        tipo: "RENDA_FIXA",
        produto: "LCI outra casa",
        valorAtualCentavos: 999,
        householdId: outraHousehold.id,
      },
    });

    const response = await GET(getRequest(cookie));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].valorAtualCentavos).toBe(150000);
  });

  it("filtra por tipo", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    const { banco, pessoa } = await criarBancoEPessoa(household.id);
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
    await prismaTest.investimento.create({
      data: {
        bancoId: banco.id,
        pessoaId: pessoa.id,
        tipo: "RENDA_FIXA",
        produto: "LCI",
        valorAtualCentavos: 200000,
        householdId: household.id,
      },
    });

    const response = await GET(getRequest(cookie, "?tipo=FGTS"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].produto).toBe("FGTS");
  });
});

describe("POST /api/investimentos", () => {
  it("retorna 401 sem sessão", async () => {
    const response = await POST(postRequest({}));
    expect(response.status).toBe(401);
  });

  it("cria investimento vinculado ao household da sessão", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    const { banco, pessoa } = await criarBancoEPessoa(household.id);

    const response = await POST(
      postRequest(
        {
          bancoId: banco.id,
          pessoaId: pessoa.id,
          tipo: "RENDA_FIXA",
          produto: "LCI-DI",
          valorAtualCentavos: 150000,
          liquidezDias: 30,
        },
        cookie,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.householdId).toBe(household.id);
    expect(body.liquidezDias).toBe(30);
  });

  it("retorna 400 quando vencimento e liquidezDias são informados juntos", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    const { banco, pessoa } = await criarBancoEPessoa(household.id);

    const response = await POST(
      postRequest(
        {
          bancoId: banco.id,
          pessoaId: pessoa.id,
          tipo: "RENDA_FIXA",
          produto: "LCI-DI",
          valorAtualCentavos: 150000,
          liquidezDias: 30,
          vencimento: "2027-01-01",
        },
        cookie,
      ),
    );
    expect(response.status).toBe(400);
  });

  it("retorna 404 para banco de outro household", async () => {
    const { cookie } = await criarHouseholdComSessao();
    const { household: outraHousehold } = await criarHouseholdComSessao();
    const { banco, pessoa } = await criarBancoEPessoa(outraHousehold.id);

    const response = await POST(
      postRequest(
        {
          bancoId: banco.id,
          pessoaId: pessoa.id,
          tipo: "RENDA_FIXA",
          produto: "LCI",
          valorAtualCentavos: 1000,
        },
        cookie,
      ),
    );
    expect(response.status).toBe(404);
  });
});
