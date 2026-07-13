import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { limparBanco, prismaTest } from "@/test/prisma";
import { criarPessoa } from "./pessoas";
import { criarBanco } from "./bancos";
import { criarCategoria } from "./categorias";
import {
  ParcelamentoComLancamentosRealizadosError,
  ParcelamentoConcluidoError,
  ParcelamentoJaQuitadoError,
  ParcelamentoModoInvalidoError,
  alterarModoParcelamento,
  atualizarParcelamento,
  buscarParcelamento,
  criarParcelamento,
  encontrarParcelamentoCorrespondente,
  lancarProximaParcelaGradual,
  listarParcelamentos,
  quitarAntecipadamente,
  removerParcelamento,
} from "./parcelamentos";

async function criarHousehold(nome = "Isa & Gabi") {
  return prismaTest.household.create({ data: { nome } });
}

async function montarBase(householdNome = "Isa & Gabi") {
  const household = await criarHousehold(householdNome);
  const isa = await criarPessoa(prismaTest, household.id, {
    nome: "Isa",
    tipo: "INDIVIDUAL",
  });
  const banco = await criarBanco(prismaTest, household.id, {
    nome: "Nubank",
    tipo: "CARTAO_CREDITO",
  });
  const categoria = await criarCategoria(prismaTest, household.id, {
    nome: "Compras",
  });
  return { household, isa, banco, categoria };
}

function inputBase(
  overrides: Partial<Parameters<typeof criarParcelamento>[2]> = {},
) {
  return {
    descricaoOrigem: "LOJA X PARCELA 1/12",
    descricaoPropria: "Compra parcelada",
    valorParcelaCentavos: 10000,
    quantidadeParcelas: 12,
    dataPrimeiraParcela: new Date(Date.UTC(2026, 0, 10)),
    modo: "GRADUAL" as const,
    categoriaId: null,
    subcategoriaId: null,
    bancoId: "",
    pessoaDivisaoId: "",
    pessoaPagouId: "",
    tipoGasto: "VARIAVEL" as const,
    ...overrides,
  };
}

beforeAll(async () => {
  await limparBanco();
});

afterEach(async () => {
  await limparBanco();
});

afterAll(async () => {
  await prismaTest.$disconnect();
});

describe("criarParcelamento", () => {
  it("modo GRADUAL cria só a parcela atual", async () => {
    const { household, isa, banco } = await montarBase();
    const parcelamento = await criarParcelamento(
      prismaTest,
      household.id,
      inputBase({ bancoId: banco.id, pessoaDivisaoId: isa.id, pessoaPagouId: isa.id }),
    );

    expect(parcelamento?.valorTotalCentavos).toBe(120000);
    expect(parcelamento?.lancamentos).toHaveLength(1);
    expect(parcelamento?.lancamentos[0].numeroParcela).toBe(1);
    expect(parcelamento?.lancamentos[0].previsto).toBe(false);
    expect(parcelamento?.lancamentos[0].valorCentavos).toBe(10000);
  });

  it("modo AVISTA cria um único lançamento com o valor total", async () => {
    const { household, isa, banco } = await montarBase();
    const parcelamento = await criarParcelamento(
      prismaTest,
      household.id,
      inputBase({
        bancoId: banco.id,
        pessoaDivisaoId: isa.id,
        pessoaPagouId: isa.id,
        modo: "AVISTA",
      }),
    );

    expect(parcelamento?.lancamentos).toHaveLength(1);
    expect(parcelamento?.lancamentos[0].numeroParcela).toBeNull();
    expect(parcelamento?.lancamentos[0].valorCentavos).toBe(120000);
    expect(parcelamento?.lancamentos[0].previsto).toBe(false);
  });

  it("modo PREVISAO cria todas as parcelas, só a 1ª não é previsão", async () => {
    const { household, isa, banco } = await montarBase();
    const parcelamento = await criarParcelamento(
      prismaTest,
      household.id,
      inputBase({
        bancoId: banco.id,
        pessoaDivisaoId: isa.id,
        pessoaPagouId: isa.id,
        modo: "PREVISAO",
        quantidadeParcelas: 3,
      }),
    );

    expect(parcelamento?.lancamentos).toHaveLength(3);
    const soma = parcelamento!.lancamentos.reduce(
      (acc, l) => acc + l.valorCentavos,
      0,
    );
    expect(soma).toBe(30000);
    expect(parcelamento!.lancamentos[0].previsto).toBe(false);
    expect(parcelamento!.lancamentos[1].previsto).toBe(true);
    expect(parcelamento!.lancamentos[2].previsto).toBe(true);
    expect(
      parcelamento!.lancamentos.map((l) => l.data.toISOString().slice(0, 10)),
    ).toEqual(["2026-01-10", "2026-02-10", "2026-03-10"]);
  });

  it("retorna null com referências inválidas", async () => {
    const { household, isa } = await montarBase();
    const parcelamento = await criarParcelamento(
      prismaTest,
      household.id,
      inputBase({
        bancoId: "banco-inexistente",
        pessoaDivisaoId: isa.id,
        pessoaPagouId: isa.id,
      }),
    );
    expect(parcelamento).toBeNull();
  });
});

