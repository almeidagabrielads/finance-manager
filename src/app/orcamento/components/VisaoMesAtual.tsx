"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { unicosPorChave } from "@/lib/dedupe";
import { formatarMoeda, reaisParaCentavos } from "@/lib/domain/formatacao";
import { gerarInsightMensal } from "@/lib/domain/insightsOrcamento";
import {
  calcularSaldoComprometido,
  gerarInsightComprometido,
  type ParcelamentoParaComprometido,
} from "@/lib/domain/comprometido";
import {
  agregarIndicadorCategoria,
  indicadorVazio,
  top5PorRealizado,
  type IndicadorPlanejado,
} from "@/lib/domain/orcamento";
import { AnelProgresso } from "./AnelProgresso";
import { LinhaMes } from "./LinhaMes";
import {
  MESES_LONGOS,
  agruparPorSubcategoria,
  chave,
  chaveCategoria,
  parseErro,
  vigenteExtra,
  type Categoria,
  type OrcamentoItem,
  type Pessoa,
  type PlanejadoVsRealCategoria,
} from "./types";

type Props = {
  ano: number;
  mes: number;
  pessoaFiltro: string;
  editavel: boolean;
  categorias: Categoria[] | null;
  pessoas: Pessoa[];
  setErro: (msg: string | null) => void;
};

function IconeCalendario() {
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
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function IconeBanco() {
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
      <path d="M3 21h18M3 10h18M5 6l7-4 7 4M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
    </svg>
  );
}

function IconeTendencia({ positiva }: { positiva: boolean }) {
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
      {positiva ? (
        <path d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6" />
      ) : (
        <path d="M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6" />
      )}
    </svg>
  );
}

