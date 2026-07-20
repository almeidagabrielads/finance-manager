import { describe, expect, it } from "vitest";
import {
  agregarCategoriasDoMes,
  somaPesos,
  valorAtribuidoPorPessoa,
} from "./dashboardMensal";

describe("somaPesos", () => {
  it("soma os pesos dos integrantes", () => {
    expect(
      somaPesos([
        { pessoaId: "a", peso: 1 },
        { pessoaId: "b", peso: 3 },
      ]),
    ).toBe(4);
  });

  it("retorna 0 para lista vazia", () => {
    expect(somaPesos([])).toBe(0);
  });
});

describe("valorAtribuidoPorPessoa", () => {
  const lancamento = {
    valorCentavos: 10000,
    descontoCentavos: 0,
    pessoaDivisaoId: "grupo-1",
  };

  it("retorna o valor integral sem filtro", () => {
    expect(valorAtribuidoPorPessoa(lancamento, [], "")).toBe(10000);
  });

  it("retorna o valor integral quando o filtro é a própria pessoa/grupo do lançamento", () => {
    expect(valorAtribuidoPorPessoa(lancamento, [], "grupo-1")).toBe(10000);
  });

  it("retorna a fração proporcional ao peso quando filtra por integrante do grupo", () => {
    const pessoas = [
      {
        id: "grupo-1",
        integrantesDoGrupo: [
          { pessoaId: "p1", peso: 1 },
          { pessoaId: "p2", peso: 3 },
        ],
      },
    ];
    expect(valorAtribuidoPorPessoa(lancamento, pessoas, "p1")).toBe(2500);
    expect(valorAtribuidoPorPessoa(lancamento, pessoas, "p2")).toBe(7500);
  });

  it("desconta o valor de desconto antes de ratear", () => {
    const comDesconto = { ...lancamento, descontoCentavos: 2000 };
    const pessoas = [
      {
        id: "grupo-1",
        integrantesDoGrupo: [
          { pessoaId: "p1", peso: 1 },
          { pessoaId: "p2", peso: 1 },
        ],
      },
    ];
    expect(valorAtribuidoPorPessoa(comDesconto, pessoas, "p1")).toBe(4000);
  });

  it("retorna o valor integral quando a pessoa filtrada não integra o grupo", () => {
    const pessoas = [
      { id: "grupo-1", integrantesDoGrupo: [{ pessoaId: "p1", peso: 1 }] },
    ];
    expect(valorAtribuidoPorPessoa(lancamento, pessoas, "outra")).toBe(10000);
  });

  it("retorna o valor integral quando o grupo não tem pesos definidos", () => {
    const pessoas = [
      { id: "grupo-1", integrantesDoGrupo: [{ pessoaId: "p1", peso: 0 }] },
    ];
    expect(valorAtribuidoPorPessoa(lancamento, pessoas, "p1")).toBe(10000);
  });
});

describe("agregarCategoriasDoMes", () => {
  it("filtra categorias sem planejado e sem real", () => {
    const orcamento = [
      {
        categoriaId: "vazia",
        meses: [{ mes: 1, planejadoCentavos: 0, realCentavos: 0 }],
      },
      {
        categoriaId: "com-gasto",
        meses: [{ mes: 1, planejadoCentavos: 1000, realCentavos: 500 }],
      },
    ];
    const resultado = agregarCategoriasDoMes(orcamento, 1);
    expect(resultado.categorias).toHaveLength(1);
    expect(resultado.categorias[0].categoriaId).toBe("com-gasto");
  });

  it("soma múltiplas entradas da mesma categoria (categoria + subcategorias)", () => {
    const orcamento = [
      {
        categoriaId: "moradia",
        meses: [{ mes: 1, planejadoCentavos: 1000, realCentavos: 500 }],
      },
      {
        categoriaId: "moradia",
        meses: [{ mes: 1, planejadoCentavos: 500, realCentavos: 500 }],
      },
    ];
    const resultado = agregarCategoriasDoMes(orcamento, 1);
    expect(resultado.categorias).toEqual([
      { categoriaId: "moradia", planejadoCentavos: 1500, realCentavos: 1000 },
    ]);
    expect(resultado.totalPlanejadoCentavos).toBe(1500);
    expect(resultado.totalRealCentavos).toBe(1000);
  });

  it("ordena por maior percentual consumido primeiro", () => {
    const orcamento = [
      {
        categoriaId: "sob-controle",
        meses: [{ mes: 1, planejadoCentavos: 1000, realCentavos: 200 }],
      },
      {
        categoriaId: "estourou",
        meses: [{ mes: 1, planejadoCentavos: 1000, realCentavos: 1500 }],
      },
    ];
    const resultado = agregarCategoriasDoMes(orcamento, 1);
    expect(resultado.categorias.map((c) => c.categoriaId)).toEqual([
      "estourou",
      "sob-controle",
    ]);
  });

  it("categorias sem planejado (percentual infinito) aparecem primeiro", () => {
    const orcamento = [
      {
        categoriaId: "com-planejado",
        meses: [{ mes: 1, planejadoCentavos: 1000, realCentavos: 1000 }],
      },
      {
        categoriaId: "so-real",
        meses: [{ mes: 1, planejadoCentavos: 0, realCentavos: 100 }],
      },
    ];
    const resultado = agregarCategoriasDoMes(orcamento, 1);
    expect(resultado.categorias[0].categoriaId).toBe("so-real");
  });

  it("usa apenas o mês selecionado", () => {
    const orcamento = [
      {
        categoriaId: "a",
        meses: [
          { mes: 1, planejadoCentavos: 1000, realCentavos: 500 },
          { mes: 2, planejadoCentavos: 2000, realCentavos: 2000 },
        ],
      },
    ];
    const resultado = agregarCategoriasDoMes(orcamento, 2);
    expect(resultado.categorias[0]).toEqual({
      categoriaId: "a",
      planejadoCentavos: 2000,
      realCentavos: 2000,
    });
  });
});
