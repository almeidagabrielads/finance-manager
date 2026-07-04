import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { limparBanco, prismaTest } from "@/test/prisma";
import { SESSION_COOKIE, encryptSession } from "@/lib/auth/session";

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

let GET: typeof import("./route").GET;
let PATCH: typeof import("./route").PATCH;

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

function getRequest(cookie?: string) {
  return new NextRequest("http://localhost/api/preferencias", {
    headers: cookie ? { cookie } : {},
  });
}

function patchRequest(body: unknown, cookie?: string) {
  return new NextRequest("http://localhost/api/preferencias", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  ({ GET, PATCH } = await import("./route"));
  await limparBanco();
});

afterEach(async () => {
  await limparBanco();
});

afterAll(async () => {
  await prismaTest.$disconnect();
});

describe("GET /api/preferencias", () => {
  it("retorna 401 sem sessão", async () => {
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
  });

  it("retorna os padrões na primeira leitura", async () => {
    const { cookie } = await criarHouseholdComSessao();

    const response = await GET(getRequest(cookie));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.moeda).toBe("BRL");
    expect(body.tema).toBe("CLARO");
  });
});

describe("PATCH /api/preferencias", () => {
  it("retorna 401 sem sessão", async () => {
    const response = await PATCH(patchRequest({ tema: "ESCURO" }));
    expect(response.status).toBe(401);
  });

  it("atualiza as preferências do household da sessão", async () => {
    const { cookie } = await criarHouseholdComSessao();

    const response = await PATCH(
      patchRequest({ moeda: "USD", tema: "ESCURO" }, cookie),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.moeda).toBe("USD");
    expect(body.tema).toBe("ESCURO");
  });

  it("retorna 400 para valor inválido", async () => {
    const { cookie } = await criarHouseholdComSessao();

    const response = await PATCH(patchRequest({ moeda: "INVALIDO" }, cookie));
    expect(response.status).toBe(400);
  });
});
