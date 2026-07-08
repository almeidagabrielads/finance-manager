"use client";

import { useEffect, useRef, useState } from "react";

const ATRASO_AUTOSAVE_MS = 800;

type PosicaoMensal = {
  investimentoId: string;
  mes: string;
  valorCentavos: number;
};

const NOMES_MES_ABREV = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function centavosParaReais(valor: number): string {
  return (valor / 100).toFixed(2);
}

function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function reaisParaCentavos(valor: string): number {
  // Aceita tanto "1500,30" quanto "1.500,30" (separador de milhar opcional).
  const limpo = valor
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const n = Number(limpo);
  return Math.round(n * 100);
}

async function parseErro(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  if (typeof body?.error === "string") return body.error;
  return "Não foi possível salvar a posição.";
}

function CampoValorMensal({
  valorCentavos,
  disabled,
  onSalvar,
}: {
  valorCentavos: number | undefined;
  disabled: boolean;
  onSalvar: (novosCentavos: number | null) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function limparAutosave() {
    if (autosaveRef.current) {
      clearTimeout(autosaveRef.current);
      autosaveRef.current = null;
    }
  }

  // Salva mesmo sem o campo perder o foco — protege contra perda de dados se
  // a pessoa recarregar a página logo após digitar, sem clicar para fora.
  useEffect(() => () => limparAutosave(), []);

  function tentarSalvar(bruto: string) {
    const limpo = bruto.trim();
    if (limpo === "") {
      if (valorCentavos !== undefined) onSalvar(null);
      return;
    }
    const novosCentavos = reaisParaCentavos(limpo);
    if (!Number.isFinite(novosCentavos)) return;
    if (novosCentavos !== valorCentavos) onSalvar(novosCentavos);
  }

  function aoFocar() {
    setTexto(
      valorCentavos !== undefined ? centavosParaReais(valorCentavos) : "",
    );
    setEditando(true);
  }

  function aoMudar(novoTexto: string) {
    setTexto(novoTexto);
    limparAutosave();
    autosaveRef.current = setTimeout(
      () => tentarSalvar(novoTexto),
      ATRASO_AUTOSAVE_MS,
    );
  }

  function aoDesfocar() {
    limparAutosave();
    setEditando(false);
    tentarSalvar(texto);
  }

  const valorExibido = editando
    ? texto
    : valorCentavos !== undefined
      ? formatarReais(valorCentavos)
      : "";

  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder="—"
      value={valorExibido}
      onFocus={aoFocar}
      onChange={(e) => aoMudar(e.target.value)}
      onBlur={aoDesfocar}
      disabled={disabled}
      className="border-outline-variant bg-surface-container-lowest px-sm focus:border-primary w-full rounded-lg border py-1.5 text-right text-sm focus:outline-none disabled:opacity-50"
    />
  );
}

export function PosicaoMensalInline({
  investimentoId,
  ano,
  posicoes,
  onAlterado,
}: {
  investimentoId: string;
  ano: number;
  posicoes: PosicaoMensal[];
  onAlterado: () => void;
}) {
  const [mesSalvando, setMesSalvando] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const mapaPosicoes = new Map<number, number>();
  for (const p of posicoes) {
    if (p.investimentoId !== investimentoId) continue;
    mapaPosicoes.set(new Date(p.mes).getUTCMonth(), p.valorCentavos);
  }

  async function salvar(mesIdx: number, novosCentavos: number | null) {
    const mes = `${ano}-${String(mesIdx + 1).padStart(2, "0")}-01`;
    setMesSalvando(mesIdx);
    setErro(null);
    try {
      const response =
        novosCentavos === null
          ? await fetch("/api/investimentos/posicoes", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ investimentoId, mes }),
            })
          : await fetch("/api/investimentos/posicoes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                investimentoId,
                mes,
                valorCentavos: novosCentavos,
              }),
            });
      if (!response.ok) {
        setErro(await parseErro(response));
        return;
      }
      onAlterado();
    } finally {
      setMesSalvando(null);
    }
  }

  return (
    <div className="gap-sm p-md flex flex-col pt-0">
      <p className="text-on-surface-variant text-xs">
        Posição em {ano}, mês a mês — usada para acompanhar a evolução real
        deste produto.
      </p>
      {erro && (
        <p className="border-danger/30 bg-danger-container p-sm text-on-danger-container rounded-lg border text-sm">
          {erro}
        </p>
      )}
      <div className="gap-sm grid grid-cols-6">
        {NOMES_MES_ABREV.map((nome, mesIdx) => {
          const valorCentavos = mapaPosicoes.get(mesIdx);
          return (
            <label key={nome} className="flex flex-col gap-1">
              <span className="text-on-surface-variant text-xs font-semibold">
                {nome}
              </span>
              <CampoValorMensal
                valorCentavos={valorCentavos}
                disabled={mesSalvando === mesIdx}
                onSalvar={(novosCentavos) => salvar(mesIdx, novosCentavos)}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
