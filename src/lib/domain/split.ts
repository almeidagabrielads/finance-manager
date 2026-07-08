import type { PrismaClient } from "@/generated/prisma/client";
import { valorLiquidoCentavos } from "./lancamentos";

// ─── RF11: Acerto de contas entre as pessoas da casa ───────────────────────────
//
// Cada Lançamento tem uma pessoa "dona" do gasto (pessoaDivisao) e uma pessoa
// que efetivamente pagou (pessoaPagou). Quando a dona do gasto é uma pessoa do
// tipo INDIVIDUAL diferente de quem pagou, quem pagou pagou 100% em nome dela.
// Quando a divisão é CASAL ou FAMÍLIA (gasto compartilhado pela casa), quem
// pagou só pagou "pelos outros" a fração que caberia a cada um dos demais
// participantes — dividida proporcionalmente ao peso de divisão (pesoDivisao)
// de cada pessoa do tipo INDIVIDUAL cadastrada, não apenas duas. Pesos iguais
// (padrão) resultam em partes iguais; pesos diferentes (ex.: 60/40) permitem
// um split customizado. Isso vale tanto para uma pessoa que mora sozinha
// (nada a acertar) quanto para um casal, uma família com vários membros ou um
// grupo de amigos dividindo a casa. Divisão do tipo OUTRO (terceiro, ex. um
// convidado) não entra no acerto de contas.

export type TipoPessoaDivisao = "INDIVIDUAL" | "CASAL" | "FAMILIA" | "OUTRO";

export type ParticipanteDivisao = {
  pessoaId: string;
  // Peso relativo para divisão proporcional dos gastos compartilhados.
  // Pesos iguais entre os participantes equivalem a divisão igualitária.
  peso: number;
};

export type LancamentoParaDivisao = {
  valorCentavos: number;
  descontoCentavos: number;
  pessoaDivisaoId: string;
  pessoaDivisaoTipo: TipoPessoaDivisao;
  pessoaPagouId: string;
};

export type SaldoPessoa = {
  pessoaId: string;
  // positivo = a receber dos demais; negativo = deve aos demais
  saldoCentavos: number;
};

export type Transferencia = {
  deId: string;
  paraId: string;
  valorCentavos: number;
};

export type SaldoDivisaoGrupo = {
  // pessoas do tipo INDIVIDUAL consideradas no acerto, em ordem estável
  participantes: string[];
  saldosPorPessoa: SaldoPessoa[];
  // conjunto mínimo de transferências para zerar todos os saldos
  transferenciasSugeridas: Transferencia[];
};

export type TotalPagoPessoa = {
  pessoaId: string;
  totalCentavos: number;
};

export type LancamentoDetalheDivisao = {
  id: string;
  data: Date;
  descricao: string;
  categoriaNome: string | null;
  valorCentavos: number;
  pessoaDivisaoId: string;
};

export type InsightDivisao = {
  categoriaNome: string;
  pessoaId: string;
} | null;

// Versão enriquecida usada pela tela de Acerto de Contas: além do saldo,
// traz o total pago por pessoa, o detalhamento dos lançamentos do período e
// um destaque (categoria com maior gasto + quem mais pagou nela).
export type ResumoDivisaoGrupo = SaldoDivisaoGrupo & {
  totalPagoPorPessoa: TotalPagoPessoa[];
  lancamentos: LancamentoDetalheDivisao[];
  insight: InsightDivisao;
};

/**
 * Divide um valor em partes inteiras (centavos) proporcionais aos pesos
 * informados, somando exatamente o total. Usa o método dos maiores restos:
 * cada parte recebe o piso da fração proporcional, e os centavos restantes
 * vão para as partes com maior resto fracionário (empate: primeiro índice).
 * Pesos iguais reproduzem uma divisão igualitária.
 */
