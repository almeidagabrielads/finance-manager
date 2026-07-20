import { describe, expect, it } from "vitest";
import {
  agregarIndicadorCategoria,
  indicadorVazio,
  top5PorRealizado,
  totalAnualCategoria,
} from "./orcamento";

describe("agregarIndicadorCategoria", () => {
  it("soma planejado e real das subcategorias ao indicador próprio", () => {
    const proprio = {
      ...indicadorVazio(),
      planejadoCentavos: 1000,
      realCentavos: 500,
    };
    const subs = [
      { ...indicadorVazio(), planejadoCentavos: 200, realCentavos: 100 },
      { ...indicadorVazio(), planejadoCentavos: 300, realCentavos: 400 },
    ];

    const resultado = agregarIndicadorCategoria(proprio, subs);

    expect(resultado.planejadoCentavos).toBe(1500);
    expect(resultado.realCentavos).toBe(1000);
    expect(resultado.diferencaCentavos).toBe(0);
    expect(resultado.percentual).toBeNull();
    expect(resultado.dentroDoPlanejado).toBe(true);
  });

  it("sem subcategorias retorna o indicador próprio zerado nos campos derivados", () => {
    const proprio = {
      ...indicadorVazio(),
      planejadoCentavos: 800,
      realCentavos: 900,
    };

    const resultado = agregarIndicadorCategoria(proprio, []);

    expect(resultado.planejadoCentavos).toBe(800);
    expect(resultado.realCentavos).toBe(900);
  });
});

describe("top5PorRealizado", () => {
  it("ordena por realCentavos decrescente e limita a 5 itens", () => {
    const itens = [
      { id: "a", realCentavos: 100 },
      { id: "b", realCentavos: 500 },
      { id: "c", realCentavos: 300 },
      { id: "d", realCentavos: 400 },
      { id: "e", realCentavos: 200 },
      { id: "f", realCentavos: 600 },
    ];

    const resultado = top5PorRealizado(itens);

    expect(resultado.map((i) => i.id)).toEqual(["f", "b", "d", "c", "e"]);
  });

  it("filtra itens com realCentavos zero ou negativo", () => {
    const itens = [
      { id: "a", realCentavos: 0 },
      { id: "b", realCentavos: 100 },
      { id: "c", realCentavos: -50 },
    ];

    const resultado = top5PorRealizado(itens);

    expect(resultado.map((i) => i.id)).toEqual(["b"]);
  });

  it("não muta o array original", () => {
    const itens = [
      { id: "a", realCentavos: 100 },
      { id: "b", realCentavos: 200 },
    ];
    const copia = [...itens];

    top5PorRealizado(itens);

    expect(itens).toEqual(copia);
  });
});

describe("totalAnualCategoria", () => {
  it("soma o total próprio com os totais das subcategorias", () => {
    expect(totalAnualCategoria(1000, [200, 300, 500])).toBe(2000);
  });

  it("sem subcategorias retorna o total próprio", () => {
    expect(totalAnualCategoria(1000, [])).toBe(1000);
  });
});
