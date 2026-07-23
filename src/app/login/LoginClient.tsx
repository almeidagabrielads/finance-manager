"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

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
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
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
