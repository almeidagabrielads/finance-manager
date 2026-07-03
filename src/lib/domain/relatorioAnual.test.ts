import { describe, expect, it } from "vitest";
import {
  calcularEvolucaoPatrimonio,
  type PosicaoMensalTotal,
} from "./relatorioAnual";

function data(ano: number, mes: number, dia = 1): Date {
  return new Date(Date.UTC(ano, mes - 1, dia));
}

describe("calcularEvolucaoPatrimonio", () => {
  it("soma posições de bancos/titulares diferentes lançadas no mesmo mês", () => {
    const posicoes: PosicaoMensalTotal[] = [
      { mes: data(2026, 1), valorCentavos: 100_000 }, // Isa, Nubank
      { mes: data(2026, 1), valorCentavos: 50_000 }, // Gabi, Itaú
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

    const evolucao = calcularEvolucaoPatrimonio(posicoes);

    expect(evolucao).toHaveLength(2);
  });

  it("retorna série vazia quando não há posições", () => {
    expect(calcularEvolucaoPatrimonio([])).toEqual([]);
  });
});
