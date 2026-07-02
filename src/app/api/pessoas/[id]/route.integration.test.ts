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

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function req(method: string, cookie?: string, body?: unknown) {
  return new NextRequest("http://localhost/api/pessoas/x", {
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

describe("GET /api/pessoas/[id]", () => {
  it("retorna 401 sem sessão", async () => {
    const response = await GET(req("GET"), ctx("qualquer-id"));
    expect(response.status).toBe(401);
  });

  it("retorna 404 para pessoa de outro household", async () => {
    const { cookie } = await criarHouseholdComSessao();
    const outraHousehold = await prismaTest.household.create({
      data: { nome: "Outra casa" },
    });
    const pessoa = await prismaTest.pessoa.create({
      data: {
        nome: "Intrusa",
        tipo: "INDIVIDUAL",
        householdId: outraHousehold.id,
      },
    });

    const response = await GET(req("GET", cookie), ctx(pessoa.id));
    expect(response.status).toBe(404);
  });

  it("retorna a pessoa do household correto", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    const pessoa = await prismaTest.pessoa.create({
      data: { nome: "Gabi", tipo: "INDIVIDUAL", householdId: household.id },
    });

    const response = await GET(req("GET", cookie), ctx(pessoa.id));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.nome).toBe("Gabi");
  });
});

describe("PATCH /api/pessoas/[id]", () => {
  it("atualiza pessoa existente", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    const pessoa = await prismaTest.pessoa.create({
      data: { nome: "Gabi", tipo: "INDIVIDUAL", householdId: household.id },
    });

    const response = await PATCH(
      req("PATCH", cookie, { tipo: "CASAL" }),
      ctx(pessoa.id),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tipo).toBe("CASAL");
  });

  it("retorna 404 ao atualizar pessoa de outro household", async () => {
    const { cookie } = await criarHouseholdComSessao();
    const outraHousehold = await prismaTest.household.create({
      data: { nome: "Outra casa" },
    });
    const pessoa = await prismaTest.pessoa.create({
      data: {
        nome: "Intrusa",
        tipo: "INDIVIDUAL",
        householdId: outraHousehold.id,
      },
    });

    const response = await PATCH(
      req("PATCH", cookie, { tipo: "CASAL" }),
      ctx(pessoa.id),
    );
    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/pessoas/[id]", () => {
  it("remove pessoa existente", async () => {
    const { household, cookie } = await criarHouseholdComSessao();
    const pessoa = await prismaTest.pessoa.create({
      data: { nome: "Gabi", tipo: "INDIVIDUAL", householdId: household.id },
    });

    const response = await DELETE(req("DELETE", cookie), ctx(pessoa.id));
    expect(response.status).toBe(200);

    const restante = await prismaTest.pessoa.findUnique({
      where: { id: pessoa.id },
    });
    expect(restante).toBeNull();
  });

  it("retorna 404 ao remover pessoa de outro household", async () => {
    const { cookie } = await criarHouseholdComSessao();
    const outraHousehold = await prismaTest.household.create({
      data: { nome: "Outra casa" },
    });
    const pessoa = await prismaTest.pessoa.create({
      data: {
        nome: "Intrusa",
        tipo: "INDIVIDUAL",
        householdId: outraHousehold.id,
      },
    });

    const response = await DELETE(req("DELETE", cookie), ctx(pessoa.id));
    expect(response.status).toBe(404);

    const aindaExiste = await prismaTest.pessoa.findUnique({
      where: { id: pessoa.id },
    });
    expect(aindaExiste).not.toBeNull();
  });
});
