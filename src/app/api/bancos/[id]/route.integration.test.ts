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

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function req(method: string, cookie?: string, body?: unknown) {
  return new NextRequest("http://localhost/api/bancos/x", {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
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

describe("GET /api/bancos/[id]", () => {
  it("retorna 401 sem sessão", async () => {
    const response = await GET(req("GET"), ctx("qualquer-id"));
    expect(response.status).toBe(401);
  });

  it("retorna 404 para banco de outro household", async () => {
    const { cookie } = await criarHouseholdComSessao();
    const outraHousehold = await prismaTest.household.create({
      data: { nome: "Outra casa" },
    });
    const banco = await prismaTest.banco.create({
      data: { nome: "Intruso", tipo: "OUTRO", householdId: outraHousehold.id },
    });

    const response = await GET(req("GET", cookie), ctx(banco.id));
    expect(response.status).toBe(404);
  });

  it("retorna o banco do household correto", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    const banco = await prismaTest.banco.create({
      data: {
        nome: "Itaú Crédito",
        tipo: "CARTAO_CREDITO",
        householdId: household.id,
      },
    });

    const response = await GET(req("GET", cookie), ctx(banco.id));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.nome).toBe("Itaú Crédito");
  });
});

describe("PATCH /api/bancos/[id]", () => {
  it("atualiza nome e tipo", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    const banco = await prismaTest.banco.create({
      data: {
        nome: "Itaú Crédito",
        tipo: "CARTAO_CREDITO",
        householdId: household.id,
      },
    });

    const response = await PATCH(
      req("PATCH", cookie, { tipo: "CONTA_CORRENTE" }),
      ctx(banco.id),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tipo).toBe("CONTA_CORRENTE");
  });

  it("retorna 404 ao atualizar banco de outro household", async () => {
    const { cookie } = await criarHouseholdComSessao();
    const outraHousehold = await prismaTest.household.create({
      data: { nome: "Outra casa" },
    });
    const banco = await prismaTest.banco.create({
      data: { nome: "Intruso", tipo: "OUTRO", householdId: outraHousehold.id },
    });

    const response = await PATCH(
      req("PATCH", cookie, { nome: "Invasora" }),
      ctx(banco.id),
    );
    expect(response.status).toBe(404);
  });

  it("retorna 400 para tipo inválido", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    const banco = await prismaTest.banco.create({
      data: {
        nome: "Itaú Crédito",
        tipo: "CARTAO_CREDITO",
        householdId: household.id,
      },
    });

    const response = await PATCH(
      req("PATCH", cookie, { tipo: "INVALIDO" }),
      ctx(banco.id),
    );
    expect(response.status).toBe(400);
  });
});
