"use client";

import { useEffect, useMemo, useState } from "react";

const TIPOS_INVESTIMENTO = [
  { value: "RENDA_FIXA", label: "Renda Fixa", cor: "var(--color-primary)" },
  {
    value: "FUNDO",
    label: "Fundo de Investimento",
    cor: "var(--color-secondary)",
  },
  { value: "FGTS", label: "FGTS", cor: "var(--color-tertiary-container)" },
  { value: "OUTRO", label: "Outro", cor: "var(--color-outline)" },
] as const;

type Banco = { id: string; nome: string };
type Pessoa = { id: string; nome: string };
type Investimento = {
  id: string;
  bancoId: string;
  pessoaId: string;
  tipo: string;
  produto: string;
  valorAtualCentavos: number;
};
type LinhaRendimento = {
  mes: string;
  rendimentoAcumuladoRealPercentual: number;
  cdiAcumuladoPercentual: number;
};

function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function corTipo(tipo: string): string {
  return (
    TIPOS_INVESTIMENTO.find((t) => t.value === tipo)?.cor ??
    "var(--color-outline)"
  );
}

function labelTipo(tipo: string): string {
  return TIPOS_INVESTIMENTO.find((t) => t.value === tipo)?.label ?? tipo;
}

function Donut({ fatias }: { fatias: { cor: string; valor: number }[] }) {
  const total = fatias.reduce((soma, f) => soma + f.valor, 0);
  const raio = 60;
  const circunferencia = 2 * Math.PI * raio;
  let acumulado = 0;

  return (
    <svg viewBox="0 0 160 160" className="h-40 w-40 -rotate-90">
      <circle
        cx={80}
        cy={80}
        r={raio}
        fill="none"
        stroke="var(--color-surface-container)"
        strokeWidth={20}
      />
      {total > 0 &&
        fatias
          .filter((f) => f.valor > 0)
          .map((f, i) => {
            const fracao = f.valor / total;
            const comprimento = fracao * circunferencia;
            const offset = -acumulado * circunferencia;
            acumulado += fracao;
            return (
              <circle
                key={i}
                cx={80}
                cy={80}
                r={raio}
                fill="none"
                stroke={f.cor}
                strokeWidth={20}
                strokeDasharray={`${comprimento} ${circunferencia - comprimento}`}
                strokeDashoffset={offset}
              />
            );
          })}
    </svg>
  );
}

function GraficoRendimento({ linhas }: { linhas: LinhaRendimento[] }) {
  const largura = 640;
  const altura = 220;
  const padding = 8;

  const valores = linhas.flatMap((l) => [
    l.rendimentoAcumuladoRealPercentual,
    l.cdiAcumuladoPercentual,
  ]);
  const min = Math.min(0, ...valores);
  const max = Math.max(0, ...valores, 0.01);

  function pontos(chave: keyof LinhaRendimento): string {
    if (linhas.length === 1) {
      const y =
        altura -
        padding -
        (((linhas[0][chave] as number) - min) / (max - min)) *
          (altura - 2 * padding);
      return `${padding},${y} ${largura - padding},${y}`;
    }
    return linhas
      .map((l, i) => {
        const x = padding + (i / (linhas.length - 1)) * (largura - 2 * padding);
        const y =
          altura -
          padding -
          (((l[chave] as number) - min) / (max - min)) * (altura - 2 * padding);
        return `${x},${y}`;
      })
      .join(" ");
  }

  return (
    <svg
      viewBox={`0 0 ${largura} ${altura}`}
      className="w-full"
      preserveAspectRatio="none"
    >
      <polyline
        points={pontos("cdiAcumuladoPercentual")}
        fill="none"
        stroke="var(--color-outline)"
        strokeWidth={2}
      />
      <polyline
        points={pontos("rendimentoAcumuladoRealPercentual")}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth={3}
      />
    </svg>
  );
}

