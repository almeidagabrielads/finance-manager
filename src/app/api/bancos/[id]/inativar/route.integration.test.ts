import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { limparBanco, prismaTest } from "@/test/prisma";
import { SESSION_COOKIE, encryptSession } from "@/lib/auth/session";

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

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function req(cookie?: string) {
  return new NextRequest("http://localhost/api/bancos/x/inativar", {
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

describe("POST /api/bancos/[id]/inativar", () => {
  it("retorna 401 sem sessão", async () => {
    const response = await POST(req(), ctx("qualquer-id"));
    expect(response.status).toBe(401);
  });

  it("inativa o banco sem excluí-lo fisicamente", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    const banco = await prismaTest.banco.create({
      data: {
        nome: "Itaú Crédito",
        tipo: "CARTAO_CREDITO",
        householdId: household.id,
      },
    });

    const response = await POST(req(cookie), ctx(banco.id));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ativo).toBe(false);

    const aindaExiste = await prismaTest.banco.findUnique({
      where: { id: banco.id },
    });
    expect(aindaExiste).not.toBeNull();
  });

  it("retorna 404 para banco de outro household", async () => {
    const { cookie } = await criarHouseholdComSessao();
    const outraHousehold = await prismaTest.household.create({
      data: { nome: "Outra casa" },
    });
    const banco = await prismaTest.banco.create({
      data: { nome: "Intruso", tipo: "OUTRO", householdId: outraHousehold.id },
    });

    const response = await POST(req(cookie), ctx(banco.id));
    expect(response.status).toBe(404);
  });
});
