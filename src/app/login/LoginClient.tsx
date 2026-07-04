"use client";

import { useState } from "react";

async function parseErro(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  if (typeof body?.error === "string") return body.error;
  return "Não foi possível entrar.";
}

export function LoginClient() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: senha }),
    });
    setEnviando(false);
    if (!response.ok) {
      setErro(await parseErro(response));
      return;
    }
    // Navegação completa (não client-side) para que a Nav remonte e
    // busque o usuário autenticado novamente.
    window.location.href = "/";
  }

  const inputClass =
    "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-md py-md text-sm focus:border-primary focus:outline-none";

  return (
    <form onSubmit={entrar} className="flex flex-col gap-md">
      {erro && (
        <p className="rounded-lg border border-danger/30 bg-danger-container p-sm text-sm text-on-danger-container">
          {erro}
        </p>
      )}

      <div className="flex flex-col gap-xs">
        <label className="text-xs font-semibold text-on-surface-variant" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-xs">
        <label className="text-xs font-semibold text-on-surface-variant" htmlFor="senha">
          Senha
        </label>
        <input
          id="senha"
          type="password"
          className={inputClass}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="rounded-xl bg-primary px-md py-md text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