describe("escopo por household", () => {
  it("não enxerga/edita parcelamento de outro household", async () => {
    const { household, isa, banco } = await montarBase();
    const outro = await criarHousehold("Outra Casa");
    const parcelamento = await criarParcelamento(
      prismaTest,
      household.id,
      inputBase({ bancoId: banco.id, pessoaDivisaoId: isa.id, pessoaPagouId: isa.id }),
    );

    expect(await buscarParcelamento(prismaTest, outro.id, parcelamento!.id)).toBeNull();
    expect(
      await atualizarParcelamento(prismaTest, outro.id, parcelamento!.id, {
        descricaoPropria: "hack",
      }),
    ).toBeNull();
  });
});

describe("alterarModoParcelamento", () => {
  it("GRADUAL -> PREVISAO cria as parcelas futuras faltantes", async () => {
    const { household, isa, banco } = await montarBase();
    const parcelamento = await criarParcelamento(
      prismaTest,
      household.id,
      inputBase({
        bancoId: banco.id,
        pessoaDivisaoId: isa.id,
        pessoaPagouId: isa.id,
        quantidadeParcelas: 3,
      }),
    );

    const atualizado = await alterarModoParcelamento(
      prismaTest,
      household.id,
      parcelamento!.id,
      "PREVISAO",
    );

    expect(atualizado?.modo).toBe("PREVISAO");
    expect(atualizado?.lancamentos).toHaveLength(3);
    expect(atualizado?.lancamentos.filter((l) => l.previsto)).toHaveLength(2);
  });

  it("PREVISAO -> GRADUAL apaga as previstas futuras e mantém as realizadas", async () => {
    const { household, isa, banco } = await montarBase();
    const parcelamento = await criarParcelamento(
      prismaTest,
      household.id,
      inputBase({
        bancoId: banco.id,
        pessoaDivisaoId: isa.id,
        pessoaPagouId: isa.id,
        modo: "PREVISAO",
        quantidadeParcelas: 3,
      }),
    );

    const atualizado = await alterarModoParcelamento(
      prismaTest,
      household.id,
      parcelamento!.id,
      "GRADUAL",
    );

    expect(atualizado?.modo).toBe("GRADUAL");
    expect(atualizado?.lancamentos).toHaveLength(1);
    expect(atualizado?.lancamentos[0].previsto).toBe(false);
  });

  it("GRADUAL -> AVISTA consolida tudo num único lançamento com o valor total", async () => {
    const { household, isa, banco } = await montarBase();
    const parcelamento = await criarParcelamento(
      prismaTest,
      household.id,
      inputBase({
        bancoId: banco.id,
        pessoaDivisaoId: isa.id,
        pessoaPagouId: isa.id,
        quantidadeParcelas: 6,
      }),
    );
    // Lança mais uma parcela antes de trocar de modo, pra garantir que a
    // consolidação apaga TODAS as parcelas (não só as futuras/previstas).
    await lancarProximaParcelaGradual(prismaTest, household.id, parcelamento!.id);

    const atualizado = await alterarModoParcelamento(
      prismaTest,
      household.id,
      parcelamento!.id,
      "AVISTA",
    );

    expect(atualizado?.modo).toBe("AVISTA");
    expect(atualizado?.lancamentos).toHaveLength(1);
    expect(atualizado?.lancamentos[0].numeroParcela).toBeNull();
    expect(atualizado?.lancamentos[0].previsto).toBe(false);
    expect(atualizado?.lancamentos[0].valorCentavos).toBe(60000);
  });

  it("PREVISAO -> AVISTA consolida tudo num único lançamento com o valor total", async () => {
    const { household, isa, banco } = await montarBase();
    const parcelamento = await criarParcelamento(
      prismaTest,
      household.id,
      inputBase({
        bancoId: banco.id,
        pessoaDivisaoId: isa.id,
        pessoaPagouId: isa.id,
        modo: "PREVISAO",
        quantidadeParcelas: 3,
      }),
    );

    const atualizado = await alterarModoParcelamento(
      prismaTest,
      household.id,
      parcelamento!.id,
      "AVISTA",
    );

    expect(atualizado?.modo).toBe("AVISTA");
    expect(atualizado?.lancamentos).toHaveLength(1);
    expect(atualizado?.lancamentos[0].valorCentavos).toBe(30000);
  });

  it("transições a partir de AVISTA lançam erro", async () => {
    const { household, isa, banco } = await montarBase();
    const parcelamento = await criarParcelamento(
      prismaTest,
      household.id,
      inputBase({
        bancoId: banco.id,
        pessoaDivisaoId: isa.id,
        pessoaPagouId: isa.id,
        modo: "AVISTA",
      }),
    );

    await expect(
      alterarModoParcelamento(prismaTest, household.id, parcelamento!.id, "GRADUAL"),
    ).rejects.toThrow(ParcelamentoModoInvalidoError);
  });

  it("lança erro se já quitado", async () => {
    const { household, isa, banco } = await montarBase();
    const parcelamento = await criarParcelamento(
      prismaTest,
      household.id,
      inputBase({ bancoId: banco.id, pessoaDivisaoId: isa.id, pessoaPagouId: isa.id }),
    );
    await quitarAntecipadamente(prismaTest, household.id, parcelamento!.id, {
      descontoCentavos: 0,
    });

    await expect(
      alterarModoParcelamento(prismaTest, household.id, parcelamento!.id, "PREVISAO"),
    ).rejects.toThrow(ParcelamentoJaQuitadoError);
  });
});

