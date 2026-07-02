import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { limparBanco, prismaTest } from "@/test/prisma";
import { hashPassword } from "@/lib/auth/password";
import { SESSION_COOKIE, encryptSession } from "@/lib/auth/session";

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

let GET: typeof import("./route").GET;

function requestWithCookie(cookie?: string) {
  return new NextRequest("http://localhost/api/auth/me", {
    headers: cookie ? { cookie: `${SESSION_COOKIE}=${cookie}` } : {},
  });
}

async function criarUsuario() {
  const household = await prismaTest.household.create({
    data: { nome: "Isa & Gabi" },
  });
  const passwordHash = await hashPassword("senha-123");
  return prismaTest.user.create({
    data: {
      email: "gabi@example.com",
      nome: "Gabi",
      passwordHash,
      householdId: household.id,
    },
  });
}

beforeAll(async () => {
  ({ GET } = await import("./route"));
  await limparBanco();
});

afterEach(async () => {
  await limparBanco();
});

afterAll(async () => {
  await prismaTest.$disconnect();
});

describe("GET /api/auth/me (rota protegida)", () => {
  it("retorna 401 sem cookie de sessão", async () => {
    const response = await GET(requestWithCookie());
    expect(response.status).toBe(401);
  });

  it("retorna 401 com cookie de sessão inválido", async () => {
    const response = await GET(requestWithCookie("token-invalido"));
    expect(response.status).toBe(401);
  });

  it("retorna os dados do usuário autenticado", async () => {
    const user = await criarUsuario();
    const token = encryptSession({
      userId: user.id,
      householdId: user.householdId,
      expiresAt: Date.now() + 60_000,
    });

    const response = await GET(requestWithCookie(token));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.email).toBe("gabi@example.com");
  });
});
