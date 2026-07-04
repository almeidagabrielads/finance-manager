"use client";

import { useEffect, useState } from "react";

const MOEDAS = [
  { value: "BRL", label: "Real Brasileiro (BRL)" },
  { value: "USD", label: "Dólar Americano (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
] as const;

const IDIOMAS = [
  { value: "pt-BR", label: "Português (BR)" },
  { value: "en-US", label: "English (US)" },
  { value: "es", label: "Español" },
] as const;

const TEMAS = [
  { value: "CLARO", label: "Claro" },
  { value: "ESCURO", label: "Escuro" },
] as const;

type Preferencias = {
  moeda: string;
  idioma: string;
  tema: string;
};

async function parseErro(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  if (typeof body?.error === "string") return body.error;
  return "Não foi possível completar a operação.";
}

export function PreferenciasClient() {
  const [preferencias, setPreferencias] = useState<Preferencias | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [naoAutenticado, setNaoAutenticado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    fetch("/api/preferencias")
      .then(async (response) => {
        if (cancelado) return;
        if (response.status === 401) {
          setNaoAutenticado(true);
          return;
        }
        setPreferencias(await response.json());
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar as preferências.");
      });
    return () => {
      cancelado = true;
    };
  }, []);

  async function salvar(patch: Partial<Preferencias>) {
    if (!preferencias) return;
    setErro(null);
    setSalvo(false);
    setSalvando(true);
    const proximo = { ...preferencias, ...patch };
    setPreferencias(proximo);
    const response = await fetch("/api/preferencias", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSalvando(false);
    if (!response.ok) {
      setErro(await parseErro(response));
      return;
    }
    setSalvo(true);
  }

  if (naoAutenticado) {
    return (
      <p className="text-on-surface-variant">
        Não autenticado — faça login para gerenciar preferências.
      </p>
    );
  }

  if (!preferencias) {
    return <p className="text-sm text-on-surface-variant">Carregando…</p>;
  }

  const selectClass =
    "rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1.5";

  return (
    <div className="flex flex-col gap-lg">
      {erro && (
        <p className="rounded-lg border border-danger/30 bg-danger-container p-sm text-sm text-on-danger-container">
          {erro}
        </p>
      )}
      {salvando ? (
        <p className="text-xs text-on-surface-variant">Salvando…</p>
      ) : (
        salvo && <p className="text-xs text-success">Preferências salvas.</p>
      )}

      <div className="flex flex-col gap-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant" htmlFor="moeda">
            Moeda principal
          </label>
          <p className="text-xs text-on-surface-variant">
            Defina a moeda padrão para seus relatórios.
          </p>
          <select
            id="moeda"
            className={selectClass}
            value={preferencias.moeda}
            onChange={(e) => salvar({ moeda: e.target.value })}
          >
            {MOEDAS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant" htmlFor="idioma">
            Idioma
          </label>
          <p className="text-xs text-on-surface-variant">
            Idioma da interface do sistema.
          </p>
          <select
            id="idioma"
            className={selectClass}
            value={preferencias.idioma}
            onChange={(e) => salvar({ idioma: e.target.value })}
          >
            {IDIOMAS.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant" htmlFor="tema">
            Tema do sistema
          </label>
          <p className="text-xs text-on-surface-variant">
            Escolha entre o modo claro ou escuro.
          </p>
          <select
            id="tema"
            className={selectClass}
            value={preferencias.tema}
            onChange={(e) => salvar({ tema: e.target.value })}
          >
            {TEMAS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
