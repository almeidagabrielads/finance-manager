import { describe, expect, it } from "vitest";
import { calcularSaldoDivisao, type LancamentoParaDivisao } from "./split";

const ISA = "isa";
const GABI = "gabi";
const JADER = "jader"; // terceiro (tipo OUTRO), fora do casal

function lancamento(
  parcial: Partial<LancamentoParaDivisao>,
): LancamentoParaDivisao {
  return {
    valorCentavos: 0,
    descontoCentavos: 0,
    pessoaDivisaoId: ISA,
    pessoaDivisaoTipo: "INDIVIDUAL",
    pessoaPagouId: ISA,
    ...parcial,
  };
}

describe("calcularSaldoDivisao", () => {
  it("gasto de família pago por um: quem pagou pagou metade em nome do outro", () => {
    const lancamentos = [
      lancamento({
        valorCentavos: 10_000,
        pessoaDivisaoId: "casal",
        pessoaDivisaoTipo: "CASAL",
        pessoaPagouId: ISA,
      }),
    ];

    const saldo = calcularSaldoDivisao(lancamentos, ISA, GABI);

    expect(saldo.pagouPeloOutroCentavos[ISA]).toBe(5_000);
    expect(saldo.pagouPeloOutroCentavos[GABI]).toBe(0);
    expect(saldo.diferencaCentavos).toBe(5_000);
    expect(saldo.pessoaDevedoraId).toBe(GABI);
    expect(saldo.valorDevidoCentavos).toBe(5_000);
  });

  it("gasto individual pago pelo outro: quem pagou pagou 100% em nome do dono", () => {
    const lancamentos = [
      lancamento({
        valorCentavos: 8_000,
        pessoaDivisaoId: ISA,
        pessoaDivisaoTipo: "INDIVIDUAL",
        pessoaPagouId: GABI,
      }),
    ];

    const saldo = calcularSaldoDivisao(lancamentos, ISA, GABI);

    expect(saldo.pagouPeloOutroCentavos[GABI]).toBe(8_000);
    expect(saldo.pagouPeloOutroCentavos[ISA]).toBe(0);
    expect(saldo.diferencaCentavos).toBe(-8_000);
    expect(saldo.pessoaDevedoraId).toBe(ISA);
    expect(saldo.valorDevidoCentavos).toBe(8_000);
  });

  it("gasto individual pago pelo próprio dono não gera débito", () => {
    const lancamentos = [
      lancamento({
        valorCentavos: 5_000,
        pessoaDivisaoId: ISA,
        pessoaDivisaoTipo: "INDIVIDUAL",
        pessoaPagouId: ISA,
      }),
    ];

    const saldo = calcularSaldoDivisao(lancamentos, ISA, GABI);

    expect(saldo.pagouPeloOutroCentavos[ISA]).toBe(0);
    expect(saldo.pagouPeloOutroCentavos[GABI]).toBe(0);
    expect(saldo.diferencaCentavos).toBe(0);
    expect(saldo.pessoaDevedoraId).toBeNull();
  });

  it("saldo líquido combina vários lançamentos e chega à diferença final", () => {
    const lancamentos = [
      // Isa paga aluguel do casal (R$1.000) -> Isa pagou R$500 pela Gabi
      lancamento({
        valorCentavos: 100_000,
        pessoaDivisaoId: "casal",
        pessoaDivisaoTipo: "CASAL",
        pessoaPagouId: ISA,
      }),
      // Gabi paga um gasto individual da Isa (R$80) -> Gabi pagou R$80 pela Isa
      lancamento({
        valorCentavos: 8_000,
        pessoaDivisaoId: ISA,
        pessoaDivisaoTipo: "INDIVIDUAL",
        pessoaPagouId: GABI,
      }),
      // Isa paga um gasto de família (R$200), com desconto de R$20 -> líquido R$180, metade R$90
      lancamento({
        valorCentavos: 20_000,
        descontoCentavos: 2_000,
        pessoaDivisaoId: "familia",
        pessoaDivisaoTipo: "FAMILIA",
        pessoaPagouId: ISA,
      }),
    ];

    const saldo = calcularSaldoDivisao(lancamentos, ISA, GABI);

    // Isa pagou pela Gabi: 50.000 (metade do aluguel) + 9.000 (metade do gasto família) = 59.000
    expect(saldo.pagouPeloOutroCentavos[ISA]).toBe(59_000);
    // Gabi pagou pela Isa: 8.000
    expect(saldo.pagouPeloOutroCentavos[GABI]).toBe(8_000);
    expect(saldo.diferencaCentavos).toBe(51_000);
    expect(saldo.pessoaDevedoraId).toBe(GABI);
    expect(saldo.valorDevidoCentavos).toBe(51_000);
  });

  it("divisão tipo OUTRO (terceiro) não entra no acerto entre o casal", () => {
    const lancamentos = [
      lancamento({
        valorCentavos: 15_000,
        pessoaDivisaoId: JADER,
        pessoaDivisaoTipo: "OUTRO",
        pessoaPagouId: ISA,
      }),
    ];

    const saldo = calcularSaldoDivisao(lancamentos, ISA, GABI);

    expect(saldo.pagouPeloOutroCentavos[ISA]).toBe(0);
    expect(saldo.pagouPeloOutroCentavos[GABI]).toBe(0);
    expect(saldo.diferencaCentavos).toBe(0);
    expect(saldo.pessoaDevedoraId).toBeNull();
  });

  it("valor ímpar dividido entre o casal não perde centavo (metades somam o total)", () => {
    const lancamentos = [
      lancamento({
        valorCentavos: 101, // R$1,01 -> metades de 51 e 50
        pessoaDivisaoId: "casal",
        pessoaDivisaoTipo: "CASAL",
        pessoaPagouId: GABI,
      }),
    ];

    const saldo = calcularSaldoDivisao(lancamentos, ISA, GABI);

    // Gabi pagou, então pagou a metade da Isa (arredondada): 51
    expect(saldo.pagouPeloOutroCentavos[GABI]).toBe(51);
    expect(saldo.pagouPeloOutroCentavos[ISA]).toBe(0);
  });
});