function dividirPorPeso(valorCentavos: number, pesos: number[]): number[] {
  const somaPesos = pesos.reduce((soma, peso) => soma + peso, 0);
  if (somaPesos <= 0) return pesos.map(() => 0);

  const brutos = pesos.map((peso) => (valorCentavos * peso) / somaPesos);
  const partes = brutos.map(Math.floor);
  const resto = valorCentavos - partes.reduce((soma, parte) => soma + parte, 0);

  const porMaiorResto = brutos
    .map((bruto, idx) => ({ idx, fracao: bruto - Math.floor(bruto) }))
    .sort((a, b) => b.fracao - a.fracao || a.idx - b.idx);

  for (let i = 0; i < resto; i++) {
    partes[porMaiorResto[i].idx] += 1;
  }

  return partes;
}

/**
 * Simplifica os saldos líquidos em um conjunto mínimo de transferências
 * (algoritmo guloso: sempre casa quem mais deve receber com quem mais deve
 * pagar). Não muta o array de entrada.
 */
function simplificarTransferencias(saldos: SaldoPessoa[]): Transferencia[] {
  const credores = saldos
    .filter((s) => s.saldoCentavos > 0)
    .map((s) => ({ ...s }))
    .sort(
      (a, b) =>
        b.saldoCentavos - a.saldoCentavos ||
        a.pessoaId.localeCompare(b.pessoaId),
    );
  const devedores = saldos
    .filter((s) => s.saldoCentavos < 0)
    .map((s) => ({ ...s }))
    .sort(
      (a, b) =>
        a.saldoCentavos - b.saldoCentavos ||
        a.pessoaId.localeCompare(b.pessoaId),
    );

  const transferencias: Transferencia[] = [];
  let i = 0;
  let j = 0;
  while (i < credores.length && j < devedores.length) {
    const credor = credores[i];
    const devedor = devedores[j];
    const valor = Math.min(credor.saldoCentavos, -devedor.saldoCentavos);

    if (valor > 0) {
      transferencias.push({
        deId: devedor.pessoaId,
        paraId: credor.pessoaId,
        valorCentavos: valor,
      });
      credor.saldoCentavos -= valor;
      devedor.saldoCentavos += valor;
    }

    if (credor.saldoCentavos === 0) i++;
    if (devedor.saldoCentavos === 0) j++;
  }

  return transferencias;
}

export function calcularSaldoDivisaoGrupo(
  lancamentos: LancamentoParaDivisao[],
  participantesDivisao: ParticipanteDivisao[],
): SaldoDivisaoGrupo {
  const participanteIds = participantesDivisao.map((p) => p.pessoaId);
  const pesos = participantesDivisao.map((p) => p.peso);
  const participantes = new Set(participanteIds);
  const saldo = new Map<string, number>(participanteIds.map((id) => [id, 0]));

  for (const lancamento of lancamentos) {
    const pagador = lancamento.pessoaPagouId;
    if (!participantes.has(pagador)) continue;
    if (lancamento.pessoaDivisaoTipo === "OUTRO") continue;

    const valorLiquido = valorLiquidoCentavos(lancamento);

    if (lancamento.pessoaDivisaoTipo === "INDIVIDUAL") {
      const divisao = lancamento.pessoaDivisaoId;
      if (divisao === pagador) continue; // pagou o próprio gasto, sem acerto
      if (!participantes.has(divisao)) continue;
      saldo.set(pagador, (saldo.get(pagador) ?? 0) + valorLiquido);
      saldo.set(divisao, (saldo.get(divisao) ?? 0) - valorLiquido);
      continue;
    }

    // CASAL ou FAMÍLIA: gasto compartilhado pela casa, dividido
    // proporcionalmente ao peso de cada participante. Quem pagou só pagou
    // "pelos outros" a fração que coube a cada um deles (a própria fração
    // não gera débito).
    if (participanteIds.length === 0) continue;
    const partes = dividirPorPeso(valorLiquido, pesos);
    participanteIds.forEach((pessoaId, idx) => {
      if (pessoaId === pagador) return;
      const parte = partes[idx];
      saldo.set(pagador, (saldo.get(pagador) ?? 0) + parte);
      saldo.set(pessoaId, (saldo.get(pessoaId) ?? 0) - parte);
    });
  }

  const saldosPorPessoa: SaldoPessoa[] = participanteIds.map((pessoaId) => ({
    pessoaId,
    saldoCentavos: saldo.get(pessoaId) ?? 0,
  }));

  return {
    participantes: participanteIds,
    saldosPorPessoa,
    transferenciasSugeridas: simplificarTransferencias(saldosPorPessoa),
  };
}