describe("lancarProximaParcelaGradual", () => {
  it("lança a próxima parcela na sequência", async () => {
    const { household, isa, banco } = await montarBase();
    const parcelamento = await criarParcelamento(
      prismaTest,
      household.id,
      inputBase({
        bancoId: banco.id,
        pessoaDivisaoId: isa.id,
        pessoaPagouId: isa.id,
        quantidadeParcelas: 3,
      }),
    );

    const proxima = await lancarProximaParcelaGradual(
      prismaTest,
      household.id,
      parcelamento!.id,
    );

    expect(proxima?.numeroParcela).toBe(2);
    expect(proxima?.data.toISOString().slice(0, 10)).toBe("2026-02-10");
  });

  it("lança erro se não estiver em modo GRADUAL", async () => {
    const { household, isa, banco } = await montarBase();
    const parcelamento = await criarParcelamento(
      prismaTest,
      household.id,
      inputBase({
        bancoId: banco.id,
        pessoaDivisaoId: isa.id,
        pessoaPagouId: isa.id,
        modo: "AVISTA",
      }),
    );

    await expect(
      lancarProximaParcelaGradual(prismaTest, household.id, parcelamento!.id),
    ).rejects.toThrow(ParcelamentoModoInvalidoError);
  });

  it("lança erro quando já lançou todas as parcelas", async () => {
    const { household, isa, banco } = await montarBase();
    const parcelamento = await criarParcelamento(
      prismaTest,
      household.id,
      inputBase({
        bancoId: banco.id,
        pessoaDivisaoId: isa.id,
        pessoaPagouId: isa.id,
        quantidadeParcelas: 2,
      }),
    );
    await lancarProximaParcelaGradual(prismaTest, household.id, parcelamento!.id);

    await expect(
      lancarProximaParcelaGradual(prismaTest, household.id, parcelamento!.id),
    ).rejects.toThrow(ParcelamentoConcluidoError);
  });
});

