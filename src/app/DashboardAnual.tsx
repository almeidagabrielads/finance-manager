"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { unicosPorChave, unicosPorId } from "@/lib/dedupe";
import { reaisParaCentavos, centavosParaReais } from "@/lib/domain/formatacao";
import {
  calcularDistribuicaoPorPessoa,
  calcularIndicadoresResumoAnual,
  calcularMaioresGastos,
  calcularMesesConcluidos,
  calcularTotaisAno,
  calcularTotalConsolidadoPorMes,
  consolidarPlanejadoVsRealPorAno,
  encontrarMesMaisBarato,
  encontrarMesMaisCaro,
  type ItemConsolidadoAnual,
} from "@/lib/domain/relatorioAnual";
import type {
  PlanejadoVsRealCategoria,
  ResumoCategoria,
  SaldoAnual,
} from "@/lib/domain/relatorios";
import type { SaldoDivisaoGrupo } from "@/lib/domain/split";
import { Select } from "./components/Select";
import { AnaliseAnualCards } from "./components/dashboard-anual/AnaliseAnualCards";
import { DistribuicaoPorPessoaCard } from "./components/dashboard-anual/DistribuicaoPorPessoaCard";
import { GraficoAnual } from "./components/dashboard-anual/GraficoAnual";
import { HarmoniaFinanceiraBanner } from "./components/dashboard-anual/HarmoniaFinanceiraBanner";
import { MaioresGastosCard } from "./components/dashboard-anual/MaioresGastosCard";
import { RelatorioAnualTable } from "./components/dashboard-anual/RelatorioAnualTable";
import { ResumoAnualCards } from "./components/dashboard-anual/ResumoAnualCards";
import { SaldoAnoAnteriorForm } from "./components/dashboard-anual/SaldoAnoAnteriorForm";
import { TendenciaAnualCard } from "./components/dashboard-anual/TendenciaAnualCard";

type Subcategoria = { id: string; nome: string; categoriaId: string };
type Categoria = { id: string; nome: string; subcategorias: Subcategoria[] };
type Pessoa = { id: string; nome: string; tipo: string };

type SecaoPlanejadoVsReal = {
  pessoaId: string;
  tipo: string;
  label: string;
  itens: PlanejadoVsRealCategoria[];
};

type RelatorioAnual = {
  ano: number;
  saldo: SaldoAnual;
  planejadoVsReal: SecaoPlanejadoVsReal[];
  resumoPorCategoria: ResumoCategoria[];
  divisaoDespesas: SaldoDivisaoGrupo | null;
};

type SaldoAnoAnterior = {
  origem: "sistema" | "manual";
  saldoCentavos: number;
} | null;

