import { describe, expect, it } from "vitest";
import { diasAteResgate, diasParaFaixa } from "./investimentos";

describe("diasParaFaixa", () => {
  it("classifica null como indefinido", () => {
    expect(diasParaFaixa(null)).toBe("INDEFINIDO");
  });

  it("classifica 0 ou negativo como imediato", () => {
    expect(diasParaFaixa(0)).toBe("IMEDIATO");
    expect(diasParaFaixa(-5)).toBe("IMEDIATO");
  });

  it("classifica nos limites das faixas", () => {
    expect(diasParaFaixa(30)).toBe("ATE_30_DIAS");
    expect(diasParaFaixa(31)).toBe("ATE_90_DIAS");
    expect(diasParaFaixa(90)).toBe("ATE_90_DIAS");
    expect(diasParaFaixa(91)).toBe("ATE_180_DIAS");
    expect(diasParaFaixa(180)).toBe("ATE_180_DIAS");
    expect(diasParaFaixa(181)).toBe("ATE_365_DIAS");
    expect(diasParaFaixa(365)).toBe("ATE_365_DIAS");
    expect(diasParaFaixa(366)).toBe("MAIS_DE_1_ANO");
  });
});

describe("diasAteResgate", () => {
  it("usa liquidezDias quando informado", () => {
    const dias = diasAteResgate(
      { liquidezDias: 45, vencimento: null },
      new Date("2026-01-01"),
    );
    expect(dias).toBe(45);
  });

  it("calcula a partir da data de vencimento quando não há liquidezDias", () => {
    const dias = diasAteResgate(
      { liquidezDias: null, vencimento: new Date("2026-01-31") },
      new Date("2026-01-01"),
    );
    expect(dias).toBe(30);
  });

  it("nunca retorna dias negativos para vencimento no passado", () => {
    const dias = diasAteResgate(
      { liquidezDias: null, vencimento: new Date("2025-01-01") },
      new Date("2026-01-01"),
    );
    expect(dias).toBe(0);
  });

  it("retorna null quando não há liquidezDias nem vencimento", () => {
    const dias = diasAteResgate(
      { liquidezDias: null, vencimento: null },
      new Date("2026-01-01"),
    );
    expect(dias).toBeNull();
  });
});
