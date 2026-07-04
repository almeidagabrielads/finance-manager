"use client";

import { useEffect, useMemo, useState } from "react";

type Pessoa = { id: string; nome: string; tipo: string };
type SaldoDivisao = {
  pessoaAId: string;
  pessoaBId: string;
  pagouPeloOutroCentavos: Record<string, number>;
  diferencaCentavos: number;
  pessoaDevedoraId: string | null;
  valorDevidoCentavos: number;
};

function formatarData(data: Date): string {
  return data.toISOString().slice(0, 10);
}

function primeiroDiaDoMes(): string {
  const hoje = new Date();
  return formatarData(new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1)));
}

function ultimoDiaDoMes(): string {
  const hoje = new Date();
  return formatarData(
    new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 0)),
  );
}

function centavosParaReais(valor: number): string {
  return (valor / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function DivisaoClient() {
  const [dataInicio, setDataInicio] = useState(primeiroDiaDoMes());
  const [dataFim, setDataFim] = useState(ultimoDiaDoMes());
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [saldo, setSaldo] = useState<SaldoDivisao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [naoAutenticado, setNaoAutenticado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    fetch("/api/pessoas")
      .then(async (response) => {
        if (cancelado) return;
        if (response.status === 401) {
          setNaoAutenticado(true);
          return;
        }
        setPessoas(await response.json());
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar as pessoas.");
      });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/relatorios/divisao?dataInicio=${dataInicio}&dataFim=${dataFim}`)
      .then(async (response) => {
        if (cancelado) return;
        if (response.status === 401) {
          setNaoAutenticado(true);
          return;
        }
        setNaoAutenticado(false);
        const body = await response.json();
        if (!response.ok) {
          setErro(body.error ?? "Não foi possível calcular a divisão.");
          setSaldo(null);
          return;
        }
        setErro(null);
        setSaldo(body);
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível calcular a divisão.");
      });
    return () => {
      cancelado = true;
    };
  }, [dataInicio, dataFim]);

  const nomePorId = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const p of pessoas) mapa.set(p.id, p.nome);
    return mapa;
  }, [pessoas]);

  function nome(id: string | null): string {
    if (!id) return "";
    return nomePorId.get(id) ?? id;
  }

  if (naoAutenticado) {
    return (
      <p className="text-on-surface-variant">
        Não autenticado — faça login para ver a divisão de despesas.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      {erro && (
        <p className="rounded-lg border border-danger/30 bg-danger-container p-sm text-sm text-on-danger-container">
          {erro}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-md">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant" htmlFor="dataInicio">
            De
          </label>
          <input
            id="dataInicio"
            type="date"
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant" htmlFor="dataFim">
            Até
          </label>
          <input
            id="dataFim"
            type="date"
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </div>
      </div>

      {saldo && (
        <div className="flex flex-col gap-md">
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg text-center">
            {saldo.pessoaDevedoraId === null ? (
              <p className="text-lg font-semibold text-on-surface">Contas quitadas 🎉</p>
            ) : (
              <p className="text-lg font-semibold text-on-surface">
                {nome(saldo.pessoaDevedoraId)} deve{" "}
                {centavosParaReais(saldo.valorDevidoCentavos)} para{" "}
                {nome(
                  saldo.pessoaDevedoraId === saldo.pessoaAId
                    ? saldo.pessoaBId
                    : saldo.pessoaAId,
                )}
              </p>
            )}
          </div>

          <table className="min-w-full border-collapse text-sm">
            <tbody>
              <tr className="border-b border-outline-variant/60">
                <td className="p-2">
                  Quanto {nome(saldo.pessoaAId)} pagou pela{" "}
                  {nome(saldo.pessoaBId)}
                </td>
                <td className="p-2 text-right font-medium">
                  {centavosParaReais(
                    saldo.pagouPeloOutroCentavos[saldo.pessoaAId] ?? 0,
                  )}
                </td>
              </tr>
              <tr className="border-b border-outline-variant/60">
                <td className="p-2">
                  Quanto {nome(saldo.pessoaBId)} pagou pela{" "}
                  {nome(saldo.pessoaAId)}
                </td>
                <td className="p-2 text-right font-medium">
                  {centavosParaReais(
                    saldo.pagouPeloOutroCentavos[saldo.pessoaBId] ?? 0,
                  )}
                </td>
              </tr>
              <tr className="bg-surface-container-low font-medium">
                <td className="p-2">Diferença</td>
                <td className="p-2 text-right">
                  {centavosParaReais(saldo.diferencaCentavos)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