export function VisaoMesAtual({
  ano,
  mes,
  pessoaFiltro,
  editavel,
  categorias,
  pessoas,
  setErro,
}: Props) {
  const [dados, setDados] = useState<PlanejadoVsRealCategoria[] | null>(null);
  const [orcamentosRaw, setOrcamentosRaw] = useState<OrcamentoItem[] | null>(
    null,
  );
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const [reloadToken, setReloadToken] = useState(0);
  const [parcelamentosGradual, setParcelamentosGradual] = useState<
    ParcelamentoParaComprometido[]
  >([]);

  function recarregar() {
    setReloadToken((t) => t + 1);
  }

  useEffect(() => {
    let cancelado = false;
    type ParcelamentoApi = {
      modo: "GRADUAL" | "AVISTA" | "PREVISAO";
      quitadoEm: string | null;
      valorTotalCentavos: number;
      quantidadeParcelas: number;
      dataPrimeiraParcela: string;
      lancamentos: { numeroParcela: number | null }[];
    };
    fetch("/api/parcelamentos")
      .then((r) => (r.ok ? r.json() : null))
      .then((lista: ParcelamentoApi[] | null) => {
        if (cancelado || !lista) return;
        setParcelamentosGradual(
          lista
            .filter((p) => p.modo === "GRADUAL")
            .map((p) => ({
              modo: p.modo,
              quitadoEm: p.quitadoEm ? new Date(p.quitadoEm) : null,
              valorTotalCentavos: p.valorTotalCentavos,
              quantidadeParcelas: p.quantidadeParcelas,
              dataPrimeiraParcela: new Date(p.dataPrimeiraParcela),
              numerosParcelaLancados: p.lancamentos.map((l) => l.numeroParcela),
            })),
        );
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [reloadToken]);

  useEffect(() => {
    let cancelado = false;
    const pessoaQuery = pessoaFiltro === "" ? "" : `&pessoaId=${pessoaFiltro}`;
    fetch(`/api/relatorios/planejado-vs-real?ano=${ano}${pessoaQuery}`)
      .then(async (response) => {
        if (cancelado) return;
        if (!response.ok) {
          if (response.status !== 401) {
            setErro("Não foi possível carregar o planejado vs. real.");
          }
          return;
        }
        setDados(
          unicosPorChave(await response.json(), (r: PlanejadoVsRealCategoria) =>
            chaveCategoria(r.categoriaId, r.subcategoriaId),
          ),
        );
      })
      .catch(() => {
        if (!cancelado)
          setErro("Não foi possível carregar o planejado vs. real.");
      });
    return () => {
      cancelado = true;
    };
  }, [ano, pessoaFiltro, reloadToken, setErro]);

  useEffect(() => {
    let cancelado = false;
    const pessoaQuery = pessoaFiltro === "" ? "" : `&pessoaId=${pessoaFiltro}`;
    fetch(`/api/orcamentos?ano=${ano}${pessoaQuery}`)
      .then(async (response) => {
        if (cancelado) return;
        if (!response.ok) {
          if (response.status !== 401)
            setErro("Não foi possível carregar o orçamento.");
          return;
        }
        setOrcamentosRaw(await response.json());
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar o orçamento.");
      });
    return () => {
      cancelado = true;
    };
  }, [ano, pessoaFiltro, reloadToken, setErro]);

  const mapaOrcamentosRaw = useMemo(() => {
    const mapa = new Map<string, OrcamentoItem>();
    for (const o of orcamentosRaw ?? []) {
      mapa.set(chave(o.categoriaId, o.subcategoriaId, o.mes), o);
    }
    return mapa;
  }, [orcamentosRaw]);

  const itensPorSubcategoria = useMemo(
    () => agruparPorSubcategoria(orcamentosRaw ?? []),
    [orcamentosRaw],
  );

  async function salvarPlanejadoSubcategoria(
    categoriaId: string,
    subcategoriaId: string,
    valorTexto: string,
    divisaoIdSelecionada: string | null,
    tipoGastoSelecionado: string,
    valorExibidoAntesCentavos: number,
    divisaoIdAntes: string | null,
    tipoGastoAntes: string,
  ) {
    setErro(null);
    const existente = mapaOrcamentosRaw.get(
      chave(categoriaId, subcategoriaId, mes),
    );
    const valorCentavos =
      valorTexto.trim() === "" ? 0 : reaisParaCentavos(valorTexto);

    // Sem edição real: os três campos só exibiam o que já está vigente (mês
    // anterior ou limite sugerido da subcategoria), nada foi de fato
    // alterado.
    if (
      !existente &&
      valorCentavos === valorExibidoAntesCentavos &&
      divisaoIdSelecionada === divisaoIdAntes &&
      tipoGastoSelecionado === tipoGastoAntes
    ) {
      return;
    }

    // Campo de valor limpo (voltar a herdar o vigente): remove a entrada
    // específica deste mês, se houver — divisão/tipo do mês somem junto.
    if (existente && valorTexto.trim() === "") {
      const response = await fetch(`/api/orcamentos/${existente.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setErro(await parseErro(response));
        return;
      }
      recarregar();
      return;
    }

    if (existente) {
      if (
        existente.valorCentavos === valorCentavos &&
        existente.divisaoId === divisaoIdSelecionada &&
        existente.tipoGasto === tipoGastoSelecionado
      ) {
        return;
      }
      const response = await fetch(`/api/orcamentos/${existente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valorCentavos,
          divisaoId: divisaoIdSelecionada,
          tipoGasto: tipoGastoSelecionado,
        }),
      });
      if (!response.ok) {
        setErro(await parseErro(response));
        return;
      }
      recarregar();
      return;
    }

    // Novo valor a partir deste mês, inclusive zero (override explícito que
    // suprime o valor vigente/limite sugerido para este mês em diante).
    const response = await fetch("/api/orcamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pessoaId: pessoaFiltro,
        categoriaId,
        subcategoriaId,
        mes,
        ano,
        valorCentavos,
        divisaoId: divisaoIdSelecionada,
        tipoGasto: tipoGastoSelecionado,
      }),
    });
    if (!response.ok) {
      setErro(await parseErro(response));
      return;
    }
    recarregar();
  }

  const mapaIndicadores = useMemo(() => {
    const mapa = new Map<string, IndicadorPlanejado>();
    for (const c of dados ?? []) {
      const linha = c.meses.find((m) => m.mes === mes);
      if (linha)
        mapa.set(chaveCategoria(c.categoriaId, c.subcategoriaId), linha);
    }
    return mapa;
  }, [dados, mes]);

  function indicador(categoriaId: string, subcategoriaId: string | null) {
    return (
      mapaIndicadores.get(chaveCategoria(categoriaId, subcategoriaId)) ??
      indicadorVazio()
    );
  }

  const linhasCategorias = (categorias ?? []).map((c) => ({
    categoria: c,
    indicador: agregarIndicadorCategoria(
      indicador(c.id, null),
      c.subcategorias.map((sub) => indicador(c.id, sub.id)),
    ),
  }));

  const totalPlanejado = linhasCategorias.reduce(
    (s, l) => s + l.indicador.planejadoCentavos,
    0,
  );
  const totalReal = linhasCategorias.reduce(
    (s, l) => s + l.indicador.realCentavos,
    0,
  );
  const saldo = totalPlanejado - totalReal;
  const usoPercentual =
    totalPlanejado > 0
      ? Math.min((totalReal / totalPlanejado) * 100, 100)
      : totalReal > 0
        ? 100
        : 0;
  const dentroDoPlanejado = totalReal <= totalPlanejado;

  const top5 = top5PorRealizado(
    linhasCategorias.map((l) => ({
      ...l,
      realCentavos: l.indicador.realCentavos,
    })),
  );
  const maxTop5 = Math.max(1, ...top5.map((l) => l.indicador.realCentavos));

  const insight = gerarInsightMensal(
    linhasCategorias.map((l) => ({
      nome: l.categoria.nome,
      planejadoCentavos: l.indicador.planejadoCentavos,
      realCentavos: l.indicador.realCentavos,
    })),
  );

  const saldoComprometido = calcularSaldoComprometido(parcelamentosGradual);
  const insightComprometido = gerarInsightComprometido(
    saldoComprometido.totalComprometidoCentavos,
  );

  function alternar(categoriaId: string) {
    setAbertas((atual) => {
      const novo = new Set(atual);
      if (novo.has(categoriaId)) novo.delete(categoriaId);
      else novo.add(categoriaId);
      return novo;
    });
  }

  const cardClass =
    "flex flex-col justify-between gap-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm";

  return (
    <div className="gap-lg flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-on-surface text-2xl font-bold">
            Planejamento vs. Real
          </h1>
          <p className="text-on-surface-variant text-sm">
            Acompanhamento detalhado do orçamento doméstico em{" "}
            {MESES_LONGOS[mes - 1]} {ano}.
          </p>
        </div>
        <Link
          href="/lancamentos"
          className="bg-primary px-md text-on-primary flex items-center gap-1.5 rounded-full py-2 text-sm font-semibold hover:opacity-90"
        >
          <span className="text-base leading-none">+</span> Nova transação
        </Link>
      </div>

      <div className="gap-md grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <span className="text-on-surface-variant text-xs font-semibold tracking-wide uppercase">
              Planejado
            </span>
            <span className="text-on-surface-variant">
              <IconeCalendario />
            </span>
          </div>
          <div>
            <p className="text-on-surface-variant text-xs">Total mensal</p>
            <p className="data-tabular text-on-surface text-2xl font-semibold">
              {formatarMoeda(totalPlanejado)}
            </p>
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <span className="text-on-surface-variant text-xs font-semibold tracking-wide uppercase">
              Realizado
            </span>
            <span className="text-on-surface-variant">
              <IconeBanco />
            </span>
          </div>
          <div>
            <p className="text-on-surface-variant text-xs">Gastos até agora</p>
            <p className="data-tabular text-on-surface text-2xl font-semibold">
              {formatarMoeda(totalReal)}
            </p>
          </div>
        </div>

        <div
          className={`${cardClass} border-l-4 ${
            dentroDoPlanejado ? "border-l-success" : "border-l-danger"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-on-surface-variant text-xs font-semibold tracking-wide uppercase">
              Diferença
            </span>
            <span
              className={dentroDoPlanejado ? "text-success" : "text-danger"}
            >
              <IconeTendencia positiva={dentroDoPlanejado} />
            </span>
          </div>
          <div>
            <p className="text-on-surface-variant text-xs">Saldo disponível</p>
            <p
              className={`data-tabular text-2xl font-semibold ${
                dentroDoPlanejado ? "text-success" : "text-danger"
              }`}
            >
              {formatarMoeda(saldo)}
            </p>
          </div>
        </div>

        <div className={cardClass}>
          <span className="text-on-surface-variant text-xs font-semibold tracking-wide uppercase">
            Tendência Top 5
          </span>
          {top5.length > 0 ? (
            <div className="flex h-16 items-end gap-2">
              {top5.map((l) => (
                <div
                  key={l.categoria.id}
                  className="flex flex-1 flex-col items-center gap-1"
                  title={formatarMoeda(l.indicador.realCentavos)}
                >
                  <div className="flex h-10 w-full items-end">
                    <div
                      className="bg-primary w-full rounded-t"
                      style={{
                        height: `${(l.indicador.realCentavos / maxTop5) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-on-surface-variant truncate text-[10px] font-medium">
                    {l.categoria.nome.slice(0, 8)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-on-surface-variant text-sm">
              Sem gastos registrados ainda.
            </p>
          )}
        </div>
      </div>

      <div className="border-outline-variant bg-surface-container-lowest overflow-x-auto rounded-xl border">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-outline-variant text-on-surface-variant border-b text-xs font-semibold tracking-wide uppercase">
              <th className="p-3 text-left">Categoria / Subcategoria</th>
              <th className="p-3 text-left">Divisão</th>
              <th className="p-3 text-left">Tipo de gasto</th>
              <th className="p-3 text-right">Planejado (R$)</th>
              <th className="p-3 text-right">Real (R$)</th>
              <th className="p-3 text-right">Diferença</th>
            </tr>
          </thead>
          <tbody>
            {linhasCategorias.map(({ categoria, indicador: indCategoria }) => {
              const aberta = abertas.has(categoria.id);
              const temSub = categoria.subcategorias.length > 0;
              return (
                <Fragment key={categoria.id}>
                  <LinhaMes
                    label={categoria.nome}
                    indicador={indCategoria}
                    destaque
                    expansivel={temSub}
                    aberta={aberta}
                    onToggle={() => alternar(categoria.id)}
                  />
                  {aberta &&
                    categoria.subcategorias.map((sub) => {
                      const itemRaw = mapaOrcamentosRaw.get(
                        chave(categoria.id, sub.id, mes),
                      );
                      const indSub = indicador(categoria.id, sub.id);
                      // Sem entrada específica do mês: mostra o valor rateado
                      // do orçamento anual, se houver, para não parecer vazio.
                      const valorExibidoCentavos =
                        itemRaw?.valorCentavos ??
                        (indSub.planejadoCentavos > 0
                          ? indSub.planejadoCentavos
                          : 0);
                      const extraVigente = vigenteExtra(
                        itensPorSubcategoria.get(
                          chaveCategoria(categoria.id, sub.id),
                        ),
                        mes,
                      );
                      const divisaoExibida =
                        itemRaw?.divisaoId ?? extraVigente.divisaoId;
                      const tipoExibido =
                        itemRaw?.tipoGasto ?? extraVigente.tipoGasto;
                      return (
                        <LinhaMes
                          key={sub.id}
                          label={sub.nome}
                          indicador={indSub}
                          planejadoEditavel={
                            editavel
                              ? {
                                  valorCentavos: valorExibidoCentavos,
                                  itemId: itemRaw?.id,
                                  divisaoId: divisaoExibida,
                                  tipoGasto: tipoExibido,
                                  pessoas,
                                  onSalvar: (texto, divisaoId, tipoGasto) =>
                                    salvarPlanejadoSubcategoria(
                                      categoria.id,
                                      sub.id,
                                      texto,
                                      divisaoId,
                                      tipoGasto,
                                      valorExibidoCentavos,
                                      divisaoExibida,
                                      tipoExibido,
                                    ),
                                }
                              : undefined
                          }
                        />
                      );
                    })}
                </Fragment>
              );
            })}
            <tr className="bg-surface-container-low font-semibold">
              <td className="p-3">Total consolidado</td>
              <td className="p-3"></td>
              <td className="p-3"></td>
              <td className="data-tabular p-3 text-right">
                {formatarMoeda(totalPlanejado)}
              </td>
              <td className="data-tabular p-3 text-right">
                {formatarMoeda(totalReal)}
              </td>
              <td
                className={`data-tabular p-3 text-right ${
                  saldo < 0 ? "text-danger" : "text-success"
                }`}
              >
                {formatarMoeda(Math.abs(saldo))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {categorias?.length === 0 && (
        <p className="text-on-surface-variant text-sm">
          Nenhuma categoria cadastrada — crie categorias antes de definir o
          orçamento.
        </p>
      )}

      <div className="gap-lg grid grid-cols-1 lg:grid-cols-2">
        <div className={cardClass}>
          <h2 className="text-on-surface flex items-center gap-2 text-base font-semibold">
            ✨ Insights do mês
          </h2>
          <p className="text-on-surface-variant text-sm">
            {insight ?? "Ainda não há dados suficientes para gerar um insight."}
          </p>
        </div>

        <div className={`${cardClass} flex-row items-center justify-between`}>
          <div>
            <p className="text-on-surface-variant text-xs font-semibold tracking-wide uppercase">
              Uso do orçamento do mês
            </p>
            <p className="data-tabular text-on-surface text-2xl font-semibold">
              {formatarMoeda(totalReal)}{" "}
              <span className="text-on-surface-variant text-sm font-normal">
                / {formatarMoeda(totalPlanejado)}
              </span>
            </p>
          </div>
          <AnelProgresso
            percentual={usoPercentual}
            cor={dentroDoPlanejado ? "success" : "danger"}
          />
        </div>

        {insightComprometido && (
          <div className={cardClass}>
            <h2 className="text-on-surface flex items-center gap-2 text-base font-semibold">
              📌 Saldo comprometido
            </h2>
            <p className="text-on-surface-variant text-sm">
              {insightComprometido}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
