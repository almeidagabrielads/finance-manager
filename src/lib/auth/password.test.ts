import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("hashPassword / verifyPassword", () => {
  it("gera hash diferente do texto original", async () => {
    const hash = await hashPassword("minhaSenha123");
    expect(hash).not.toBe("minhaSenha123");
    expect(hash).toContain(":");
  });

  it("valida senha correta", async () => {
    const hash = await hashPassword("minhaSenha123");
    await expect(verifyPassword("minhaSenha123", hash)).resolves.toBe(true);
  });

  it("rejeita senha incorreta", async () => {
    const hash = await hashPassword("minhaSenha123");
    await expect(verifyPassword("senhaErrada", hash)).resolves.toBe(false);
  });

  it("gera hashes diferentes para a mesma senha (salt aleatório)", async () => {
    const hash1 = await hashPassword("minhaSenha123");
    const hash2 = await hashPassword("minhaSenha123");
    expect(hash1).not.toBe(hash2);
  });

  it("rejeita hash malformado", async () => {
    await expect(verifyPassword("qualquer", "hash-invalido")).resolves.toBe(
      false,
    );
  });
});
