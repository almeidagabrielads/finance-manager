import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/auth/logout", () => {
  it("limpa o cookie de sessão", async () => {
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true });

    const cookie = response.cookies.get("session");
    expect(cookie?.value).toBe("");
  });
});
