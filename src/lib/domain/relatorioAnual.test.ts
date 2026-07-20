import { describe, expect, it } from "vitest";
import {
  calcularDistribuicaoPorPessoa,
  calcularEvolucaoPatrimonio,
  calcularIndicadoresResumoAnual,
  calcularMaioresGastos,
  calcularMesesConcluidos,
  calcularTotaisAno,
  calcularTotalConsolidadoPorMes,
  consolidarPlanejadoVsRealPorAno,
  encontrarMesMaisBarato,
  encontrarMesMaisCaro,
  mediaMensesConcluidos,
  type PosicaoMensalTotal,
  type SecaoPlanejadoVsReal,
} from "./relatorioAnual";
import type { IndicadorPlanejado } from "./relatorios";

function data(ano: number, mes: number, dia = 1): Date {
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function indicador(
  planejadoCentavos: number,
  realCentavos: number,
): IndicadorPlanejado {
  return {
    planejadoCentavos,
    realCentavos,
    diferencaCentavos: planejadoCentavos - realCentavos,
    percentual:
      planejadoCentavos === 0 ? null : (realCentavos / planejadoCentavos) * 100,
    dentroDoPlanejado: realCentavos <= planejadoCentavos,
  };
}

function mesesVazios(
  planejadoCentavos: number,
  realCentavos: number,
): SecaoPlanejadoVsReal["itens"][number]["meses"] {
  return Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    ...indicador(i === 0 ? planejadoCentavos : 0, i === 0 ? realCentavos : 0),
  }));
}

describe("calcularEvolucaoPatrimonio", () => {
  it("soma posições de bancos/titulares diferentes lançadas no mesmo mês", () => {
    const posicoes: PosicaoMensalTotal[] = [
      { mes: data(2026, 1), valorCentavos: 100_000 },
      { mes: data(2026, 1), valorCentavos: 50_000 },
      { mes: data(2026, 2), valorCentavos: 160_000 },
    ];

    const evolucao = calcularEvolucaoPatrimonio(posicoes);

    expect(evolucao).toEqual([
      { mes: data(2026, 1), valorCentavos: 150_000 },
      { mes: data(2026, 2), valorCentavos: 160_000 },
    ]);
  });

  it("normaliza qualquer dia do mês para o dia 1 ao agrupar", () => {
    const posicoes: PosicaoMensalTotal[] = [
      { mes: data(2026, 3, 15), valorCentavos: 10_000 },
      { mes: data(2026, 3, 28), valorCentavos: 20_000 },
    ];

    const evolucao = calcularEvolucaoPatrimonio(posicoes);

    expect(evolucao).toEqual([
      { mes: data(2026, 3, 1), valorCentavos: 30_000 },
    ]);
  });

  it("ordena a série cronologicamente independente da ordem de entrada", () => {
    const posicoes: PosicaoMensalTotal[] = [
      { mes: data(2026, 3), valorCentavos: 30_000 },
      { mes: data(2026, 1), valorCentavos: 10_000 },
      { mes: data(2026, 2), valorCentavos: 20_000 },
    ];

    const evolucao = calcularEvolucaoPatrimonio(posicoes);

    expect(evolucao.map((p) => p.mes.getUTCMonth() + 1)).toEqual([1, 2, 3]);
  });

  it("omite meses sem nenhuma posição lançada, em vez de assumir zero", () => {
    const posicoes: PosicaoMensalTotal[] = [
      { mes: data(2026, 1), valorCentavos: 10_000 },
      { mes: data(2026, 5), valorCentavos: 15_000 },
    ];

    expect(calcularEvolucaoPatrimonio(posicoes)).toHaveLength(2);
  });

  it("retorna série vazia quando não há posições", () => {
    expect(calcularEvolucaoPatrimonio([])).toEqual([]);
  });
});

