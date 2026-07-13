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

function req(cookie?: string) {
  return new NextRequest("http://localhost/api/parcelamentos/x/proxima-parcela", {
    method: "POST",
    headers: cookie ? { cookie } : {},
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

describe("POST /api/parcelamentos/[id]/proxima-parcela", () => {
  it("retorna 401 sem sessão", async () => {
    const response = await POST(req(), ctx("qualquer"));
    expect(response.status).toBe(401);
  });

  it("lança a próxima parcela em modo GRADUAL", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    const { banco, pessoa } = await criarBancoEPessoa(household.id);
    const parcelamento = await criarParcelamento(prismaTest, household.id, {
      valorParcelaCentavos: 10000,
      quantidadeParcelas: 3,
      dataPrimeiraParcela: new Date("2026-01-10"),
      modo: "GRADUAL",
      bancoId: banco.id,
      pessoaDivisaoId: pessoa.id,
      pessoaPagouId: pessoa.id,
      tipoGasto: "VARIAVEL",
    });

    const response = await POST(req(cookie), ctx(parcelamento!.id));
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.numeroParcela).toBe(2);
  });

  it("retorna 409 quando o modo não é GRADUAL", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    const { banco, pessoa } = await criarBancoEPessoa(household.id);
    const parcelamento = await criarParcelamento(prismaTest, household.id, {
      valorParcelaCentavos: 10000,
      quantidadeParcelas: 3,
      dataPrimeiraParcela: new Date("2026-01-10"),
      modo: "AVISTA",
      bancoId: banco.id,
      pessoaDivisaoId: pessoa.id,
      pessoaPagouId: pessoa.id,
      tipoGasto: "VARIAVEL",
    });

    const response = await POST(req(cookie), ctx(parcelamento!.id));
    expect(response.status).toBe(409);
  });

  it("retorna 404 quando o parcelamento não existe", async () => {
    const { cookie } = await criarHouseholdComSessao();
    const response = await POST(req(cookie), ctx("inexistente"));
    expect(response.status).toBe(404);
  });
});
