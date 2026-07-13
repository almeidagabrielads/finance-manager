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
    data: { nome: "Nubank", tipo: "CARTAO_CREDITO", householdId },
  });
  const pessoa = await prismaTest.pessoa.create({
    data: { nome: "Isa", tipo: "INDIVIDUAL", householdId },
  });
  return { banco, pessoa };
}

function getRequest(cookie?: string, query = "") {
  return new NextRequest(`http://localhost/api/parcelamentos${query}`, {
    headers: cookie ? { cookie } : {},
  });
}

function postRequest(body: unknown, cookie?: string) {
  return new NextRequest("http://localhost/api/parcelamentos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

function inputBase(overrides: Record<string, unknown> = {}) {
  return {
    descricaoPropria: "Compra parcelada",
    valorParcelaCentavos: 10000,
    quantidadeParcelas: 12,
    dataPrimeiraParcela: "2026-01-10",
    modo: "GRADUAL",
    tipoGasto: "VARIAVEL",
    ...overrides,
  };
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

describe("GET /api/parcelamentos", () => {
  it("retorna 401 sem sessão", async () => {
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
  });

  it("lista apenas parcelamentos abertos do household da sessão", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    const { banco, pessoa } = await criarBancoEPessoa(household.id);
    await POST(
      postRequest(
        inputBase({
          bancoId: banco.id,
          pessoaDivisaoId: pessoa.id,
          pessoaPagouId: pessoa.id,
        }),
        cookie,
      ),
    );

    const { household: outraHousehold } = await criarHouseholdComSessao();
    const outros = await criarBancoEPessoa(outraHousehold.id);
    await prismaTest.parcelamento.create({
      data: {
        householdId: outraHousehold.id,
        bancoId: outros.banco.id,
        pessoaDivisaoId: outros.pessoa.id,
        pessoaPagouId: outros.pessoa.id,
        valorTotalCentavos: 5000,
        quantidadeParcelas: 5,
        dataPrimeiraParcela: new Date("2026-01-01"),
        modo: "GRADUAL",
      },
    });

    const response = await GET(getRequest(cookie));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].householdId).toBe(household.id);
  });
});

describe("POST /api/parcelamentos", () => {
  it("retorna 401 sem sessão", async () => {
    const response = await POST(postRequest({}));
    expect(response.status).toBe(401);
  });

  it("retorna 400 com corpo inválido", async () => {
    const { cookie } = await criarHouseholdComSessao();
    const response = await POST(postRequest({}, cookie));
    expect(response.status).toBe(400);
  });

  it("cria parcelamento e as parcelas conforme o modo", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    const { banco, pessoa } = await criarBancoEPessoa(household.id);

    const response = await POST(
      postRequest(
        inputBase({
          bancoId: banco.id,
          pessoaDivisaoId: pessoa.id,
          pessoaPagouId: pessoa.id,
          modo: "PREVISAO",
          quantidadeParcelas: 3,
        }),
        cookie,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.householdId).toBe(household.id);
    expect(body.valorTotalCentavos).toBe(30000);
    expect(body.lancamentos).toHaveLength(3);
  });

  it("retorna 400 para banco de outro household", async () => {
    const { cookie } = await criarHouseholdComSessao();
    const { household: outraHousehold } = await criarHouseholdComSessao();
    const { banco, pessoa } = await criarBancoEPessoa(outraHousehold.id);

    const response = await POST(
      postRequest(
        inputBase({
          bancoId: banco.id,
          pessoaDivisaoId: pessoa.id,
          pessoaPagouId: pessoa.id,
        }),
        cookie,
      ),
    );
    expect(response.status).toBe(400);
  });
});