describe("quitarAntecipadamente", () => {
  it("cria lançamento de quitação com o valor restante, sem desconto", async () => {
    const { household, isa, banco } = await montarBase();
    const parcelamento = await criarParcelamento(
      prismaTest,
      household.id,
      inputBase({
        bancoId: banco.id,
        pessoaDivisaoId: isa.id,
        pessoaPagouId: isa.id,
        quantidadeParcelas: 12,
      }),
    );

    const resultado = await quitarAntecipadamente(
      prismaTest,
      household.id,
      parcelamento!.id,
      { descontoCentavos: 0 },
    );

    // 1 parcela já lançada (10000), restam 11 (110000)
    expect(resultado?.lancamentoQuitacao?.valorCentavos).toBe(110000);
    expect(resultado?.parcelamento.quitadoEm).not.toBeNull();
  });

  it("aplica desconto no valor da quitação", async () => {
    const { household, isa, banco } = await montarBase();
    const parcelamento = await criarParcelamento(
      prismaTest,
      household.id,
      inputBase({
        bancoId: banco.id,
        pessoaDivisaoId: isa.id,
        pessoaPagouId: isa.id,
        quantidadeParcelas: 12,
      }),
    );

    const resultado = await quitarAntecipadamente(
      prismaTest,
      household.id,
      parcelamento!.id,
      { descontoCentavos: 5000 },
    );

    expect(resultado?.lancamentoQuitacao?.valorCentavos).toBe(105000);
  });

  it("em modo PREVISAO, apaga as parcelas futuras e cria a quitação", async () => {
    const { household, isa, banco } = await montarBase();
    const parcelamento = await criarParcelamento(
      prismaTest,
      household.id,
      inputBase({
        bancoId: banco.id,
        pessoaDivisaoId: isa.id,
        pessoaPagouId: isa.id,
        modo: "PREVISAO",
        quantidadeParcelas: 3,
      }),
    );

    const resultado = await quitarAntecipadamente(
      prismaTest,
      household.id,
      parcelamento!.id,
      { descontoCentavos: 0 },
    );

    const busca = await buscarParcelamento(prismaTest, household.id, parcelamento!.id);
    // 1 realizada (mantida) + 1 de quitação = 2 (as 2 previstas foram apagadas)
    expect(busca?.lancamentos).toHaveLength(2);
    expect(resultado?.lancamentoQuitacao?.valorCentavos).toBe(20000);
  });

  it("lança erro se já quitado", async () => {
    const { household, isa, banco } = await montarBase();
    const parcelamento = await criarParcelamento(
      prismaTest,
      household.id,
      inputBase({ bancoId: banco.id, pessoaDivisaoId: isa.id, pessoaPagouId: isa.id }),
    );
    await quitarAntecipadamente(prismaTest, household.id, parcelamento!.id, {
      descontoCentavos: 0,
    });

    await expect(
      quitarAntecipadamente(prismaTest, household.id, parcelamento!.id, {
        descontoCentavos: 0,
      }),
    ).rejects.toThrow(ParcelamentoJaQuitadoError);
  });
});