export async function buscarSaldoDivisaoGrupo(
  prisma: PrismaClient,
  householdId: string,
  opts: {
    dataInicio?: Date;
    dataFim?: Date;
  } = {},
): Promise<ResumoDivisaoGrupo | null> {
  const individuais = await prisma.pessoa.findMany({
    where: { householdId, tipo: "INDIVIDUAL" },
    orderBy: { nome: "asc" },
    select: { id: true, pesoDivisao: true },
  });
  if (individuais.length < 2) return null;

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
    orderBy: { data: "desc" },
    select: {
      id: true,
      data: true,
      descricaoOrigem: true,
      descricaoPropria: true,
      valorCentavos: true,
      descontoCentavos: true,
      pessoaDivisaoId: true,
      pessoaPagouId: true,
      pessoaDivisao: { select: { tipo: true } },
      categoria: { select: { nome: true } },
    },
  });

  const participanteIds = individuais.map((p) => p.id);
  const participantesDivisao: ParticipanteDivisao[] = individuais.map((p) => ({
    pessoaId: p.id,
    peso: p.pesoDivisao,
  }));
  const lancamentosParaDivisao = lancamentos.map((l) => ({
    valorCentavos: l.valorCentavos,
    descontoCentavos: l.descontoCentavos,
    pessoaDivisaoId: l.pessoaDivisaoId,
    pessoaDivisaoTipo: l.pessoaDivisao.tipo,
    pessoaPagouId: l.pessoaPagouId,
  }));

  const saldo = calcularSaldoDivisaoGrupo(
    lancamentosParaDivisao,
    participantesDivisao,
  );

  const totalPagoPorPessoa: TotalPagoPessoa[] = participanteIds.map(
    (pessoaId) => ({
      pessoaId,
      totalCentavos: lancamentosParaDivisao
        .filter((l) => l.pessoaPagouId === pessoaId)
        .reduce((total, l) => total + valorLiquidoCentavos(l), 0),
    }),
  );

  const lancamentosDetalhados: LancamentoDetalheDivisao[] = lancamentos.map(
    (l) => ({
      id: l.id,
      data: l.data,
      descricao: l.descricaoPropria ?? l.descricaoOrigem ?? "",
      categoriaNome: l.categoria?.nome ?? null,
      valorCentavos: valorLiquidoCentavos(l),
      pessoaDivisaoId: l.pessoaDivisaoId,
    }),
  );

  return {
    ...saldo,
    totalPagoPorPessoa,
    lancamentos: lancamentosDetalhados,
    insight: calcularInsightDivisao(lancamentos),
  };
}

function calcularInsightDivisao(
  lancamentos: {
    categoria: { nome: string } | null;
    valorCentavos: number;
    descontoCentavos: number;
    pessoaPagouId: string;
  }[],
): InsightDivisao {
  const totalPorCategoria = new Map<string, number>();
  for (const l of lancamentos) {
    if (!l.categoria) continue;
    const atual = totalPorCategoria.get(l.categoria.nome) ?? 0;
    totalPorCategoria.set(l.categoria.nome, atual + valorLiquidoCentavos(l));
  }
  if (totalPorCategoria.size === 0) return null;

  const [categoriaNome] = [...totalPorCategoria.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0];

  const totalPorPessoaNaCategoria = new Map<string, number>();
  for (const l of lancamentos) {
    if (l.categoria?.nome !== categoriaNome) continue;
    const atual = totalPorPessoaNaCategoria.get(l.pessoaPagouId) ?? 0;
    totalPorPessoaNaCategoria.set(
      l.pessoaPagouId,
      atual + valorLiquidoCentavos(l),
    );
  }
  const [pessoaId] = [...totalPorPessoaNaCategoria.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0];

  return { categoriaNome, pessoaId };
}
