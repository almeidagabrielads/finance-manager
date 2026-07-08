import { describe, expect, it } from "vitest";
import { gerarInsightMensal } from "./insightsOrcamento";

describe("gerarInsightMensal", () => {
  it("retorna null quando não há categorias com planejado ou real", () => {
    expect(gerarInsightMensal([])).toBeNull();
    expect(
      gerarInsightMensal([
        { nome: "Moradia", planejadoCentavos: 0, realCentavos: 0 },
      ]),
    ).toBeNull();
  });

  it("combina maior economia e maior estouro na mesma frase", () => {
    const texto = gerarInsightMensal([
      { nome: "Alimentação", planejadoCentavos: 220_000, realCentavos: 185_040 },
      { nome: "Lazer & Viagem", planejadoCentavos: 150_000, realCentavos: 182_000 },
    ]);
    expect(texto).toContain("Alimentação");
    expect(texto).toContain("Lazer & Viagem");
    expect(texto).toContain("349,60");
    expect(texto).toContain("320,00");
  });

  it("só menciona economia quando não há estouro", () => {
    const texto = gerarInsightMensal([
      { nome: "Saúde", planejadoCentavos: 120_000, realCentavos: 95_000 },
    ]);
    expect(texto).toContain("Vocês economizaram");
    expect(texto).toContain("Saúde");
    expect(texto).toContain("250,00");
  });

  it("alerta quando só há estouro", () => {
    const texto = gerarInsightMensal([
      { nome: "Moradia", planejadoCentavos: 450_000, realCentavos: 455_000 },
    ]);
    expect(texto).toContain("Atenção");
    expect(texto).toContain("Moradia");
    expect(texto).toContain("50,00");
  });
});
