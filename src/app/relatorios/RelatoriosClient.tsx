"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Categoria = { id: string; nome: string };
type ResumoCategoria = {
  categoriaId: string;
  totalCentavos: number;
  percentualDoTotal: number;
  mediaMensalCentavos: number;
};

function centavosParaReais(valor: number): string {
  return (valor / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function RelatoriosClient() {
  const anoAtual = new Date().getUTCFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [resumo, setResumo] = useState<ResumoCategoria[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [naoAutenticado, setNaoAutenticado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    fetch("/api/categorias")
      .then(async (response) => {
        if (cancelado) return;
        if (response.status === 401) {
          setNaoAutenticado(true);
          return;
        }
        setCategorias(await response.json());
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar as categorias.");
      });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/relatorios/resumo-categorias?ano=${ano}`)
      .then(async (response) => {
        if (cancelado) return;
        if (response.status === 401) {
          setNaoAutenticado(true);
          return;
        }
        setNaoAutenticado(false);
        setResumo(await response.json());
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar o resumo por categoria.");
      });
    return () => {
      cancelado = true;
    };
  }, [ano]);

  if (naoAutenticado) {
    return (
      <p className="text-on-surface-variant">
        Não autenticado — faça login para ver os relatórios.
      </p>
    );
  }

  const nomeCategoria = (id: string) =>
    categorias.find((c) => c.id === id)?.nome ?? "—";

  const cardClass =
    "flex flex-col gap-1 rounded-xl border border-outline-variant bg-surface-container-lowest p-lg transition-colors hover:border-primary";

  return (
    <div className="flex flex-col gap-xl">
      {erro && (
        <p className="rounded-lg border border-danger/30 bg-danger-container p-sm text-sm text-on-danger-container">
          {erro}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-on-surface-variant" htmlFor="ano">
          Ano
        </label>
        <input
          id="ano"
          type="number"
          className="w-24 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1"
          value={ano}
          onChange={(e) => setAno(Number(e.target.value))}
        />
      </div>

      <section className="flex flex-col gap-sm">
        <h2 className="text-lg font-semibold text-on-surface">Tipos de relatório</h2>
        <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
          <Link href="/relatorio-anual" className={cardClass}>
            <h3 className="text-base font-semibold text-on-surface">Relatório anual</h3>
            <p className="text-sm text-on-surface-variant">
              Saldo, planejado vs. real, evolução patrimonial e divisão do ano.
            </p>
          </Link>
          <Link href="/divisao" className={cardClass}>
            <h3 className="text-base font-semibold text-on-surface">Acerto de contas</h3>
            <p className="text-sm text-on-surface-variant">
              Quem deve quem no período selecionado.
            </p>
          </Link>
          <Link href="/orcamento" className={cardClass}>
            <h3 className="text-base font-semibold text-on-surface">
              Planejamento vs. real
            </h3>
            <p className="text-sm text-on-surface-variant">
              Orçamento planejado por categoria e mês.
            </p>
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-sm">
        <h2 className="text-lg font-semibold text-on-surface">
          Gastos por categoria em {ano}
        </h2>
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-outline-variant text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              <th className="p-2 text-left">Categoria</th>
              <th className="p-2 text-right">Total</th>
              <th className="p-2 text-right">% do total</th>
              <th className="p-2 text-right">Média mensal</th>
            </tr>
          </thead>
          <tbody>
            {resumo?.map((r) => (
              <tr key={r.categoriaId} className="border-b border-outline-variant/60">
                <td className="p-2">{nomeCategoria(r.categoriaId)}</td>
                <td className="data-tabular p-2 text-right">
                  {centavosParaReais(r.totalCentavos)}
                </td>
                <td className="p-2 text-right">{r.percentualDoTotal.toFixed(1)}%</td>
                <td className="data-tabular p-2 text-right">
                  {centavosParaReais(r.mediaMensalCentavos)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {resumo?.length === 0 && (
          <p className="text-sm text-on-surface-variant">
            Nenhum lançamento em {ano}.
          </p>
        )}
      </section>
    </div>
  );
}
