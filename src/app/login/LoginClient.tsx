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
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [lembrar, setLembrar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: senha, lembrar }),
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
    <form onSubmit={entrar} className="gap-md flex flex-col">
      {erro && (
        <p className="border-danger/30 bg-danger-container p-sm text-on-danger-container rounded-lg border text-sm">
          {erro}
        </p>
      )}

      <div className="gap-xs flex flex-col">
        <label
          className="text-on-surface-variant text-xs font-semibold"
          htmlFor="email"
        >
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

      <div className="gap-xs flex flex-col">
        <label
          className="text-on-surface-variant text-xs font-semibold"
          htmlFor="senha"
        >
          Senha
        </label>
        <div className="relative">
          <input
            id="senha"
            type={mostrarSenha ? "text" : "password"}
            className={`${inputClass} pr-10`}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setMostrarSenha((v) => !v)}
            aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
            className="px-sm text-on-surface-variant absolute inset-y-0 right-0 flex items-center"
          >
            {mostrarSenha ? (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a2 2 0 0 0 2.83 2.83" />
                <path d="M9.5 4.6A9.8 9.8 0 0 1 12 4.5c5 0 9 3.5 10.5 7.5a11.7 11.7 0 0 1-2.9 4" />
                <path d="M6.4 6.4A11.7 11.7 0 0 0 1.5 12c1.5 4 5.5 7.5 10.5 7.5 1.4 0 2.7-.27 3.9-.75" />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1.5 12c1.5-4 5.5-7.5 10.5-7.5s9 3.5 10.5 7.5c-1.5 4-5.5 7.5-10.5 7.5S3 16 1.5 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <label className="gap-sm text-on-surface-variant flex items-center text-sm">
        <input
          type="checkbox"
          checked={lembrar}
          onChange={(e) => setLembrar(e.target.checked)}
          className="border-outline-variant h-4 w-4 rounded"
        />
        Lembrar de mim
      </label>

      <button
        type="submit"
        disabled={enviando}
        className="bg-primary px-md py-md text-on-primary rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
