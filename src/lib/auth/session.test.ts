import { beforeAll, describe, expect, it } from "vitest";
import { decryptSession, encryptSession } from "./session";

beforeAll(() => {
  process.env.AUTH_SECRET = "segredo-de-teste-nao-usar-em-producao";
});

describe("encryptSession / decryptSession", () => {
  it("decodifica um payload válido", () => {
    const token = encryptSession({
      userId: "user-1",
      householdId: "household-1",
      expiresAt: Date.now() + 60_000,
    });

    const payload = decryptSession(token);
    expect(payload).toMatchObject({
      userId: "user-1",
      householdId: "household-1",
    });
  });

  it("rejeita token expirado", () => {
    const token = encryptSession({
      userId: "user-1",
      householdId: "household-1",
      expiresAt: Date.now() - 1000,
    });

    expect(decryptSession(token)).toBeNull();
  });

  it("rejeita token com assinatura adulterada", () => {
    const token = encryptSession({
      userId: "user-1",
      householdId: "household-1",
      expiresAt: Date.now() + 60_000,
    });
    const [body] = token.split(".");
    const tampered = `${body}.assinatura-invalida`;

    expect(decryptSession(tampered)).toBeNull();
  });

  it("rejeita token com payload adulterado", () => {
    const token = encryptSession({
      userId: "user-1",
      householdId: "household-1",
      expiresAt: Date.now() + 60_000,
    });
    const [, signature] = token.split(".");
    const fakeBody = Buffer.from(
      JSON.stringify({
        userId: "outro-user",
        householdId: "household-1",
        expiresAt: Date.now() + 60_000,
      }),
    ).toString("base64url");

    expect(decryptSession(`${fakeBody}.${signature}`)).toBeNull();
  });

  it("retorna null para token indefinido", () => {
    expect(decryptSession(undefined)).toBeNull();
  });

  it("retorna null para token malformado", () => {
    expect(decryptSession("token-sem-ponto")).toBeNull();
  });
});