describe("consolidarPlanejadoVsRealPorAno", () => {
  const itemGabi = {
    categoriaId: "mercado",
    subcategoriaId: null,
    meses: mesesVazios(10_000, 8_000),
    acumulado: indicador(10_000, 8_000),
  };
  const itemIsa = {
    categoriaId: "mercado",
    subcategoriaId: null,
    meses: mesesVazios(5_000, 5_000),
    acumulado: indicador(5_000, 5_000),
  };
  const secaoGabi: SecaoPlanejadoVsReal = {
    pessoaId: "gabi",
    tipo: "INDIVIDUAL",
    label: "Gabi",
    itens: [itemGabi],
  };
  const secaoIsa: SecaoPlanejadoVsReal = {
    pessoaId: "isa",
    tipo: "INDIVIDUAL",
    label: "Isa",
    itens: [itemIsa],
  };
  const secaoCasal: SecaoPlanejadoVsReal = {
    pessoaId: "casal",
    tipo: "CASAL",
    label: "Gabi & Isa",
    itens: [
      {
        categoriaId: "mercado",
        subcategoriaId: null,
        meses: mesesVazios(15_000, 13_000),
        acumulado: indicador(15_000, 13_000),
      },
    ],
  };

  it("soma só as seções INDIVIDUAL quando há mais de uma seção", () => {
    const [item] = consolidarPlanejadoVsRealPorAno([
      secaoGabi,
      secaoIsa,
      secaoCasal,
    ]);

    expect(item.planejadoAnoCentavos).toBe(15_000);
    expect(item.realAnoCentavos).toBe(13_000);
  });

  it("usa a seção única diretamente quando é a única presente, mesmo sendo de grupo", () => {
    const [item] = consolidarPlanejadoVsRealPorAno([secaoCasal]);

    expect(item.planejadoAnoCentavos).toBe(15_000);
    expect(item.realAnoCentavos).toBe(13_000);
  });

  it("retorna lista vazia quando não há itens", () => {
    expect(consolidarPlanejadoVsRealPorAno([])).toEqual([]);
  });
});

describe("calcularDistribuicaoPorPessoa", () => {
  it("inclui só pessoas INDIVIDUAL com itens", () => {
    const secoes: SecaoPlanejadoVsReal[] = [
      {
        pessoaId: "gabi",
        tipo: "INDIVIDUAL",
        label: "Gabi",
        itens: [
          {
            categoriaId: "mercado",
            subcategoriaId: null,
            meses: [],
            acumulado: indicador(10_000, 8_000),
          },
        ],
      },
      { pessoaId: "isa", tipo: "INDIVIDUAL", label: "Isa", itens: [] },
      {
        pessoaId: "casal",
        tipo: "CASAL",
        label: "Casal",
        itens: [
          {
            categoriaId: "mercado",
            subcategoriaId: null,
            meses: [],
            acumulado: indicador(15_000, 13_000),
          },
        ],
      },
    ];

    expect(calcularDistribuicaoPorPessoa(secoes)).toEqual([
      { pessoaId: "gabi", label: "Gabi", totalCentavos: 8_000 },
    ]);
  });
});

describe("calcularTotalConsolidadoPorMes e calcularTotaisAno", () => {
  const itens = [
    {
      categoriaId: "mercado",
      subcategoriaId: null,
      meses: [
        { planejadoCentavos: 10_000, realCentavos: 8_000 },
        { planejadoCentavos: 10_000, realCentavos: 12_000 },
        ...Array.from({ length: 10 }, () => ({
          planejadoCentavos: 0,
          realCentavos: 0,
        })),
      ],
      planejadoAnoCentavos: 20_000,
      realAnoCentavos: 20_000,
    },
  ];

  it("soma o real de todos os itens mês a mês", () => {
    const porMes = calcularTotalConsolidadoPorMes(itens);
    expect(porMes[0]).toBe(8_000);
    expect(porMes[1]).toBe(12_000);
    expect(porMes[2]).toBe(0);
  });

  it("soma planejado/real do ano e calcula economia", () => {
    expect(calcularTotaisAno(itens)).toEqual({
      totalPlanejadoAno: 20_000,
      totalRealAno: 20_000,
      economiaTotalAno: 0,
    });
  });
});

