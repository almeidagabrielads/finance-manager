import { describe, expect, it } from "vitest";
import {
  dadosGraficoAnual,
  filtrarReceitas,
  formatarMesAno,
  labelSubtipoReceita,
  mesParaInputMonth,
  mesesDistintosOrdenados,
  ordenarReceitasPorMesDesc,
  totalPorAno,
  totalPorMes,
} from "./receitas";

type ReceitaTeste = {
  id: string;
  pessoaId: string;
  subtipo: string;
  descricao: string | null;
  valorCentavos: number;
  mes: string;
};

const receitas: ReceitaTeste[] = [
  {
    id: "1",
    pessoaId: "p1",
    subtipo: "SALARIO",
    descricao: null,
    valorCentavos: 500000,
    mes: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "2",
    pessoaId: "p2",
    subtipo: "VOUCHER",
    descricao: "Vale refeição",
    valorCentavos: 30000,
    mes: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "3",
    pessoaId: "p1",
    subtipo: "OUTROS",
    descricao: "Dividendos",
    valorCentavos: 12000,
    mes: "2026-07-01T00:00:00.000Z",
  },
  {
    id: "4",
    pessoaId: "p1",
    subtipo: "SALARIO",
    descricao: null,
    valorCentavos: 500000,
    mes: "2025-12-01T00:00:00.000Z",
  },
];

describe("labelSubtipoReceita", () => {
  it("retorna o label correspondente", () => {
    expect(labelSubtipoReceita("SALARIO")).toBe("Salário");
  });

  it("retorna 'Outros' para subtipo desconhecido", () => {
    expect(labelSubtipoReceita("INEXISTENTE")).toBe("Outros");
  });
});

describe("mesParaInputMonth", () => {
  it("extrai ano-mês de uma data ISO", () => {
    expect(mesParaInputMonth("2026-07-01T00:00:00.000Z")).toBe("2026-07");
  });
});

describe("formatarMesAno", () => {
  it("formata mês-ano por extenso", () => {
    expect(formatarMesAno("2026-07")).toBe("Julho 2026");
  });
});

describe("totalPorMes", () => {
  it("soma somente receitas do mês selecionado", () => {
    expect(totalPorMes(receitas, "2026-06")).toBe(530000);
  });

  it("retorna 0 quando não há receitas no mês", () => {
    expect(totalPorMes(receitas, "2026-01")).toBe(0);
  });
});

describe("totalPorAno", () => {
  it("soma somente receitas do ano informado", () => {
    expect(totalPorAno(receitas, 2026)).toBe(542000);
  });
});

describe("dadosGraficoAnual", () => {
  it("agrupa valores por mês e pessoa dentro do ano", () => {
    const dados = dadosGraficoAnual(receitas, 2026);
    expect(dados).toHaveLength(12);
    expect(dados[5]).toEqual({
      mes: 6,
      porPessoa: { p1: 500000, p2: 30000 },
    });
    expect(dados[6]).toEqual({ mes: 7, porPessoa: { p1: 12000 } });
    expect(dados[0]).toEqual({ mes: 1, porPessoa: {} });
  });
});

describe("filtrarReceitas", () => {
  it("filtra por mês no modo mensal", () => {
    const resultado = filtrarReceitas(
      receitas,
      {
        modo: "mensal",
        ano: 2026,
        mesSelecionadoStr: "2026-06",
        pessoaFiltro: null,
        busca: "",
      },
      () => [],
    );
    expect(resultado.map((r) => r.id)).toEqual(["1", "2"]);
  });

  it("filtra por ano no modo anual", () => {
    const resultado = filtrarReceitas(
      receitas,
      {
        modo: "anual",
        ano: 2026,
        mesSelecionadoStr: "",
        pessoaFiltro: null,
        busca: "",
      },
      () => [],
    );
    expect(resultado.map((r) => r.id)).toEqual(["1", "2", "3"]);
  });

  it("filtra por pessoa", () => {
    const resultado = filtrarReceitas(
      receitas,
      {
        modo: "anual",
        ano: 2026,
        mesSelecionadoStr: "",
        pessoaFiltro: "p2",
        busca: "",
      },
      () => [],
    );
    expect(resultado.map((r) => r.id)).toEqual(["2"]);
  });

  it("filtra por busca usando os campos informados", () => {
    const resultado = filtrarReceitas(
      receitas,
      {
        modo: "anual",
        ano: 2026,
        mesSelecionadoStr: "",
        pessoaFiltro: null,
        busca: "dividendos",
      },
      (r) => [r.descricao ?? ""],
    );
    expect(resultado.map((r) => r.id)).toEqual(["3"]);
  });
});

describe("ordenarReceitasPorMesDesc", () => {
  it("ordena do mês mais recente para o mais antigo sem mutar o original", () => {
    const ordenadas = ordenarReceitasPorMesDesc(receitas);
    expect(ordenadas.map((r) => r.id)).toEqual(["3", "1", "2", "4"]);
    expect(receitas.map((r) => r.id)).toEqual(["1", "2", "3", "4"]);
  });
});

describe("mesesDistintosOrdenados", () => {
  it("retorna os meses distintos preservando a ordem de entrada", () => {
    const ordenadas = ordenarReceitasPorMesDesc(receitas);
    expect(mesesDistintosOrdenados(ordenadas)).toEqual([
      "2026-07",
      "2026-06",
      "2025-12",
    ]);
  });
});
