import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { limparBanco, prismaTest } from "@/test/prisma";

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

let POST: typeof import("./route").POST;

function postJson(body: unknown) {
  return POST(
    new Request("http://localhost/api/auth/cadastro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
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

describe("POST /api/auth/cadastro", () => {
  it("cria household e usuário, e seta cookie de sessão", async () => {
    const response = await postJson({
      household: "Casa da Isa & Gabi",
      nome: "Gabi",
      email: "gabi@example.com",
      password: "senha-forte-123",
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.email).toBe("gabi@example.com");
    expect(body.passwordHash).toBeUndefined();

    const cookie = response.cookies.get("session");
    expect(cookie?.value).toBeTruthy();

    const household = await prismaTest.household.findUnique({
      where: { nome: "Casa da Isa & Gabi" },
    });
    expect(household).not.toBeNull();
  });

  it("rejeita e-mail já cadastrado", async () => {
    await postJson({
      household: "Casa 1",
      nome: "Gabi",
      email: "gabi@example.com",
      password: "senha-forte-123",
    });

    const response = await postJson({
      household: "Casa 2",
      nome: "Isa",
      email: "gabi@example.com",
      password: "outra-senha-123",
    });

    expect(response.status).toBe(409);
  });

  it("rejeita nome de casa já existente", async () => {
    await postJson({
      household: "Casa da Isa & Gabi",
      nome: "Gabi",
      email: "gabi@example.com",
      password: "senha-forte-123",
    });

    const response = await postJson({
      household: "Casa da Isa & Gabi",
      nome: "Isa",
      email: "isa@example.com",
      password: "outra-senha-123",
    });

    expect(response.status).toBe(409);
  });

  it("rejeita senha curta", async () => {
    const response = await postJson({
      household: "Casa da Isa & Gabi",
      nome: "Gabi",
      email: "gabi@example.com",
      password: "curta",
    });

    expect(response.status).toBe(400);
  });

  it("rejeita corpo inválido", async () => {
    const response = await postJson({ email: "nao-e-email" });
    expect(response.status).toBe(400);
  });
});
