import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { limparBanco, prismaTest } from "@/test/prisma";
import { criarPessoa } from "./pessoas";
import { criarCategoria } from "./categorias";
import { criarBanco } from "./bancos";
import { criarLancamento } from "./lancamentos";
import { buscarSaldoDivisao } from "./split";

async function montarBase() {
  const household = await prismaTest.household.create({
    data: { nome: "Isa & Gabi" },
  });
  const isa = await criarPessoa(prismaTest, household.id, {
    nome: "Isa",
    tipo: "INDIVIDUAL",
  });
  const gabi = await criarPessoa(prismaTest, household.id, {
    nome: "Gabi",
    tipo: "INDIVIDUAL",
  });
  const casal = await criarPessoa(prismaTest, household.id, {
    nome: "Casal",
    tipo: "CASAL",
  });
  const categoria = await criarCategoria(prismaTest, household.id, {
    nome: "Moradia",
  });
  const banco = await criarBanco(prismaTest, household.id, {
    nome: "Nubank",
    tipo: "CONTA_CORRENTE",
  });
  return { household, isa, gabi, casal, categoria, banco };
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

describe("buscarSaldoDivisao", () => {
  it("detecta automaticamente as duas pessoas INDIVIDUAL do household e calcula o saldo", async () => {
    const { household, isa, gabi, casal, categoria, banco } =
      await montarBase();

    await criarLancamento(prismaTest, household.id, {
      data: new Date(Date.UTC(2026, 0, 10)),
      categoriaId: categoria.id,
      bancoId: banco.id,
      pessoaDivisaoId: casal.id,
      pessoaPagouId: isa.id,
      valorCentavos: 100_000,
    });

    const saldo = await buscarSaldoDivisao(prismaTest, household.id, {});

    expect(saldo).not.toBeNull();
    expect(saldo!.valorDevidoCentavos).toBe(50_000);
    expect(saldo!.pessoaDevedoraId).toBe(gabi.id);
  });

  it("filtra lançamentos pelo período informado", async () => {
    const { household, isa, gabi, categoria, banco } = await montarBase();

    await criarLancamento(prismaTest, household.id, {
      data: new Date(Date.UTC(2026, 0, 10)),
      categoriaId: categoria.id,
      bancoId: banco.id,
      pessoaDivisaoId: isa.id,
      pessoaPagouId: gabi.id,
      valorCentavos: 10_000,
    });
    await criarLancamento(prismaTest, household.id, {
      data: new Date(Date.UTC(2026, 1, 10)),
      categoriaId: categoria.id,
      bancoId: banco.id,
      pessoaDivisaoId: isa.id,
      pessoaPagouId: gabi.id,
      valorCentavos: 20_000,
    });

    const saldo = await buscarSaldoDivisao(prismaTest, household.id, {
      dataInicio: new Date(Date.UTC(2026, 0, 1)),
      dataFim: new Date(Date.UTC(2026, 0, 31)),
    });

    expect(saldo!.pagouPeloOutroCentavos[gabi.id]).toBe(10_000);
  });

  it("retorna null quando o household não tem duas pessoas INDIVIDUAL", async () => {
    const household = await prismaTest.household.create({
      data: { nome: "Sem casal" },
    });
    await criarPessoa(prismaTest, household.id, {
      nome: "Isa",
      tipo: "INDIVIDUAL",
    });

    const saldo = await buscarSaldoDivisao(prismaTest, household.id, {});

    expect(saldo).toBeNull();
  });
});
