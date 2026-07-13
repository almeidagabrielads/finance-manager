"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Select } from "../../components/Select";

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

const MODOS_PARCELAMENTO = [
  { value: "GRADUAL", label: "Gradual" },
  { value: "AVISTA", label: "À vista" },
  { value: "PREVISAO", label: "Previsão" },
] as const;

type Preferencias = {
  moeda: string;
  idioma: string;
  tema: string;
  modoParcelamentoPadrao: string;
};

async function parseErro(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  if (typeof body?.error === "string") return body.error;
  return "Não foi possível completar a operação.";
}

function IconeMoeda() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 10v.01" />
      <path d="M18 14v.01" />
    </svg>
  );
}

function IconeGlobo() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
    </svg>
  );
}

function IconeLua() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

function IconeParcelamento() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h.01" />
      <path d="M11 15h4" />
    </svg>
  );
}

function PreferenciaCard({
  icone,
  titulo,
  descricao,
  children,
}: {
  icone: ReactNode;
  titulo: string;
  descricao: string;
  children: ReactNode;
}) {
  return (
    <div className="gap-md border-outline-variant bg-surface-container-lowest p-lg flex items-center justify-between rounded-xl border">
      <div className="gap-md flex items-center">
        <span className="text-on-surface-variant">{icone}</span>
        <div>
          <h3 className="text-on-surface text-sm font-semibold">{titulo}</h3>
          <p className="text-on-surface-variant text-sm">{descricao}</p>
        </div>
      </div>
      {children}
    </div>
  );
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
    return <p className="text-on-surface-variant text-sm">Carregando…</p>;
  }

  return (
    <div className="gap-lg flex flex-col">
      {erro && (
        <p className="border-danger/30 bg-danger-container p-sm text-on-danger-container rounded-lg border text-sm">
          {erro}
        </p>
      )}
      {salvando ? (
        <p className="text-on-surface-variant text-xs">Salvando…</p>
      ) : (
        salvo && <p className="text-success text-xs">Preferências salvas.</p>
      )}

      <div className="gap-md flex flex-col">
        <PreferenciaCard
          icone={<IconeMoeda />}
          titulo="Moeda Principal"
          descricao="Defina a moeda padrão para seus relatórios"
        >
          <Select
            ariaLabel="Moeda principal"
            value={preferencias.moeda}
            onChange={(moeda) => salvar({ moeda })}
            options={MOEDAS.map((m) => ({ value: m.value, label: m.label }))}
          />
        </PreferenciaCard>

        <PreferenciaCard
          icone={<IconeGlobo />}
          titulo="Idioma"
          descricao="Idioma da interface do sistema"
        >
          <Select
            ariaLabel="Idioma"
            value={preferencias.idioma}
            onChange={(idioma) => salvar({ idioma })}
            options={IDIOMAS.map((i) => ({ value: i.value, label: i.label }))}
          />
        </PreferenciaCard>

        <PreferenciaCard
          icone={<IconeLua />}
          titulo="Tema do Sistema"
          descricao="Escolha entre o modo claro ou escuro"
        >
          <div className="border-outline-variant flex rounded-full border p-0.5">
            {TEMAS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => salvar({ tema: t.value })}
                className={
                  preferencias.tema === t.value
                    ? "bg-primary px-md text-on-primary rounded-full py-1 text-xs font-semibold"
                    : "px-md text-on-surface-variant hover:text-on-surface rounded-full py-1 text-xs font-semibold"
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </PreferenciaCard>

        <PreferenciaCard
          icone={<IconeParcelamento />}
          titulo="Modo de Parcelamento Padrão"
          descricao="Modo sugerido ao criar uma nova compra parcelada"
        >
          <Select
            ariaLabel="Modo de parcelamento padrão"
            value={preferencias.modoParcelamentoPadrao}
            onChange={(modoParcelamentoPadrao) =>
              salvar({ modoParcelamentoPadrao })
            }
            options={MODOS_PARCELAMENTO.map((m) => ({
              value: m.value,
              label: m.label,
            }))}
          />
        </PreferenciaCard>
      </div>
    </div>
  );
}
