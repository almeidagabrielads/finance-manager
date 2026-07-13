import { describe, expect, it } from "vitest";
import {
  calcularSaldoComprometido,
  gerarInsightComprometido,
  type ParcelamentoParaComprometido,
} from "./comprometido";

function parcelamento(
  overrides: Partial<ParcelamentoParaComprometido> = {},
): ParcelamentoParaComprometido {
  return {
    modo: "GRADUAL",
    quitadoEm: null,
    valorTotalCentavos: 120000,
    quantidadeParcelas: 12,
    dataPrimeiraParcela: new Date(Date.UTC(2026, 0, 10)),
    numerosParcelaLancados: [1],
    ...overrides,
  };
}

describe("calcularSaldoComprometido", () => {
  it("soma só o que falta de parcelamentos GRADUAL abertos", () => {
    const resultado = calcularSaldoComprometido([parcelamento()]);
    // 12 parcelas de 10000, 1 já lançada -> restam 11 * 10000 = 110000
    expect(resultado.totalComprometidoCentavos).toBe(110000);
  });

  it("ignora parcelamentos AVISTA", () => {
    const resultado = calcularSaldoComprometido([
      parcelamento({ modo: "AVISTA", numerosParcelaLancados: [] }),
    ]);
    expect(resultado.totalComprometidoCentavos).toBe(0);
  });

  it("ignora parcelamentos PREVISAO (já contados como real)", () => {
    const resultado = calcularSaldoComprometido([
      parcelamento({ modo: "PREVISAO", numerosParcelaLancados: [1] }),
    ]);
    expect(resultado.totalComprometidoCentavos).toBe(0);
  });

  it("ignora parcelamentos já quitados", () => {
    const resultado = calcularSaldoComprometido([
      parcelamento({ quitadoEm: new Date() }),
    ]);
    expect(resultado.totalComprometidoCentavos).toBe(0);
  });

  it("agrupa corretamente por mês", () => {
    const resultado = calcularSaldoComprometido([
      parcelamento({ quantidadeParcelas: 3, numerosParcelaLancados: [1] }),
    ]);
    expect(resultado.porMes.get("2026-02")).toBe(40000);
    expect(resultado.porMes.get("2026-03")).toBe(40000);
    expect(resultado.porMes.has("2026-01")).toBe(false);
  });

  it("soma múltiplos parcelamentos", () => {
    const resultado = calcularSaldoComprometido([
      parcelamento({ quantidadeParcelas: 2, numerosParcelaLancados: [1] }),
      parcelamento({ quantidadeParcelas: 2, numerosParcelaLancados: [1] }),
    ]);
    expect(resultado.totalComprometidoCentavos).toBe(120000);
  });
});

describe("gerarInsightComprometido", () => {
  it("retorna null quando não há comprometido", () => {
    expect(gerarInsightComprometido(0)).toBeNull();
  });

  it("retorna frase formatada em reais", () => {
    const frase = gerarInsightComprometido(110000);
    expect(frase).toMatch(/R\$\s*1\.100,00/);
    expect(frase).toContain("comprometidos em parcelas futuras (modo gradual).");
  });
});
