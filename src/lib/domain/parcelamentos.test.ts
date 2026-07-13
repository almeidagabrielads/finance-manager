import { describe, expect, it } from "vitest";
import {
  dataDaParcela,
  dividirParcelas,
  parcelasRestantes,
} from "./parcelamentos";

describe("dividirParcelas", () => {
  it("divide igualmente quando o valor é múltiplo da quantidade", () => {
    expect(dividirParcelas(1200, 4)).toEqual([300, 300, 300, 300]);
  });

  it("joga o resto na última parcela", () => {
    expect(dividirParcelas(1000, 3)).toEqual([333, 333, 334]);
  });

  it("funciona com o mínimo de 2 parcelas", () => {
    expect(dividirParcelas(101, 2)).toEqual([50, 51]);
  });

  it("soma sempre o valor total original", () => {
    const valores = dividirParcelas(999997, 13);
    expect(valores.reduce((a, b) => a + b, 0)).toBe(999997);
  });
});

describe("dataDaParcela", () => {
  it("mantém o mesmo dia em meses de mesmo tamanho", () => {
    const primeira = new Date(Date.UTC(2026, 0, 15)); // 15/jan/2026
    expect(dataDaParcela(primeira, 1)).toEqual(new Date(Date.UTC(2026, 1, 15)));
    expect(dataDaParcela(primeira, 2)).toEqual(new Date(Date.UTC(2026, 2, 15)));
  });

  it("faz clamp no dia 31 quando o mês de destino é mais curto", () => {
    const primeira = new Date(Date.UTC(2026, 0, 31)); // 31/jan/2026
    expect(dataDaParcela(primeira, 1)).toEqual(new Date(Date.UTC(2026, 1, 28))); // fev/2026 não é bissexto
    expect(dataDaParcela(primeira, 2)).toEqual(new Date(Date.UTC(2026, 2, 31))); // volta pro dia 31 em março
  });

  it("faz rollover de ano", () => {
    const primeira = new Date(Date.UTC(2026, 11, 10)); // 10/dez/2026
    expect(dataDaParcela(primeira, 1)).toEqual(new Date(Date.UTC(2027, 0, 10)));
  });

  it("índice 0 retorna a própria data da primeira parcela", () => {
    const primeira = new Date(Date.UTC(2026, 5, 20));
    expect(dataDaParcela(primeira, 0)).toEqual(primeira);
  });
});

describe("parcelasRestantes", () => {
  it("conta quantas parcelas ainda não foram lançadas", () => {
    expect(parcelasRestantes(12, [1, 2, 3])).toBe(9);
  });

  it("ignora números de parcela nulos (avista/quitação)", () => {
    expect(parcelasRestantes(5, [1, 2, null])).toBe(3);
  });

  it("não conta duplicados", () => {
    expect(parcelasRestantes(5, [1, 1, 2])).toBe(3);
  });

  it("retorna 0 quando todas foram lançadas", () => {
    expect(parcelasRestantes(3, [1, 2, 3])).toBe(0);
  });
});
