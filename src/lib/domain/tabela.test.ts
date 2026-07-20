import { describe, expect, it } from "vitest";
import {
  filtroEstaAtivo,
  filtroVazio,
  ordenarLinhas,
  valorPassaFiltro,
} from "./tabela";

describe("filtroVazio / filtroEstaAtivo", () => {
  it("filtro de texto vazio não está ativo", () => {
    expect(filtroEstaAtivo(filtroVazio("texto"))).toBe(false);
  });

  it("filtro de opções com seleção está ativo", () => {
    expect(filtroEstaAtivo({ tipo: "opcoes", selecionadas: ["Mercado"] })).toBe(
      true,
    );
  });
});

describe("valorPassaFiltro", () => {
  it("texto ignora acentuação e maiúsculas", () => {
    const filtro = { tipo: "texto" as const, valor: "MERCADO" };
    expect(valorPassaFiltro("Mercado São José", filtro)).toBe(true);
    expect(valorPassaFiltro("Farmácia", filtro)).toBe(false);
  });

  it("numero respeita min e max", () => {
    const filtro = { tipo: "numero" as const, min: "10", max: "50" };
    expect(valorPassaFiltro(30, filtro)).toBe(true);
    expect(valorPassaFiltro(5, filtro)).toBe(false);
    expect(valorPassaFiltro(80, filtro)).toBe(false);
  });

  it("data respeita intervalo de/até", () => {
    const filtro = {
      tipo: "data" as const,
      de: "2026-01-01",
      ate: "2026-01-31",
    };
    expect(valorPassaFiltro("2026-01-15", filtro)).toBe(true);
    expect(valorPassaFiltro("2025-12-31", filtro)).toBe(false);
    expect(valorPassaFiltro("2026-02-01", filtro)).toBe(false);
  });

  it("opcoes filtra por selecionadas", () => {
    const filtro = { tipo: "opcoes" as const, selecionadas: ["Gabi", "Isa"] };
    expect(valorPassaFiltro("Gabi", filtro)).toBe(true);
    expect(valorPassaFiltro("Jader", filtro)).toBe(false);
  });
});

describe("ordenarLinhas", () => {
  it("ordena ascendente e descendente por número", () => {
    const linhas = [{ v: 3 }, { v: 1 }, { v: 2 }];
    expect(ordenarLinhas(linhas, (l) => l.v, "asc").map((l) => l.v)).toEqual([
      1, 2, 3,
    ]);
    expect(ordenarLinhas(linhas, (l) => l.v, "desc").map((l) => l.v)).toEqual([
      3, 2, 1,
    ]);
  });

  it("valores nulos vão para o início", () => {
    const linhas = [{ v: "b" as string | null }, { v: null }, { v: "a" }];
    expect(ordenarLinhas(linhas, (l) => l.v, "asc").map((l) => l.v)).toEqual([
      null,
      "a",
      "b",
    ]);
  });
});
