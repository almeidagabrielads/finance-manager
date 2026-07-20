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
    data: { nome: "Nubank", tipo: "CARTAO_CREDITO", householdId },
  });
  const pessoa = await prismaTest.pessoa.create({
    data: { nome: "Isa", tipo: "INDIVIDUAL", householdId },
  });
  return { banco, pessoa };
}

async function criarParcelamentoDireto(
  householdId: string,
  bancoId: string,
  pessoaId: string,
  overrides: Record<string, unknown> = {},
) {
  const parcelamento = await prismaTest.parcelamento.create({
    data: {
      householdId,
      bancoId,
      pessoaDivisaoId: pessoaId,
      pessoaPagouId: pessoaId,
      valorTotalCentavos: 120000,
      quantidadeParcelas: 12,
      dataPrimeiraParcela: new Date("2026-01-10"),
      modo: "PREVISAO",
      ...overrides,
    },
  });
  // Simula a 1ª parcela já realizada, como criarParcelamento faria de verdade.
  await prismaTest.lancamento.create({
    data: {
      householdId,
      bancoId,
      pessoaDivisaoId: pessoaId,
      pessoaPagouId: pessoaId,
      data: new Date("2026-01-10"),
      valorCentavos: 10000,
      numeroParcela: 1,
      previsto: false,
      parcelamentoId: parcelamento.id,
      tipoGasto: "VARIAVEL",
    },
  });
  return parcelamento;
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function req(method: string, cookie?: string, body?: unknown) {
  return new NextRequest("http://localhost/api/parcelamentos/x", {
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

describe("GET /api/parcelamentos/[id]", () => {
  it("retorna 401 sem sessão", async () => {
    const response = await GET(req("GET"), ctx("qualquer"));
    expect(response.status).toBe(401);
  });

  it("retorna 404 para parcelamento de outro household", async () => {
    const { cookie } = await criarHouseholdComSessao();
    const outraHousehold = await prismaTest.household.create({
      data: { nome: "Outra casa" },
    });
    const { banco, pessoa } = await criarBancoEPessoa(outraHousehold.id);
    const parcelamento = await criarParcelamentoDireto(
      outraHousehold.id,
      banco.id,
      pessoa.id,
    );

    const response = await GET(req("GET", cookie), ctx(parcelamento.id));
    expect(response.status).toBe(404);
  });

  it("retorna o parcelamento com as parcelas", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    const { banco, pessoa } = await criarBancoEPessoa(household.id);
    const parcelamento = await criarParcelamentoDireto(
      household.id,
      banco.id,
      pessoa.id,
    );

    const response = await GET(req("GET", cookie), ctx(parcelamento.id));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.id).toBe(parcelamento.id);
  });
});

describe("PATCH /api/parcelamentos/[id]", () => {
  it("atualiza metadados", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    const { banco, pessoa } = await criarBancoEPessoa(household.id);
    const parcelamento = await criarParcelamentoDireto(
      household.id,
      banco.id,
      pessoa.id,
    );

    const response = await PATCH(
      req("PATCH", cookie, { descricaoPropria: "Novo nome" }),
      ctx(parcelamento.id),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.descricaoPropria).toBe("Novo nome");
  });

  it("retorna 400 quando não encontrado", async () => {
    const { cookie } = await criarHouseholdComSessao();
    const response = await PATCH(
      req("PATCH", cookie, { descricaoPropria: "x" }),
      ctx("inexistente"),
    );
    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/parcelamentos/[id]", () => {
  it("apaga quando não há parcelas realizadas", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    const { banco, pessoa } = await criarBancoEPessoa(household.id);
    const parcelamento = await criarParcelamentoDireto(
      household.id,
      banco.id,
      pessoa.id,
    );
    // Remove a parcela realizada (previsto=false) para simular estado "só previsão".
    await prismaTest.lancamento.deleteMany({
      where: { parcelamentoId: parcelamento.id, previsto: false },
    });

    const response = await DELETE(req("DELETE", cookie), ctx(parcelamento.id));
    expect(response.status).toBe(200);
  });

  it("retorna 409 quando há parcelas realizadas", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    const { banco, pessoa } = await criarBancoEPessoa(household.id);
    const parcelamento = await criarParcelamentoDireto(
      household.id,
      banco.id,
      pessoa.id,
    );

    const response = await DELETE(req("DELETE", cookie), ctx(parcelamento.id));
    expect(response.status).toBe(409);
  });
});
