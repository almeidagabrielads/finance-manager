import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { limparBanco, prismaTest } from "@/test/prisma";
import { SESSION_COOKIE, encryptSession } from "@/lib/auth/session";

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

let GET: typeof import("./route").GET;
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

function getRequest(cookie?: string) {
  return new NextRequest("http://localhost/api/pessoas", {
    headers: cookie ? { cookie } : {},
  });
}

function postRequest(body: unknown, cookie?: string) {
  return new NextRequest("http://localhost/api/pessoas", {
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

describe("GET /api/pessoas", () => {
  it("retorna 401 sem sessão", async () => {
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
  });

  it("lista apenas pessoas do household da sessão", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    await prismaTest.pessoa.create({
      data: { nome: "Gabi", tipo: "INDIVIDUAL", householdId: household.id },
    });
    const outraHousehold = await prismaTest.household.create({
      data: { nome: "Outra casa" },
    });
    await prismaTest.pessoa.create({
      data: {
        nome: "Intrusa",
        tipo: "INDIVIDUAL",
        householdId: outraHousehold.id,
      },
    });

    const response = await GET(getRequest(cookie));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].nome).toBe("Gabi");
  });
});

describe("POST /api/pessoas", () => {
  it("retorna 401 sem sessão", async () => {
    const response = await POST(
      postRequest({ nome: "Gabi", tipo: "INDIVIDUAL" }),
    );
    expect(response.status).toBe(401);
  });

  it("cria pessoa vinculada ao household da sessão", async () => {
    const { household, cookie } = await criarHouseholdComSessao();

    const response = await POST(
      postRequest({ nome: "Isa", tipo: "CASAL" }, cookie),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.nome).toBe("Isa");
    expect(body.householdId).toBe(household.id);
  });

  it("retorna 400 para tipo inválido", async () => {
    const { cookie } = await criarHouseholdComSessao();

    const response = await POST(
      postRequest({ nome: "Isa", tipo: "INVALIDO" }, cookie),
    );
    expect(response.status).toBe(400);
  });

  it("retorna 400 para nome vazio", async () => {
    const { cookie } = await criarHouseholdComSessao();

    const response = await POST(
      postRequest({ nome: "", tipo: "INDIVIDUAL" }, cookie),
    );
    expect(response.status).toBe(400);
  });
});
