"use client";

import { useEffect, useMemo, useState } from "react";

const MESES = [
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

type Subcategoria = { id: string; nome: string; categoriaId: string };
type Categoria = { id: string; nome: string; subcategorias: Subcategoria[] };
type Pessoa = { id: string; nome: string; tipo: string };

type IndicadorPlanejado = {
  planejadoCentavos: number;
  realCentavos: number;
  diferencaCentavos: number;
  percentual: number | null;
  dentroDoPlanejado: boolean;
};

type PlanejadoVsRealCategoria = {
  categoriaId: string;
  subcategoriaId: string | null;
  acumulado: IndicadorPlanejado;
};

type SecaoPlanejadoVsReal = {
  pessoaId: string | null;
  label: string;
  itens: PlanejadoVsRealCategoria[];
};

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

type ResumoAgregado = {
  totalCentavos: number;
  percentualDoTotal: number;
  mediaMensalCentavos: number;
};

type ResumoCategoria = ResumoAgregado & { categoriaId: string };
type ResumoSubcategoria = ResumoAgregado & {
  categoriaId: string;
  subcategoriaId: string;
};

type PosicaoMensalTotal = { mes: string; valorCentavos: number };

type SaldoDivisao = {
  pessoaAId: string;
  pessoaBId: string;
  pagouPeloOutroCentavos: Record<string, number>;
  diferencaCentavos: number;
  pessoaDevedoraId: string | null;
  valorDevidoCentavos: number;
};

type RelatorioAnual = {
  ano: number;
  saldo: SaldoAnual;
  planejadoVsReal: SecaoPlanejadoVsReal[];
  resumoPorCategoria: ResumoCategoria[];
  resumoPorSubcategoria: ResumoSubcategoria[];
  evolucaoPatrimonio: PosicaoMensalTotal[];
  divisaoDespesas: SaldoDivisao | null;
};

function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarMes(mesIso: string): string {
  const data = new Date(mesIso);
  return `${MESES[data.getUTCMonth()]}/${data.getUTCFullYear()}`;
}

export function RelatorioAnualClient() {
  const anoAtual = new Date().getUTCFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [relatorio, setRelatorio] = useState<RelatorioAnual | null>(null);
  const [secaoAtiva, setSecaoAtiva] = useState<string>("");
  const [erro, setErro] = useState<string | null>(null);
  const [naoAutenticado, setNaoAutenticado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      fetch("/api/categorias").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/pessoas").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([cats, pes]) => {
        if (cancelado) return;
        if (cats === null || pes === null) {
          setNaoAutenticado(true);
          return;
        }
        setCategorias(cats);
        setPessoas(pes);
      })
      .catch(() => {
        if (!cancelado)
          setErro("Não foi possível carregar categorias/pessoas.");
      });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/relatorios/anual?ano=${ano}`)
      .then(async (response) => {
        if (cancelado) return;
        if (response.status === 401) {
          setNaoAutenticado(true);
          return;
        }
        setNaoAutenticado(false);
        const body = await response.json();
        if (!response.ok) {
          setErro(body.error ?? "Não foi possível carregar o relatório.");
          setRelatorio(null);
          return;
        }
        setErro(null);
        setRelatorio(body);
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar o relatório.");
      });
    return () => {
      cancelado = true;
    };
  }, [ano]);

  const secaoAtivaEfetiva = relatorio?.planejadoVsReal.some(
    (s) => s.label === secaoAtiva,
  )
    ? secaoAtiva
    : (relatorio?.planejadoVsReal[0]?.label ?? "");

  const nomeCategoria = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const c of categorias) mapa.set(c.id, c.nome);
    return mapa;
  }, [categorias]);

  const nomeSubcategoria = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const c of categorias)
      for (const s of c.subcategorias) mapa.set(s.id, s.nome);
    return mapa;
  }, [categorias]);

  const nomePessoa = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const p of pessoas) mapa.set(p.id, p.nome);
    return mapa;
  }, [pessoas]);

  function nome(id: string | null): string {
    if (!id) return "";
    return nomePessoa.get(id) ?? id;
  }

  if (naoAutenticado) {
    return (
      <p className="text-zinc-600 dark:text-zinc-400">
        Não autenticado — faça login para ver o relatório anual.
      </p>
    );
  }

  const secao = relatorio?.planejadoVsReal.find(
    (s) => s.label === secaoAtivaEfetiva,
  );

  return (
    <div className="flex flex-col gap-8">
      {erro && (
        <p className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="ano">
          Ano
        </label>
        <input
          id="ano"
          type="number"
          className="w-24 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          value={ano}
          onChange={(e) => setAno(Number(e.target.value))}
        />
      </div>

      {relatorio && (
        <>
          {/* Saldo final do ano */}
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Saldo do ano</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
                <p className="text-sm text-zinc-500">Receita</p>
                <p className="text-xl font-semibold">
                  {formatarReais(relatorio.saldo.receitaCentavos)}
                </p>
              </div>
              <div className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
                <p className="text-sm text-zinc-500">Despesa</p>
                <p className="text-xl font-semibold">
                  {formatarReais(relatorio.saldo.despesaCentavos)}
                </p>
              </div>
              <div className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
                <p className="text-sm text-zinc-500">Saldo</p>
                <p className="text-xl font-semibold">
                  {formatarReais(relatorio.saldo.saldoCentavos)}
                </p>
              </div>
            </div>
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="p-2 text-left">Mês</th>
                  <th className="p-2 text-right">Receita</th>
                  <th className="p-2 text-right">Despesa</th>
                  <th className="p-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {relatorio.saldo.porMes.map((m) => (
                  <tr
                    key={m.mes}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="p-2">{MESES[m.mes - 1]}</td>
                    <td className="p-2 text-right">
                      {formatarReais(m.receitaCentavos)}
                    </td>
                    <td className="p-2 text-right">
                      {formatarReais(m.despesaCentavos)}
                    </td>
                    <td className="p-2 text-right font-medium">
                      {formatarReais(m.saldoCentavos)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Orçamento planejado vs. real */}
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">
              Orçamento planejado vs. real (acumulado do ano)
            </h2>
            <div className="flex gap-2">
              {relatorio.planejadoVsReal.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setSecaoAtiva(s.label)}
                  className={`rounded px-3 py-1 text-sm font-medium ${
                    secaoAtivaEfetiva === s.label
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "border border-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="p-2 text-left">Categoria / Subcategoria</th>
                  <th className="p-2 text-right">Planejado</th>
                  <th className="p-2 text-right">Real</th>
                  <th className="p-2 text-right">Diferença</th>
                  <th className="p-2 text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {secao?.itens.map((item) => (
                  <tr
                    key={`${item.categoriaId}|${item.subcategoriaId ?? ""}`}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="p-2">
                      {nomeCategoria.get(item.categoriaId) ?? item.categoriaId}
                      {item.subcategoriaId && (
                        <span className="text-zinc-500">
                          {" › "}
                          {nomeSubcategoria.get(item.subcategoriaId) ??
                            item.subcategoriaId}
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-right">
                      {formatarReais(item.acumulado.planejadoCentavos)}
                    </td>
                    <td className="p-2 text-right">
                      {formatarReais(item.acumulado.realCentavos)}
                    </td>
                    <td className="p-2 text-right">
                      {formatarReais(item.acumulado.diferencaCentavos)}
                    </td>
                    <td
                      className={`p-2 text-right font-medium ${
                        item.acumulado.dentroDoPlanejado
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {item.acumulado.percentual === null
                        ? "—"
                        : `${item.acumulado.percentual.toFixed(0)}%`}
                    </td>
                  </tr>
                ))}
                {secao?.itens.length === 0 && (
                  <tr>
                    <td className="p-2 text-zinc-500" colSpan={5}>
                      Nenhum orçamento ou lançamento neste ano.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {/* Resumo por categoria e subcategoria */}
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Resumo por categoria</h2>
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="p-2 text-left">Categoria</th>
                  <th className="p-2 text-right">Total</th>
                  <th className="p-2 text-right">% do total</th>
                  <th className="p-2 text-right">Média mensal</th>
                </tr>
              </thead>
              <tbody>
                {relatorio.resumoPorCategoria.map((r) => (
                  <tr
                    key={r.categoriaId}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="p-2">
                      {nomeCategoria.get(r.categoriaId) ?? r.categoriaId}
                    </td>
                    <td className="p-2 text-right">
                      {formatarReais(r.totalCentavos)}
                    </td>
                    <td className="p-2 text-right">
                      {r.percentualDoTotal.toFixed(1)}%
                    </td>
                    <td className="p-2 text-right">
                      {formatarReais(r.mediaMensalCentavos)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Resumo por subcategoria</h2>
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="p-2 text-left">Categoria / Subcategoria</th>
                  <th className="p-2 text-right">Total</th>
                  <th className="p-2 text-right">% do total</th>
                  <th className="p-2 text-right">Média mensal</th>
                </tr>
              </thead>
              <tbody>
                {relatorio.resumoPorSubcategoria.map((r) => (
                  <tr
                    key={`${r.categoriaId}|${r.subcategoriaId}`}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="p-2">
                      {nomeCategoria.get(r.categoriaId) ?? r.categoriaId}
                      <span className="text-zinc-500">
                        {" › "}
                        {nomeSubcategoria.get(r.subcategoriaId) ??
                          r.subcategoriaId}
                      </span>
                    </td>
                    <td className="p-2 text-right">
                      {formatarReais(r.totalCentavos)}
                    </td>
                    <td className="p-2 text-right">
                      {r.percentualDoTotal.toFixed(1)}%
                    </td>
                    <td className="p-2 text-right">
                      {formatarReais(r.mediaMensalCentavos)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Evolução de patrimônio total */}
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">
              Evolução de patrimônio total
            </h2>
            {relatorio.evolucaoPatrimonio.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Nenhuma posição de patrimônio lançada neste ano.
              </p>
            ) : (
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="p-2 text-left">Mês</th>
                    <th className="p-2 text-right">Patrimônio total</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorio.evolucaoPatrimonio.map((p) => (
                    <tr
                      key={p.mes}
                      className="border-b border-zinc-100 dark:border-zinc-900"
                    >
                      <td className="p-2">{formatarMes(p.mes)}</td>
                      <td className="p-2 text-right font-medium">
                        {formatarReais(p.valorCentavos)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Divisão de despesas acumulada do ano */}
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">
              Divisão de despesas do ano
            </h2>
            {relatorio.divisaoDespesas === null ? (
              <p className="text-sm text-zinc-500">
                É preciso cadastrar duas pessoas do tipo Individual (ex.: Isa e
                Gabi) para calcular a divisão de despesas.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="rounded-lg border border-zinc-200 p-4 text-center dark:border-zinc-800">
                  {relatorio.divisaoDespesas.pessoaDevedoraId === null ? (
                    <p className="text-lg font-semibold">Contas quitadas 🎉</p>
                  ) : (
                    <p className="text-lg font-semibold">
                      {nome(relatorio.divisaoDespesas.pessoaDevedoraId)} deve{" "}
                      {formatarReais(
                        relatorio.divisaoDespesas.valorDevidoCentavos,
                      )}{" "}
                      para{" "}
                      {nome(
                        relatorio.divisaoDespesas.pessoaDevedoraId ===
                          relatorio.divisaoDespesas.pessoaAId
                          ? relatorio.divisaoDespesas.pessoaBId
                          : relatorio.divisaoDespesas.pessoaAId,
                      )}
                    </p>
                  )}
                </div>
                <table className="min-w-full border-collapse text-sm">
                  <tbody>
                    <tr className="border-b border-zinc-100 dark:border-zinc-900">
                      <td className="p-2">
                        Quanto {nome(relatorio.divisaoDespesas.pessoaAId)} pagou
                        pela {nome(relatorio.divisaoDespesas.pessoaBId)}
                      </td>
                      <td className="p-2 text-right font-medium">
                        {formatarReais(
                          relatorio.divisaoDespesas.pagouPeloOutroCentavos[
                            relatorio.divisaoDespesas.pessoaAId
                          ] ?? 0,
                        )}
                      </td>
                    </tr>
                    <tr className="border-b border-zinc-100 dark:border-zinc-900">
                      <td className="p-2">
                        Quanto {nome(relatorio.divisaoDespesas.pessoaBId)} pagou
                        pela {nome(relatorio.divisaoDespesas.pessoaAId)}
                      </td>
                      <td className="p-2 text-right font-medium">
                        {formatarReais(
                          relatorio.divisaoDespesas.pagouPeloOutroCentavos[
                            relatorio.divisaoDespesas.pessoaBId
                          ] ?? 0,
                        )}
                      </td>
                    </tr>
                    <tr className="bg-zinc-50 font-medium dark:bg-zinc-900/50">
                      <td className="p-2">Diferença</td>
                      <td className="p-2 text-right">
                        {formatarReais(
                          relatorio.divisaoDespesas.diferencaCentavos,
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