describe("calcularMesesConcluidos", () => {
  it("retorna 12 para anos passados", () => {
    expect(calcularMesesConcluidos(2024, data(2026, 7))).toBe(12);
  });

  it("retorna 0 para anos futuros", () => {
    expect(calcularMesesConcluidos(2027, data(2026, 7))).toBe(0);
  });

  it("retorna o índice do mês corrente (não incluído) para o ano atual", () => {
    expect(calcularMesesConcluidos(2026, data(2026, 7, 20))).toBe(6);
  });
});

describe("mediaMensesConcluidos", () => {
  it("retorna null quando não há meses concluídos", () => {
    expect(mediaMensesConcluidos([100, 200], 0)).toBeNull();
  });

  it("calcula a média só dos meses concluídos", () => {
    expect(mediaMensesConcluidos([100, 200, 900], 2)).toBe(150);
  });
});

describe("encontrarMesMaisCaro e encontrarMesMaisBarato", () => {
  const porMes = [100, 0, 300, 50, 0];

  it("encontra o índice do maior valor", () => {
    expect(encontrarMesMaisCaro(porMes)).toBe(2);
  });

  it("encontra o índice do menor valor positivo, ignorando zeros", () => {
    expect(encontrarMesMaisBarato(porMes)).toBe(3);
  });

  it("retorna 0 quando todos os valores são zero", () => {
    expect(encontrarMesMaisBarato([0, 0, 0])).toBe(0);
  });
});

describe("calcularMaioresGastos", () => {
  it("ordena decrescente e limita ao top N", () => {
    const resumo = [
      {
        categoriaId: "a",
        totalCentavos: 100,
        percentualDoTotal: 10,
        mediaMensalCentavos: 8,
        porMes: {},
      },
      {
        categoriaId: "b",
        totalCentavos: 300,
        percentualDoTotal: 30,
        mediaMensalCentavos: 25,
        porMes: {},
      },
      {
        categoriaId: "c",
        totalCentavos: 200,
        percentualDoTotal: 20,
        mediaMensalCentavos: 16,
        porMes: {},
      },
    ];

    expect(calcularMaioresGastos(resumo, 2).map((r) => r.categoriaId)).toEqual([
      "b",
      "c",
    ]);
  });
});

describe("calcularIndicadoresResumoAnual", () => {
  it("calcula taxa de poupança, % de despesa e variação vs. ano anterior", () => {
    const resultado = calcularIndicadoresResumoAnual({
      saldo: {
        ano: 2026,
        receitaCentavos: 100_000,
        despesaCentavos: 60_000,
        saldoCentavos: 40_000,
        porMes: [],
      },
      receitaAnoAnterior: 80_000,
      saldoAnoAnteriorCentavos: 10_000,
    });

    expect(resultado.taxaPoupancaPercentual).toBe(40);
    expect(resultado.despesaPercentualReceita).toBe(60);
    expect(resultado.variacaoReceitaPercentual).toBe(25);
    expect(resultado.saldoAcumuladoCentavos).toBe(50_000);
  });

  it("retorna variação nula quando não há receita do ano anterior", () => {
    const resultado = calcularIndicadoresResumoAnual({
      saldo: {
        ano: 2026,
        receitaCentavos: 100_000,
        despesaCentavos: 0,
        saldoCentavos: 100_000,
        porMes: [],
      },
      receitaAnoAnterior: null,
      saldoAnoAnteriorCentavos: 0,
    });

    expect(resultado.variacaoReceitaPercentual).toBeNull();
  });

  it("retorna zero para taxas quando a receita do ano é zero", () => {
    const resultado = calcularIndicadoresResumoAnual({
      saldo: {
        ano: 2026,
        receitaCentavos: 0,
        despesaCentavos: 0,
        saldoCentavos: 0,
        porMes: [],
      },
      receitaAnoAnterior: null,
      saldoAnoAnteriorCentavos: 0,
    });

    expect(resultado.taxaPoupancaPercentual).toBe(0);
    expect(resultado.despesaPercentualReceita).toBe(0);
  });
});
