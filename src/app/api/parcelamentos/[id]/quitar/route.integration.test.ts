import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { limparBanco, prismaTest } from "@/test/prisma";
import { SESSION_COOKIE, encryptSession } from "@/lib/auth/session";
import { criarParcelamento } from "@/lib/domain/parcelamentos";

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

let POST: typeof import("./route").POST;

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

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function req(cookie?: string, body?: unknown) {
  return new NextRequest("http://localhost/api/parcelamentos/x/quitar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

beforeAll(async () => {
  ({ POST } = await import("./route"));
  await limparBanco();
});

afterEach(async () => {
  await limparBanco();
});

afterAll(async () => {
  await prismaTest.$disconnect();
});

describe("POST /api/parcelamentos/[id]/quitar", () => {
  it("retorna 401 sem sessão", async () => {
    const response = await POST(req(undefined, {}), ctx("qualquer"));
    expect(response.status).toBe(401);
  });

  it("quita antecipadamente com desconto", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    const { banco, pessoa } = await criarBancoEPessoa(household.id);
    const parcelamento = await criarParcelamento(prismaTest, household.id, {
      valorParcelaCentavos: 10000,
      quantidadeParcelas: 12,
      dataPrimeiraParcela: new Date("2026-01-10"),
      modo: "GRADUAL",
      bancoId: banco.id,
      pessoaDivisaoId: pessoa.id,
      pessoaPagouId: pessoa.id,
      tipoGasto: "VARIAVEL",
    });

    const response = await POST(
      req(cookie, { descontoCentavos: 5000 }),
      ctx(parcelamento!.id),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.lancamentoQuitacao.valorCentavos).toBe(105000);
    expect(body.parcelamento.quitadoEm).not.toBeNull();
  });

  it("retorna 409 se já estiver quitado", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    const { banco, pessoa } = await criarBancoEPessoa(household.id);
    const parcelamento = await criarParcelamento(prismaTest, household.id, {
      valorParcelaCentavos: 10000,
      quantidadeParcelas: 2,
      dataPrimeiraParcela: new Date("2026-01-10"),
      modo: "GRADUAL",
      bancoId: banco.id,
      pessoaDivisaoId: pessoa.id,
      pessoaPagouId: pessoa.id,
      tipoGasto: "VARIAVEL",
    });
    await POST(req(cookie, { descontoCentavos: 0 }), ctx(parcelamento!.id));

    const response = await POST(
      req(cookie, { descontoCentavos: 0 }),
      ctx(parcelamento!.id),
    );
    expect(response.status).toBe(409);
  });

  it("retorna 404 quando o parcelamento não existe", async () => {
    const { cookie } = await criarHouseholdComSessao();
    const response = await POST(req(cookie, {}), ctx("inexistente"));
    expect(response.status).toBe(404);
  });
});