describe("removerParcelamento", () => {
  it("apaga parcelamento sem lançamentos realizados (modo PREVISAO ainda intocado)", async () => {
    const { household, isa, banco } = await montarBase();
    const parcelamento = await criarParcelamento(
      prismaTest,
      household.id,
      inputBase({
        bancoId: banco.id,
        pessoaDivisaoId: isa.id,
        pessoaPagouId: isa.id,
        modo: "PREVISAO",
        quantidadeParcelas: 3,
      }),
    );
    // A 1ª parcela de PREVISAO já é "realizada" (previsto=false) — então
    // remover deveria falhar aqui; testamos o caso de sucesso apagando-a antes.
    await prismaTest.lancamento.deleteMany({
      where: { parcelamentoId: parcelamento!.id, previsto: false },
    });

    await removerParcelamento(prismaTest, household.id, parcelamento!.id);
    expect(await buscarParcelamento(prismaTest, household.id, parcelamento!.id)).toBeNull();
  });

  it("lança erro se já existem parcelas realizadas", async () => {
    const { household, isa, banco } = await montarBase();
    const parcelamento = await criarParcelamento(
      prismaTest,
      household.id,
      inputBase({ bancoId: banco.id, pessoaDivisaoId: isa.id, pessoaPagouId: isa.id }),
    );

    await expect(
      removerParcelamento(prismaTest, household.id, parcelamento!.id),
    ).rejects.toThrow(ParcelamentoComLancamentosRealizadosError);
  });
});

describe("encontrarParcelamentoCorrespondente", () => {
  it("encontra parcelamento aberto com os mesmos dados de compra", async () => {
    const { household, isa, banco } = await montarBase();
    const parcelamento = await criarParcelamento(
      prismaTest,
      household.id,
      inputBase({ bancoId: banco.id, pessoaDivisaoId: isa.id, pessoaPagouId: isa.id }),
    );

    const encontrado = await encontrarParcelamentoCorrespondente(
      prismaTest,
      household.id,
      {
        bancoId: banco.id,
        valorTotalCentavos: parcelamento!.valorTotalCentavos,
        quantidadeParcelas: parcelamento!.quantidadeParcelas,
        dataPrimeiraParcela: parcelamento!.dataPrimeiraParcela,
      },
    );

    expect(encontrado?.id).toBe(parcelamento!.id);
  });

  it("não encontra parcelamento já quitado", async () => {
    const { household, isa, banco } = await montarBase();
    const parcelamento = await criarParcelamento(
      prismaTest,
      household.id,
      inputBase({ bancoId: banco.id, pessoaDivisaoId: isa.id, pessoaPagouId: isa.id }),
    );
    await quitarAntecipadamente(prismaTest, household.id, parcelamento!.id, {
      descontoCentavos: 0,
    });

    const encontrado = await encontrarParcelamentoCorrespondente(
      prismaTest,
      household.id,
      {
        bancoId: banco.id,
        valorTotalCentavos: parcelamento!.valorTotalCentavos,
        quantidadeParcelas: parcelamento!.quantidadeParcelas,
        dataPrimeiraParcela: parcelamento!.dataPrimeiraParcela,
      },
    );

    expect(encontrado).toBeNull();
  });
});

describe("listarParcelamentos", () => {
  it("por padrão só lista os não quitados", async () => {
    const { household, isa, banco } = await montarBase();
    const p1 = await criarParcelamento(
      prismaTest,
      household.id,
      inputBase({ bancoId: banco.id, pessoaDivisaoId: isa.id, pessoaPagouId: isa.id }),
    );
    const p2 = await criarParcelamento(
      prismaTest,
      household.id,
      inputBase({ bancoId: banco.id, pessoaDivisaoId: isa.id, pessoaPagouId: isa.id }),
    );
    await quitarAntecipadamente(prismaTest, household.id, p2!.id, {
      descontoCentavos: 0,
    });

    const abertos = await listarParcelamentos(prismaTest, household.id);
    expect(abertos.map((p) => p.id)).toEqual([p1!.id]);

    const todos = await listarParcelamentos(prismaTest, household.id, {
      incluirQuitados: true,
    });
    expect(todos).toHaveLength(2);
  });
});
