import type { PrismaClient } from "@/generated/prisma/client";
import {
  buscarPlanejadoVsReal,
  buscarResumoPorCategoria,
  buscarResumoPorSubcategoria,
  buscarSaldo,
  type PlanejadoVsRealCategoria,
  type ResumoCategoria,
  type ResumoSubcategoria,
  type SaldoAnual,
} from "./relatorios";
import { buscarSaldoDivisaoGrupo, type SaldoDivisaoGrupo } from "./split";

// ─── Relatório anual consolidado ───────────────────────────────────────────────
//
// Reúne, em uma única leitura, o que hoje está espalhado entre as abas "Anual",
// "Sum (Categoria)" e "Sum (Subcategoria)" da planilha original: orçamento
// planejado vs. real do ano por pessoa/família, saldo final do ano, evolução
// de patrimônio total e divisão de despesas acumulada do ano.

export type PosicaoMensalTotal = {
  // Sempre o 1º dia do mês em UTC.
  mes: Date;
  valorCentavos: number;
};

/**
 * Agrega posições de patrimônio (de todos os bancos/titulares) por mês,
 * somando os valores lançados em cada mês. Meses sem nenhum lançamento não
 * aparecem no resultado (não são assumidos como zero).
 */
export function calcularEvolucaoPatrimonio(
  posicoes: PosicaoMensalTotal[],
): PosicaoMensalTotal[] {
  const porMes = new Map<string, PosicaoMensalTotal>();
  for (const p of posicoes) {
    const mesNormalizado = new Date(
      Date.UTC(p.mes.getUTCFullYear(), p.mes.getUTCMonth(), 1),
    );
    const chave = `${mesNormalizado.getUTCFullYear()}-${mesNormalizado.getUTCMonth()}`;
    const acumulado = porMes.get(chave) ?? {
      mes: mesNormalizado,
      valorCentavos: 0,
    };
    acumulado.valorCentavos += p.valorCentavos;
    porMes.set(chave, acumulado);
  }

  return Array.from(porMes.values()).sort(
    (a, b) => a.mes.getTime() - b.mes.getTime(),
  );
}

export type SecaoPlanejadoVsReal = {
  pessoaId: string;
  // Tipo da Pessoa (INDIVIDUAL, CASAL, FAMILIA, OUTRO) — usado pelo
  // consumidor (DashboardAnual) para não somar duas vezes o gasto/orçamento
  // de um grupo e de seus integrantes na visão "Geral".
  tipo: string;
  label: string;
  itens: PlanejadoVsRealCategoria[];
};

export type RelatorioAnual = {
  ano: number;
  saldo: SaldoAnual;
  planejadoVsReal: SecaoPlanejadoVsReal[];
  resumoPorCategoria: ResumoCategoria[];
  resumoPorSubcategoria: ResumoSubcategoria[];
  evolucaoPatrimonio: PosicaoMensalTotal[];
  divisaoDespesas: SaldoDivisaoGrupo | null;
};

export async function buscarEvolucaoPatrimonioTotal(
  prisma: PrismaClient,
  householdId: string,
  ano: number,
): Promise<PosicaoMensalTotal[]> {
  const posicoes = await prisma.posicaoPatrimonio.findMany({
    where: {
      householdId,
      mes: {
        gte: new Date(Date.UTC(ano, 0, 1)),
        lte: new Date(Date.UTC(ano, 11, 1)),
      },
    },
    select: { mes: true, valorCentavos: true },
  });

  return calcularEvolucaoPatrimonio(posicoes);
}

// Sem pessoaId (visão "Geral"): uma seção por pessoa individual + uma por
// grupo (CASAL/FAMILIA/OUTRO) — o orçamento do grupo é a soma do que cada
// integrante planejou (ver buscarPlanejadoVsReal), não um valor à parte.
// Com pessoaId (pessoa individual ou grupo): uma única seção com a visão
// daquele responsável, já com a mesma fração de gastos de grupo usada em
// buscarSaldo/buscarResumoPorCategoria (ver resolverFracaoPorGrupo em
// pessoas.ts) — filtrar por uma pessoa individual soma só a parte dela dos
// gastos do grupo; filtrar por um grupo traz o valor cheio dele.
async function buscarSecoesPlanejadoVsReal(
  prisma: PrismaClient,
  householdId: string,
  opts: { ano: number; pessoaId: string | null },
): Promise<SecaoPlanejadoVsReal[]> {
  if (opts.pessoaId) {
    const [pessoa, itens] = await Promise.all([
      prisma.pessoa.findFirst({
        where: { id: opts.pessoaId, householdId },
        select: { nome: true, tipo: true },
      }),
      buscarPlanejadoVsReal(prisma, householdId, {
        ano: opts.ano,
        pessoaId: opts.pessoaId,
      }),
    ]);
    return [
      {
        pessoaId: opts.pessoaId,
        tipo: pessoa?.tipo ?? "INDIVIDUAL",
        label: pessoa?.nome ?? "—",
        itens,
      },
    ];
  }

  const pessoas = await prisma.pessoa.findMany({
    where: { householdId },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, tipo: true },
  });

  const planejadoVsRealPorPessoa = await Promise.all(
    pessoas.map((pessoa) =>
      buscarPlanejadoVsReal(prisma, householdId, {
        ano: opts.ano,
        pessoaId: pessoa.id,
      }),
    ),
  );

  return pessoas.map((pessoa, i) => ({
    pessoaId: pessoa.id,
    tipo: pessoa.tipo,
    label: pessoa.nome,
    itens: planejadoVsRealPorPessoa[i],
  }));
}

