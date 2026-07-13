import { describe, expect, it } from "vitest";
import { detectarParcela } from "./parcelaDetector";

describe("detectarParcela", () => {
  it("detecta 'PARCELA X/Y'", () => {
    expect(detectarParcela("LOJA X PARCELA 3/12")).toEqual({
      atual: 3,
      total: 12,
    });
  });

  it("detecta 'PARC X/Y' com variações de espaço/ponto", () => {
    expect(detectarParcela("PARC 03/12 LOJA X")).toEqual({
      atual: 3,
      total: 12,
    });
    expect(detectarParcela("PARC. 1/3")).toEqual({ atual: 1, total: 3 });
  });

  it("detecta o fallback 'N/M' solto no fim da descrição", () => {
    expect(detectarParcela("AMAZON 1/3")).toEqual({ atual: 1, total: 3 });
  });

  it("é case-insensitive", () => {
    expect(detectarParcela("loja parcela 2/6")).toEqual({
      atual: 2,
      total: 6,
    });
  });

  it("retorna null quando não há nenhum padrão de parcela", () => {
    expect(detectarParcela("SUPERMERCADO EXTRA")).toBeNull();
  });

  it("guarda contra falso positivo de data no fim da descrição", () => {
    expect(detectarParcela("COMPRA REALIZADA 07/2024")).toBeNull();
  });

  it("guarda contra total menor que a parcela atual", () => {
    expect(detectarParcela("PARCELA 9/3")).toBeNull();
  });

  it("guarda contra total maior que 999", () => {
    expect(detectarParcela("MODELO 90/2000")).toBeNull();
  });

  it("prioriza o padrão com palavra-chave quando ambos aparecem", () => {
    // A palavra-chave "PARCELA" deve vencer o fallback solto, mesmo se a
    // descrição também tiver outro par "N/M" em outro lugar.
    expect(detectarParcela("LOJA COD 5/7 PARCELA 2/6")).toEqual({
      atual: 2,
      total: 6,
    });
  });
});
