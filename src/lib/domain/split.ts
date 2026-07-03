import type { PrismaClient } from "@/generated/prisma/client";
import { valorLiquidoCentavos } from "./lancamentos";

// ─── RF11: Divisão de despesas do casal ────────────────────────────────────────
//
// Cada Lançamento tem uma pessoa "dona" do gasto (pessoaDivisao) e uma pessoa
// que efetivamente pagou (pessoaPagou). Quando a dona do gasto é uma pessoa do
// tipo INDIVIDUAL diferente de quem pagou, quem pagou pagou 100% em nome dela.
// Quando a divisão é CASAL ou FAMÍLIA (compartilhada pelo casal), quem pagou
// só pagou "pela outra pessoa" a metade que caberia a ela. Divisão do tipo
// OUTRO (terceiro, ex. "Jader") não entra no acerto de contas do casal.

export type TipoPessoaDivisao = "INDIVIDUAL" | "CASAL" | "FAMILIA" | "OUTRO";

export type LancamentoParaDivisao = {
  valorCentavos: number;
  descontoCentavos: number;
  pessoaDivisaoId: string;
  pessoaDivisaoTipo: TipoPessoaDivisao;
  pessoaPagouId: string;
};

export type SaldoDivisao = {
  pessoaAId: string;
  pessoaBId: string;
  // quanto cada uma das duas pagou em nome da outra/da família
  pagouPeloOutroCentavos: Record<string, number>;
  // pagouPeloOutro[A] - pagouPeloOutro[B]; positivo = B deve A, negativo = A deve B
  diferencaCentavos: number;
  // pessoa que deve o valor no acerto; null quando o saldo está zerado
  pessoaDevedoraId: string | null;
  // valor absoluto a acertar
  valorDevidoCentavos: number;
};

export function calcularSaldoDivisao(
  lancamentos: LancamentoParaDivisao[],
  pessoaAId: string,
  pessoaBId: string,
): SaldoDivisao {
  const pagouPeloOutroCentavos: Record<string, number> = {
    [pessoaAId]: 0,
    [pessoaBId]: 0,
  };

  for (const lancamento of lancamentos) {
    const pagador = lancamento.pessoaPagouId;
    if (pagador !== pessoaAId && pagador !== pessoaBId) continue;
    if (lancamento.pessoaDivisaoTipo === "OUTRO") continue;

    const valorLiquido = valorLiquidoCentavos(lancamento);

    if (lancamento.pessoaDivisaoTipo === "INDIVIDUAL") {
      const dono = lancamento.pessoaDivisaoId;
      if (dono === pagador) continue; // pagou o próprio gasto, sem acerto
      if (dono !== pessoaAId && dono !== pessoaBId) continue;
      pagouPeloOutroCentavos[pagador] += valorLiquido;
      continue;
    }

    // CASAL ou FAMÍLIA: gasto compartilhado, dividido em duas metades entre
    // pessoaA e pessoaB. Quem pagou só pagou "pelo outro" a metade que coube
    // à outra pessoa (a própria metade não gera débito).
    const metadeA = Math.round(valorLiquido / 2);
    const metadeB = valorLiquido - metadeA;
    pagouPeloOutroCentavos[pagador] +=
      pagador === pessoaAId ? metadeB : metadeA;
  }

  const diferencaCentavos =
    pagouPeloOutroCentavos[pessoaAId] - pagouPeloOutroCentavos[pessoaBId];

  return {
    pessoaAId,
    pessoaBId,
    pagouPeloOutroCentavos,
    diferencaCentavos,
    pessoaDevedoraId:
      diferencaCentavos === 0
        ? null
        : diferencaCentavos > 0
          ? pessoaBId
          : pessoaAId,
    valorDevidoCentavos: Math.abs(diferencaCentavos),
  };
}

export async function buscarSaldoDivisao(
  prisma: PrismaClient,
  householdId: string,
  opts: {
    pessoaAId?: string;
    pessoaBId?: string;
    dataInicio?: Date;
    dataFim?: Date;
  } = {},
): Promise<SaldoDivisao | null> {
  let { pessoaAId, pessoaBId } = opts;
  if (!pessoaAId || !pessoaBId) {
    const individuais = await prisma.pessoa.findMany({
      where: { householdId, tipo: "INDIVIDUAL" },
      orderBy: { nome: "asc" },
      select: { id: true },
    });
    if (individuais.length < 2) return null;
    pessoaAId = individuais[0].id;
    pessoaBId = individuais[1].id;
  }

  const lancamentos = await prisma.lancamento.findMany({
    where: {
      householdId,
      ...(opts.dataInicio || opts.dataFim
        ? {
            data: {
              ...(opts.dataInicio ? { gte: opts.dataInicio } : {}),
              ...(opts.dataFim ? { lte: opts.dataFim } : {}),
            },
          }
        : {}),
    },
    select: {
      valorCentavos: true,
      descontoCentavos: true,
      pessoaDivisaoId: true,
      pessoaPagouId: true,
      pessoaDivisao: { select: { tipo: true } },
    },
  });

  return calcularSaldoDivisao(
    lancamentos.map((l) => ({
      valorCentavos: l.valorCentavos,
      descontoCentavos: l.descontoCentavos,
      pessoaDivisaoId: l.pessoaDivisaoId,
      pessoaDivisaoTipo: l.pessoaDivisao.tipo,
      pessoaPagouId: l.pessoaPagouId,
    })),
    pessoaAId,
    pessoaBId,
  );
}