export function DashboardAnual({ ano }: { ano: number }) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [relatorio, setRelatorio] = useState<RelatorioAnual | null>(null);
  const [receitaAnoAnterior, setReceitaAnoAnterior] = useState<number | null>(
    null,
  );
  const [saldoAnoAnterior, setSaldoAnoAnterior] =
    useState<SaldoAnoAnterior>(null);
  const [editandoSaldoAnterior, setEditandoSaldoAnterior] = useState(false);
  const [inputSaldoAnterior, setInputSaldoAnterior] = useState("");
  const [salvandoSaldoAnterior, setSalvandoSaldoAnterior] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [naoAutenticado, setNaoAutenticado] = useState(false);
  const [pessoaFiltro, setPessoaFiltro] = useState("");

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
        setCategorias(
          unicosPorId<Categoria>(cats).map((c) => ({
            ...c,
            subcategorias: unicosPorId(c.subcategorias),
          })),
        );
        setPessoas(unicosPorId<Pessoa>(pes));
      })
      .catch(() => {
        if (!cancelado)
          setErro("Não foi possível carregar categorias/pessoas.");
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelado = false;
    const pessoaQuery = pessoaFiltro ? `&pessoaId=${pessoaFiltro}` : "";
    Promise.all([
      fetch(`/api/relatorios/anual?ano=${ano}${pessoaQuery}`),
      fetch(`/api/relatorios/saldo?ano=${ano - 1}${pessoaQuery}`),
      fetch(`/api/relatorios/saldo-anterior?ano=${ano}`),
    ])
      .then(async ([relatorioRes, saldoAnteriorRes, saldoAnoAnteriorRes]) => {
        if (cancelado) return;
        if (relatorioRes.status === 401) {
          setNaoAutenticado(true);
          return;
        }
        setNaoAutenticado(false);
        const body = await relatorioRes.json();
        if (!relatorioRes.ok) {
          setErro(body.error ?? "Não foi possível carregar o relatório.");
          setRelatorio(null);
          return;
        }
        setErro(null);
        setRelatorio({
          ...body,
          resumoPorCategoria: unicosPorChave(
            body.resumoPorCategoria,
            (r: ResumoCategoria) => r.categoriaId,
          ),
        });
        setReceitaAnoAnterior(
          saldoAnteriorRes.ok
            ? (await saldoAnteriorRes.json()).receitaCentavos
            : null,
        );
        setSaldoAnoAnterior(
          saldoAnoAnteriorRes.ok ? await saldoAnoAnteriorRes.json() : null,
        );
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar o relatório.");
      });
    return () => {
      cancelado = true;
    };
  }, [ano, reloadToken, pessoaFiltro]);

  async function salvarSaldoAnoAnterior(e: React.FormEvent) {
    e.preventDefault();
    setSalvandoSaldoAnterior(true);
    setErro(null);
    try {
      const response = await fetch("/api/fechamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ano: ano - 1,
          saldoCentavos: reaisParaCentavos(inputSaldoAnterior),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setErro(body?.error ?? "Não foi possível salvar o saldo anterior.");
        return;
      }
      setInputSaldoAnterior("");
      setEditandoSaldoAnterior(false);
      setReloadToken((t) => t + 1);
    } finally {
      setSalvandoSaldoAnterior(false);
    }
  }

  function editarSaldoAnoAnterior() {
    setInputSaldoAnterior(
      saldoAnoAnterior ? centavosParaReais(saldoAnoAnterior.saldoCentavos) : "",
    );
    setEditandoSaldoAnterior(true);
  }

  function cancelarEdicaoSaldoAnterior() {
    setInputSaldoAnterior("");
    setEditandoSaldoAnterior(false);
  }

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

  if (naoAutenticado) {
    return (
      <p className="text-on-surface-variant">
        Não autenticado — faça login para ver o relatório anual.
      </p>
    );
  }

  if (!relatorio) {
    return erro ? (
      <p className="border-danger/30 bg-danger-container p-sm text-on-danger-container rounded-lg border text-sm">
        {erro}
      </p>
    ) : (
      <p className="text-on-surface-variant text-sm">Carregando…</p>
    );
  }

  const { saldo, resumoPorCategoria, divisaoDespesas } = relatorio;

  const {
    taxaPoupancaPercentual,
    despesaPercentualReceita,
    variacaoReceitaPercentual,
    saldoAcumuladoCentavos,
  } = calcularIndicadoresResumoAnual({
    saldo,
    receitaAnoAnterior,
    saldoAnoAnteriorCentavos: saldoAnoAnterior?.saldoCentavos ?? 0,
  });

  const maioresGastos = calcularMaioresGastos(resumoPorCategoria);

  const maxFluxoMensal = Math.max(
    1,
    ...saldo.porMes.flatMap((m) => [m.receitaCentavos, m.despesaCentavos]),
  );

  const distribuicaoPorPessoa = calcularDistribuicaoPorPessoa(
    relatorio.planejadoVsReal,
  ).map((d) => ({ ...d, label: nomePessoa.get(d.pessoaId) ?? d.label }));

  const itensConsolidados: ItemConsolidadoAnual[] =
    consolidarPlanejadoVsRealPorAno(relatorio.planejadoVsReal);
  const { totalPlanejadoAno, totalRealAno, economiaTotalAno } =
    calcularTotaisAno(itensConsolidados);

  const totalConsolidadoPorMes =
    calcularTotalConsolidadoPorMes(itensConsolidados);

  const mesesConcluidos = calcularMesesConcluidos(ano, new Date());

  const mesMaisCaro = encontrarMesMaisCaro(totalConsolidadoPorMes);
  const mesMaisBarato = encontrarMesMaisBarato(totalConsolidadoPorMes);

  return (
    <div className="gap-xl flex flex-col">
      {erro && (
        <p className="border-danger/30 bg-danger-container p-sm text-on-danger-container rounded-lg border text-sm">
          {erro}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label
            htmlFor="pessoaFiltro"
            className="text-on-surface-variant text-xs font-semibold tracking-wide uppercase"
          >
            Visualizando
          </label>
          <Select
            id="pessoaFiltro"
            value={pessoaFiltro}
            onChange={setPessoaFiltro}
            options={[
              { value: "", label: "Geral" },
              ...pessoas.map((p) => ({ value: p.id, label: p.nome })),
            ]}
          />
        </div>
        <Link
          href="/configuracoes/exportar-dados"
          className="bg-primary px-md py-sm text-on-primary rounded-xl text-sm font-semibold hover:opacity-90"
        >
          Exportar dados
        </Link>
      </div>

      <ResumoAnualCards
        ano={ano}
        receitaCentavos={saldo.receitaCentavos}
        despesaCentavos={saldo.despesaCentavos}
        saldoCentavos={saldo.saldoCentavos}
        taxaPoupancaPercentual={taxaPoupancaPercentual}
        despesaPercentualReceita={despesaPercentualReceita}
        variacaoReceitaPercentual={variacaoReceitaPercentual}
      />

      <SaldoAnoAnteriorForm
        ano={ano}
        saldoAnoAnterior={saldoAnoAnterior}
        saldoAcumuladoCentavos={saldoAcumuladoCentavos}
        editando={editandoSaldoAnterior}
        inputValor={inputSaldoAnterior}
        salvando={salvandoSaldoAnterior}
        onEditar={editarSaldoAnoAnterior}
        onCancelar={cancelarEdicaoSaldoAnterior}
        onChangeInput={setInputSaldoAnterior}
        onSubmit={salvarSaldoAnoAnterior}
      />

      <div className="gap-md grid grid-cols-1 lg:grid-cols-3">
        <GraficoAnual porMes={saldo.porMes} maxFluxoMensal={maxFluxoMensal} />
        <MaioresGastosCard
          ano={ano}
          maioresGastos={maioresGastos}
          nomeCategoria={(id) => nomeCategoria.get(id)}
        />
      </div>

      <div className="gap-md flex flex-col">
        <div>
          <h2 className="text-on-surface text-xl font-bold">
            Análise anual de despesas
          </h2>
          <p className="text-on-surface-variant text-sm">
            Média mensal e consolidado de {ano}
          </p>
        </div>

        <AnaliseAnualCards
          ano={ano}
          totalPlanejadoAno={totalPlanejadoAno}
          totalRealAno={totalRealAno}
          economiaTotalAno={economiaTotalAno}
        />

        <RelatorioAnualTable
          categorias={categorias}
          itensConsolidados={itensConsolidados}
          totalConsolidadoPorMes={totalConsolidadoPorMes}
          mesesConcluidos={mesesConcluidos}
          nomeSubcategoria={(id) => nomeSubcategoria.get(id)}
        />

        <div className="gap-md grid grid-cols-1 lg:grid-cols-2">
          <DistribuicaoPorPessoaCard
            ano={ano}
            distribuicao={distribuicaoPorPessoa}
            transferenciasSugeridas={
              divisaoDespesas?.transferenciasSugeridas ?? []
            }
            nomePessoa={(id) => nomePessoa.get(id)}
          />
          <TendenciaAnualCard
            ano={ano}
            totalConsolidadoPorMes={totalConsolidadoPorMes}
            mesMaisCaro={mesMaisCaro}
            mesMaisBarato={mesMaisBarato}
          />
        </div>
      </div>

      <HarmoniaFinanceiraBanner
        ano={ano}
        economiaTotalAno={economiaTotalAno}
        taxaPoupancaPercentual={taxaPoupancaPercentual}
      />
    </div>
  );
}