// ─── Agregações usadas pelo Dashboard Anual (puras, sem I/O) ───────────────────

export type ItemConsolidadoAnual = {
  categoriaId: string;
  subcategoriaId: string | null;
  meses: { planejadoCentavos: number; realCentavos: number }[];
  planejadoAnoCentavos: number;
  realAnoCentavos: number;
};

function chaveItem(categoriaId: string, subcategoriaId: string | null) {
  return `${categoriaId}::${subcategoriaId ?? ""}`;
}

/**
 * Consolida o planejado vs. real de todas as seções (pessoas) em um único
 * total por categoria/subcategoria/mês. Quando há mais de uma seção (visão
 * "Geral"), soma só as INDIVIDUAL: todo orçamento mora numa pessoa
 * individual, e a fração de cada uma já fecha 100% do gasto real do
 * household — somar as seções de grupo por cima duplicaria (o
 * orçamento/gasto de um grupo já é a soma dos integrantes). Quando há uma
 * única seção (visão filtrada por uma pessoa ou grupo específico), ela já é
 * a resposta, seja indivíduo ou grupo.
 */
export function consolidarPlanejadoVsRealPorAno(
  secoes: SecaoPlanejadoVsReal[],
): ItemConsolidadoAnual[] {
  const consolidado = new Map<string, ItemConsolidadoAnual>();

  function entrada(item: PlanejadoVsRealCategoria): ItemConsolidadoAnual {
    const k = chaveItem(item.categoriaId, item.subcategoriaId);
    const atual = consolidado.get(k) ?? {
      categoriaId: item.categoriaId,
      subcategoriaId: item.subcategoriaId,
      meses: Array.from({ length: 12 }, () => ({
        planejadoCentavos: 0,
        realCentavos: 0,
      })),
      planejadoAnoCentavos: 0,
      realAnoCentavos: 0,
    };
    consolidado.set(k, atual);
    return atual;
  }

  const secoesConsolidadas =
    secoes.length === 1
      ? secoes
      : secoes.filter((s) => s.tipo === "INDIVIDUAL");

  for (const secao of secoesConsolidadas) {
    for (const item of secao.itens) {
      const atual = entrada(item);
      for (const mes of item.meses) {
        atual.meses[mes.mes - 1].planejadoCentavos += mes.planejadoCentavos;
        atual.meses[mes.mes - 1].realCentavos += mes.realCentavos;
      }
      atual.planejadoAnoCentavos += item.acumulado.planejadoCentavos;
      atual.realAnoCentavos += item.acumulado.realCentavos;
    }
  }

  return [...consolidado.values()];
}

export type DistribuicaoPessoa = {
  pessoaId: string;
  label: string;
  totalCentavos: number;
};

/**
 * Distribuição do gasto real do ano por pessoa INDIVIDUAL — somando as
 * frações de cada uma já se chega a 100% do gasto real (cada uma inclui sua
 * fração dos gastos de grupo), sem contar nada em dobro. Seções de grupo
 * (CASAL/FAMILIA/OUTRO) ficam de fora pelo mesmo motivo que ficam de fora de
 * consolidarPlanejadoVsRealPorAno.
 */
export function calcularDistribuicaoPorPessoa(
  secoes: SecaoPlanejadoVsReal[],
): DistribuicaoPessoa[] {
  return secoes
    .filter((s) => s.tipo === "INDIVIDUAL" && s.itens.length > 0)
    .map((s) => ({
      pessoaId: s.pessoaId,
      label: s.label,
      totalCentavos: s.itens.reduce(
        (soma, i) => soma + i.acumulado.realCentavos,
        0,
      ),
    }));
}

export function calcularTotalConsolidadoPorMes(
  itens: ItemConsolidadoAnual[],
): number[] {
  return Array.from({ length: 12 }, (_, mesIdx) =>
    itens.reduce((soma, i) => soma + i.meses[mesIdx].realCentavos, 0),
  );
}

export type TotaisAno = {
  totalPlanejadoAno: number;
  totalRealAno: number;
  economiaTotalAno: number;
};