export function RelatorioInvestimentos({
  investimentos,
  bancos,
  pessoas,
}: {
  investimentos: Investimento[];
  bancos: Banco[];
  pessoas: Pessoa[];
}) {
  const anoAtual = new Date().getUTCFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [rendimento, setRendimento] = useState<LinhaRendimento[] | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/patrimonio/rendimento?ano=${ano}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((dados) => {
        if (!cancelado) setRendimento(dados);
      })
      .catch(() => {
        if (!cancelado) setRendimento([]);
      });
    return () => {
      cancelado = true;
    };
  }, [ano]);

  const totalCentavos = investimentos.reduce(
    (soma, inv) => soma + inv.valorAtualCentavos,
    0,
  );

  const grupos = useMemo(() => {
    return TIPOS_INVESTIMENTO.map((t) => ({
      ...t,
      totalCentavos: investimentos
        .filter((inv) => inv.tipo === t.value)
        .reduce((soma, inv) => soma + inv.valorAtualCentavos, 0),
      itens: investimentos.filter((inv) => inv.tipo === t.value),
    })).filter((g) => g.totalCentavos > 0);
  }, [investimentos]);

  const ultimaLinha =
    rendimento && rendimento.length > 0
      ? rendimento[rendimento.length - 1]
      : null;

  return (
    <div className="gap-lg flex flex-col">
      <div className="gap-sm flex items-center">
        <label
          className="text-on-surface-variant text-xs font-semibold"
          htmlFor="ano-relatorio"
        >
          Ano
        </label>
        <select
          id="ano-relatorio"
          className="border-outline-variant bg-surface-container-lowest rounded-lg border px-2 py-1 text-sm"
          value={ano}
          onChange={(e) => setAno(Number(e.target.value))}
        >
          {[anoAtual, anoAtual - 1, anoAtual - 2].map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-on-surface-variant text-xs font-semibold tracking-wide uppercase">
          Patrimônio em investimentos
        </span>
        <span className="text-on-surface text-3xl font-bold">
          {formatarReais(totalCentavos)}
        </span>
      </div>

      <div className="gap-lg grid grid-cols-1 lg:grid-cols-[minmax(0,340px)_1fr]">
        <section className="gap-md border-outline-variant bg-surface-container-lowest p-lg flex flex-col rounded-xl border shadow-sm">
          <h2 className="text-on-surface text-base font-bold">
            Alocação de Ativos
          </h2>
          {grupos.length > 0 ? (
            <>
              <div className="flex justify-center">
                <Donut
                  fatias={grupos.map((g) => ({
                    cor: g.cor,
                    valor: g.totalCentavos,
                  }))}
                />
              </div>
              <ul className="flex flex-col gap-2">
                {grupos.map((g) => (
                  <li key={g.value} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: g.cor }}
                    />
                    <span className="text-on-surface-variant">{g.label}</span>
                    <span className="data-tabular text-on-surface ml-auto font-medium">
                      {formatarReais(g.totalCentavos)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-on-surface-variant text-sm">
              Nenhum investimento cadastrado.
            </p>
          )}
        </section>

        <section className="gap-md border-outline-variant bg-surface-container-lowest p-lg flex flex-col rounded-xl border shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-on-surface text-base font-bold">
              Performance: Rendimento vs. CDI
            </h2>
            <div className="gap-md text-on-surface-variant flex items-center text-xs">
              <span className="flex items-center gap-1">
                <span className="bg-primary h-2 w-2 rounded-full" /> Carteira
              </span>
              <span className="flex items-center gap-1">
                <span className="bg-outline h-2 w-2 rounded-full" /> CDI
              </span>
            </div>
          </div>
          {rendimento === null ? (
            <p className="text-on-surface-variant text-sm">Carregando…</p>
          ) : rendimento.length > 0 ? (
            <>
              <GraficoRendimento linhas={rendimento} />
              <div className="text-on-surface-variant flex justify-between text-xs">
                {rendimento.map((l) => (
                  <span key={l.mes}>
                    {new Date(l.mes).toLocaleDateString("pt-BR", {
                      month: "short",
                      timeZone: "UTC",
                    })}
                  </span>
                ))}
              </div>
              {ultimaLinha && (
                <p className="text-on-surface-variant text-sm">
                  Acumulado no ano: carteira{" "}
                  <span className="text-on-surface font-semibold">
                    {ultimaLinha.rendimentoAcumuladoRealPercentual.toFixed(2)}%
                  </span>{" "}
                  vs. CDI{" "}
                  <span className="text-on-surface font-semibold">
                    {ultimaLinha.cdiAcumuladoPercentual.toFixed(2)}%
                  </span>
                </p>
              )}
            </>
          ) : (
            <p className="text-on-surface-variant text-sm">
              Sem posições de patrimônio lançadas em {ano}.
            </p>
          )}
        </section>
      </div>

      <section className="gap-sm border-outline-variant bg-surface-container-lowest p-lg flex flex-col rounded-xl border shadow-sm">
        <h2 className="text-on-surface text-base font-bold">
          Detalhamento por Classe
        </h2>
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-outline-variant text-on-surface-variant border-b text-xs font-semibold tracking-wide uppercase">
              <th className="p-2 text-left">Classe</th>
              <th className="p-2 text-left">Instituição</th>
              <th className="p-2 text-left">Titular</th>
              <th className="p-2 text-right">Valor</th>
              <th className="p-2 text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {grupos.flatMap((g) =>
              g.itens.map((inv) => {
                const banco = bancos.find((b) => b.id === inv.bancoId);
                const pessoa = pessoas.find((p) => p.id === inv.pessoaId);
                return (
                  <tr
                    key={inv.id}
                    className="border-outline-variant/60 border-b"
                  >
                    <td className="p-2">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: corTipo(inv.tipo) }}
                        />
                        {labelTipo(inv.tipo)}
                      </span>
                    </td>
                    <td className="p-2">{banco?.nome ?? "—"}</td>
                    <td className="p-2">{pessoa?.nome ?? "—"}</td>
                    <td className="data-tabular p-2 text-right font-medium">
                      {formatarReais(inv.valorAtualCentavos)}
                    </td>
                    <td className="data-tabular text-on-surface-variant p-2 text-right">
                      {totalCentavos > 0
                        ? `${((inv.valorAtualCentavos / totalCentavos) * 100).toFixed(1)}%`
                        : "—"}
                    </td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
        {investimentos.length === 0 && (
          <p className="text-on-surface-variant text-sm">
            Nenhum investimento cadastrado.
          </p>
        )}
      </section>
    </div>
  );
}
