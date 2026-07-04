"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SaldoMensal = {
  mes: number;
  receitaCentavos: number;
  despesaCentavos: number;
  saldoCentavos: number;
};

type SaldoAnual = {
  ano: number;
  receitaCentavos: number;
  despesaCentavos: number;
  saldoCentavos: number;
  porMes: SaldoMensal[];
};

type SaldoDivisao = {
  pessoaAId: string;
  pessoaBId: string;
  pessoaDevedoraId: string | null;
  valorDevidoCentavos: number;
};

type ResumoCategoria = {
  categoriaId: string;
  totalCentavos: number;
  percentualDoTotal: number;
};

type LiquidezFaixa = {
  faixa: string;
  totalCentavos: number;
};

type Pessoa = { id: string; nome: string };
type Categoria = { id: string; nome: string };

const LABEL_FAIXA: Record<string, string> = {
  IMEDIATO: "Imediato",
  ATE_30_DIAS: "Até 30 dias",
  ATE_90_DIAS: "Até 90 dias",
  ATE_180_DIAS: "Até 180 dias",
  ATE_365_DIAS: "Até 1 ano",
  MAIS_DE_1_ANO: "Mais de 1 ano",
  INDEFINIDO: "Indefinido",
};

function centavosParaReais(valor: number): string {
  return (valor / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function primeiroEUltimoDiaDoMes(): { inicio: string; fim: string } {
  const hoje = new Date();
  const ano = hoje.getUTCFullYear();
  const mes = hoje.getUTCMonth();
  const inicio = new Date(Date.UTC(ano, mes, 1)).toISOString().slice(0, 10);
  const fim = new Date(Date.UTC(ano, mes + 1, 0)).toISOString().slice(0, 10);
  return { inicio, fim };
}

export function DashboardClient() {
  const anoAtual = new Date().getUTCFullYear();
  const mesAtual = new Date().getUTCMonth() + 1;

  const [saldo, setSaldo] = useState<SaldoAnual | null>(null);
  const [divisao, setDivisao] = useState<SaldoDivisao | null>(null);
  const [divisaoIndisponivel, setDivisaoIndisponivel] = useState(false);
  const [resumoCategorias, setResumoCategorias] = useState<
    ResumoCategoria[] | null
  >(null);
  const [liquidez, setLiquidez] = useState<LiquidezFaixa[] | null>(null);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [naoAutenticado, setNaoAutenticado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    const { inicio, fim } = primeiroEUltimoDiaDoMes();

    Promise.all([
      fetch(`/api/relatorios/saldo?ano=${anoAtual}`),
      fetch(`/api/relatorios/divisao?dataInicio=${inicio}&dataFim=${fim}`),
      fetch(`/api/relatorios/resumo-categorias?ano=${anoAtual}`),
      fetch("/api/investimentos/liquidez"),
      fetch("/api/pessoas"),
      fetch("/api/categorias"),
    ])
      .then(async (responses) => {
        if (cancelado) return;
        const [
          saldoRes,
          divisaoRes,
          resumoRes,
          liquidezRes,
          pessoasRes,
          categoriasRes,
        ] = responses;

        if (
          saldoRes.status === 401 ||
          resumoRes.status === 401 ||
          liquidezRes.status === 401 ||
          pessoasRes.status === 401 ||
          categoriasRes.status === 401
        ) {
          setNaoAutenticado(true);
          return;
        }

        setSaldo(saldoRes.ok ? await saldoRes.json() : null);
        setResumoCategorias(resumoRes.ok ? await resumoRes.json() : []);
        setLiquidez(liquidezRes.ok ? await liquidezRes.json() : []);
        setPessoas(pessoasRes.ok ? await pessoasRes.json() : []);
        setCategorias(categoriasRes.ok ? await categoriasRes.json() : []);

        if (divisaoRes.status === 422) {
          setDivisaoIndisponivel(true);
        } else if (divisaoRes.ok) {
          setDivisao(await divisaoRes.json());
        }
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar a visão geral.");
      });

    return () => {
      cancelado = true;
    };
  }, [anoAtual]);

  if (naoAutenticado) {
    return (
      <p className="text-zinc-600 dark:text-zinc-400">
        Não autenticado —{" "}
        <Link href="/login" className="font-medium text-blue-700 dark:text-blue-400">
          faça login
        </Link>{" "}
        para ver a visão geral.
      </p>
    );
  }

  const nomePessoa = (id: string) =>
    pessoas.find((p) => p.id === id)?.nome ?? "—";
  const nomeCategoria = (id: string) =>
    categorias.find((c) => c.id === id)?.nome ?? "—";

  const saldoDoMes = saldo?.porMes.find((m) => m.mes === mesAtual) ?? null;
  const topCategorias = [...(resumoCategorias ?? [])]
    .sort((a, b) => b.totalCentavos - a.totalCentavos)
    .slice(0, 5);
  const faixasComSaldo = (liquidez ?? []).filter((f) => f.totalCentavos > 0);

  const cardClass =
    "flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900";
  const cardTitleClass =
    "text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";
  const linkClass =
    "mt-auto text-sm font-medium text-blue-700 hover:underline dark:text-blue-400";

  return (
    <div className="flex flex-col gap-6">
      {erro && (
        <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {erro}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className={cardTitleClass}>Saldo de {anoAtual}</h2>
          {saldo ? (
            <>
              <p
                className={`text-3xl font-semibold tabular-nums ${
                  saldo.saldoCentavos < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-zinc-900 dark:text-zinc-50"
                }`}
              >
                {centavosParaReais(saldo.saldoCentavos)}
              </p>
              <dl className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Receitas</dt>
                  <dd className="tabular-nums text-zinc-700 dark:text-zinc-300">
                    {centavosParaReais(saldo.receitaCentavos)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Despesas</dt>
                  <dd className="tabular-nums text-zinc-700 dark:text-zinc-300">
                    {centavosParaReais(saldo.despesaCentavos)}
                  </dd>
                </div>
                {saldoDoMes && (
                  <div className="flex justify-between border-t border-zinc-100 pt-1 dark:border-zinc-800">
                    <dt className="text-zinc-500">Mês atual</dt>
                    <dd className="tabular-nums text-zinc-700 dark:text-zinc-300">
                      {centavosParaReais(saldoDoMes.saldoCentavos)}
                    </dd>
                  </div>
                )}
              </dl>
            </>
          ) : (
            <p className="text-sm text-zinc-500">Sem dados para {anoAtual}.</p>
          )}
        </div>

        <div className={cardClass}>
          <h2 className={cardTitleClass}>Divisão do casal (mês atual)</h2>
          {divisaoIndisponivel ? (
            <p className="text-sm text-zinc-500">
              Cadastre duas pessoas do tipo Individual em{" "}
              <Link href="/pessoas" className="font-medium text-blue-700 dark:text-blue-400">
                Pessoas
              </Link>{" "}
              para calcular a divisão.
            </p>
          ) : divisao ? (
            divisao.pessoaDevedoraId ? (
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {nomePessoa(divisao.pessoaDevedoraId)}
                </span>{" "}
                deve{" "}
                <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {centavosParaReais(divisao.valorDevidoCentavos)}
                </span>
              </p>
            ) : (
              <p className="text-sm text-zinc-500">Saldo zerado.</p>
            )
          ) : (
            <p className="text-sm text-zinc-500">Carregando…</p>
          )}
          <Link href="/divisao" className={linkClass}>
            Ver detalhes →
          </Link>
        </div>

        <div className={cardClass}>
          <h2 className={cardTitleClass}>Top categorias em {anoAtual}</h2>
          {topCategorias.length > 0 ? (
            <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
              {topCategorias.map((c) => (
                <li
                  key={c.categoriaId}
                  className="flex justify-between py-1.5 text-sm first:pt-0 last:pb-0"
                >
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {nomeCategoria(c.categoriaId)}
                  </span>
                  <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                    {centavosParaReais(c.totalCentavos)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">Nenhum lançamento em {anoAtual}.</p>
          )}
          <Link href="/relatorio-anual" className={linkClass}>
            Ver relatório anual →
          </Link>
        </div>

        <div className={cardClass}>
          <h2 className={cardTitleClass}>Liquidez dos investimentos</h2>
          {faixasComSaldo.length > 0 ? (
            <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
              {faixasComSaldo.map((f) => (
                <li
                  key={f.faixa}
                  className="flex justify-between py-1.5 text-sm first:pt-0 last:pb-0"
                >
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {LABEL_FAIXA[f.faixa] ?? f.faixa}
                  </span>
                  <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                    {centavosParaReais(f.totalCentavos)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">Nenhum investimento cadastrado.</p>
          )}
          <Link href="/investimentos" className={linkClass}>
            Ver investimentos →
          </Link>
        </div>
      </div>
    </div>
  );
}