export function calcularTotaisAno(itens: ItemConsolidadoAnual[]): TotaisAno {
  const totalPlanejadoAno = itens.reduce(
    (s, i) => s + i.planejadoAnoCentavos,
    0,
  );
  const totalRealAno = itens.reduce((s, i) => s + i.realAnoCentavos, 0);
  return {
    totalPlanejadoAno,
    totalRealAno,
    economiaTotalAno: totalPlanejadoAno - totalRealAno,
  };
}

/**
 * Quantos meses do ano já se encerraram — 12 para anos passados, 0 para
 * anos futuros, e o mês corrente (índice, não incluído) para o ano atual.
 */
export function calcularMesesConcluidos(ano: number, agora: Date): number {
  const anoAtual = agora.getFullYear();
  if (ano < anoAtual) return 12;
  if (ano > anoAtual) return 0;
  return agora.getMonth();
}

/** Média dos meses concluídos; null quando ainda não há nenhum mês concluído. */
export function mediaMensesConcluidos(
  valoresPorMes: number[],
  mesesConcluidos: number,
): number | null {
  if (mesesConcluidos === 0) return null;
  const soma = valoresPorMes
    .slice(0, mesesConcluidos)
    .reduce((total, valor) => total + valor, 0);
  return soma / mesesConcluidos;
}

export function encontrarMesMaisCaro(totalPorMes: number[]): number {
  return totalPorMes.reduce(
    (maiorIdx, valor, idx) => (valor > totalPorMes[maiorIdx] ? idx : maiorIdx),
    0,
  );
}

export function encontrarMesMaisBarato(totalPorMes: number[]): number {
  return totalPorMes.reduce(
    (menorIdx, valor, idx) =>
      valor > 0 &&
      (totalPorMes[menorIdx] === 0 || valor < totalPorMes[menorIdx])
        ? idx
        : menorIdx,
    0,
  );
}

export function calcularMaioresGastos(
  resumoPorCategoria: ResumoCategoria[],
  limite = 5,
): ResumoCategoria[] {
  return [...resumoPorCategoria]
    .sort((a, b) => b.totalCentavos - a.totalCentavos)
    .slice(0, limite);
}

export type IndicadoresResumoAnual = {
  taxaPoupancaPercentual: number;
  despesaPercentualReceita: number;
  variacaoReceitaPercentual: number | null;
  saldoAcumuladoCentavos: number;
};

export function calcularIndicadoresResumoAnual(params: {
  saldo: SaldoAnual;
  receitaAnoAnterior: number | null;
  saldoAnoAnteriorCentavos: number;
}): IndicadoresResumoAnual {
  const { saldo, receitaAnoAnterior, saldoAnoAnteriorCentavos } = params;
  const taxaPoupancaPercentual =
    saldo.receitaCentavos > 0
      ? (saldo.saldoCentavos / saldo.receitaCentavos) * 100
      : 0;
  const despesaPercentualReceita =
    saldo.receitaCentavos > 0
      ? (saldo.despesaCentavos / saldo.receitaCentavos) * 100
      : 0;
  const variacaoReceitaPercentual =
    receitaAnoAnterior && receitaAnoAnterior > 0
      ? ((saldo.receitaCentavos - receitaAnoAnterior) / receitaAnoAnterior) *
        100
      : null;
  const saldoAcumuladoCentavos = saldoAnoAnteriorCentavos + saldo.saldoCentavos;

  return {
    taxaPoupancaPercentual,
    despesaPercentualReceita,
    variacaoReceitaPercentual,
    saldoAcumuladoCentavos,
  };
}

export async function buscarRelatorioAnual(
  prisma: PrismaClient,
  householdId: string,
  opts: { ano: number; pessoaId?: string | null },
): Promise<RelatorioAnual> {
  const { ano } = opts;
  const pessoaId = opts.pessoaId ?? null;

  const [
    saldo,
    planejadoVsReal,
    resumoPorCategoria,
    resumoPorSubcategoria,
    evolucaoPatrimonio,
    divisaoDespesas,
  ] = await Promise.all([
    buscarSaldo(prisma, householdId, { ano, pessoaId: pessoaId ?? undefined }),
    buscarSecoesPlanejadoVsReal(prisma, householdId, { ano, pessoaId }),
    buscarResumoPorCategoria(prisma, householdId, {
      ano,
      pessoaId: pessoaId ?? undefined,
    }),
    buscarResumoPorSubcategoria(prisma, householdId, {
      ano,
      pessoaId: pessoaId ?? undefined,
    }),
    buscarEvolucaoPatrimonioTotal(prisma, householdId, ano),
    buscarSaldoDivisaoGrupo(prisma, householdId, {
      dataInicio: new Date(Date.UTC(ano, 0, 1)),
      dataFim: new Date(Date.UTC(ano, 11, 31)),
    }),
  ]);

  return {
    ano,
    saldo,
    planejadoVsReal,
    resumoPorCategoria,
    resumoPorSubcategoria,
    evolucaoPatrimonio,
    divisaoDespesas,
  };
}
