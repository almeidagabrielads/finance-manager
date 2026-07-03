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

  return (
    <form onSubmit={entrar} className="flex flex-col gap-3">
      {erro && (
        <p className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="senha">
          Senha
        </label>
        <input
          id="senha"
          type="password"
          className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
