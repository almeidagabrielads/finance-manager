import * as z from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { TipoGastoSchema } from "./tipoGasto";

export type IndicadorPlanejado = {
  planejadoCentavos: number;
  realCentavos: number;
  diferencaCentavos: number;
  percentual: number | null;
  dentroDoPlanejado: boolean;
};

export function indicadorVazio(): IndicadorPlanejado {
  return {
    planejadoCentavos: 0,
    realCentavos: 0,
    diferencaCentavos: 0,
    percentual: null,
    dentroDoPlanejado: true,
  };
}

// Agrega o indicador de uma categoria somando planejado/real das
// subcategorias ao indicador próprio da categoria (lançamentos sem
// subcategoria). Diferença/percentual/dentroDoPlanejado não têm sentido
// agregados — ficam zerados/neutros, recalculados por quem consumir o total.
export function agregarIndicadorCategoria(
  indicadorProprio: IndicadorPlanejado,
  indicadoresSubcategorias: IndicadorPlanejado[],
): IndicadorPlanejado {
  return indicadoresSubcategorias.reduce(
    (acc, ind) => ({
      ...acc,
      planejadoCentavos: acc.planejadoCentavos + ind.planejadoCentavos,
      realCentavos: acc.realCentavos + ind.realCentavos,
    }),
    {
      ...indicadorProprio,
      diferencaCentavos: 0,
      percentual: null,
      dentroDoPlanejado: true,
    },
  );
}

// Maiores desvios: os 5 itens com mais gasto realizado, usados no card de
// tendência do mês na tela de Orçamento.
export function top5PorRealizado<T extends { realCentavos: number }>(
  itens: T[],
): T[] {
  return [...itens]
    .filter((item) => item.realCentavos > 0)
    .sort((a, b) => b.realCentavos - a.realCentavos)
    .slice(0, 5);
}

// Soma o total anual de uma categoria a partir do total anual próprio (sem
// subcategoria) mais o total anual de cada subcategoria.
export function totalAnualCategoria(
  totalAnualProprio: number,
  totaisAnuaisSubcategorias: number[],
): number {
  return totaisAnuaisSubcategorias.reduce(
    (soma, total) => soma + total,
    totalAnualProprio,
  );
}

export const CriarOrcamentoSchema = z.object({
  // Sempre uma Pessoa INDIVIDUAL (ver validarReferencias). O orçamento de um
  // grupo (CASAL/FAMILIA/OUTRO) não é armazenado — é a soma dos orçamentos
  // dos seus integrantes, calculada em src/lib/domain/relatorios.ts.
  pessoaId: z.string().trim().min(1, "Pessoa é obrigatória."),
  // Com quem esse gasto planejado é dividido (qualquer Pessoa, inclusive
  // grupo) — igual ao pessoaDivisaoId do Lancamento, mas opcional e
  // independente do pessoaId acima.
  divisaoId: z.string().trim().min(1).nullish(),
  categoriaId: z.string().trim().min(1, "Categoria é obrigatória."),
  subcategoriaId: z.string().trim().min(1).nullish(),
  // Valor vigente a partir desse mês, até o próximo mês com valor próprio.
  // null/ausente = legado (orçamento anual antigo), tratado como vigente
  // desde o mês 1.
  mes: z.number().int().min(1).max(12).nullish(),
  ano: z.number().int().min(2000).max(2100),
  valorCentavos: z
    .number()
    .int("Valor deve ser um inteiro em centavos.")
    .nonnegative("Valor não pode ser negativo."),
  tipoGasto: TipoGastoSchema,
});

export const AtualizarOrcamentoSchema = CriarOrcamentoSchema.partial();

export type CriarOrcamentoInput = z.infer<typeof CriarOrcamentoSchema>;
export type AtualizarOrcamentoInput = z.infer<typeof AtualizarOrcamentoSchema>;

export function listarOrcamentos(
  prisma: PrismaClient,
  householdId: string,
  opts: {
    pessoaId?: string;
    categoriaId?: string;
    subcategoriaId?: string;
    ano?: number;
    mes?: number | null;
  } = {},
) {
  return prisma.orcamentoPlanejado.findMany({
    where: {
      householdId,
      ...(opts.pessoaId !== undefined ? { pessoaId: opts.pessoaId } : {}),
      ...(opts.categoriaId ? { categoriaId: opts.categoriaId } : {}),
      ...(opts.subcategoriaId ? { subcategoriaId: opts.subcategoriaId } : {}),
      ...(opts.ano !== undefined ? { ano: opts.ano } : {}),
      ...(opts.mes !== undefined ? { mes: opts.mes } : {}),
    },
    orderBy: [{ ano: "desc" }, { mes: "asc" }],
  });
}

export function buscarOrcamento(
  prisma: PrismaClient,
  householdId: string,
  id: string,
) {
  return prisma.orcamentoPlanejado.findFirst({ where: { id, householdId } });
}

async function validarReferencias(
  prisma: PrismaClient,
  householdId: string,
  input: {
    pessoaId?: string | null;
    divisaoId?: string | null;
    categoriaId?: string;
    subcategoriaId?: string | null;
  },
) {
  if (input.pessoaId) {
    const pessoa = await prisma.pessoa.findFirst({
      where: { id: input.pessoaId, householdId },
    });
    if (!pessoa || pessoa.tipo !== "INDIVIDUAL") return false;
  }

  if (input.divisaoId) {
    const divisao = await prisma.pessoa.findFirst({
      where: { id: input.divisaoId, householdId },
    });
    if (!divisao) return false;
  }

  if (input.categoriaId) {
    const categoria = await prisma.categoria.findFirst({
      where: { id: input.categoriaId, householdId },
    });
    if (!categoria) return false;
  }

  if (input.subcategoriaId) {
    const subcategoria = await prisma.subcategoria.findFirst({
      where: {
        id: input.subcategoriaId,
        householdId,
        ...(input.categoriaId ? { categoriaId: input.categoriaId } : {}),
      },
    });
    if (!subcategoria) return false;
  }

  return true;
}

export async function criarOrcamento(
  prisma: PrismaClient,
  householdId: string,
  input: CriarOrcamentoInput,
) {
  const valido = await validarReferencias(prisma, householdId, input);
  if (!valido) return null;

  return prisma.orcamentoPlanejado.create({
    data: {
      categoriaId: input.categoriaId,
      valorCentavos: input.valorCentavos,
      ano: input.ano,
      pessoaId: input.pessoaId,
      divisaoId: input.divisaoId ?? null,
      subcategoriaId: input.subcategoriaId ?? null,
      mes: input.mes ?? null,
      tipoGasto: input.tipoGasto,
      householdId,
    },
  });
}

export async function atualizarOrcamento(
  prisma: PrismaClient,
  householdId: string,
  id: string,
  input: AtualizarOrcamentoInput,
) {
  const existente = await buscarOrcamento(prisma, householdId, id);
  if (!existente) return null;

  const valido = await validarReferencias(prisma, householdId, {
    pessoaId: input.pessoaId ?? undefined,
    divisaoId: input.divisaoId ?? undefined,
    categoriaId: input.categoriaId ?? existente.categoriaId,
    subcategoriaId: input.subcategoriaId ?? undefined,
  });
  if (!valido) return null;

  return prisma.orcamentoPlanejado.update({
    where: { id },
    data: input,
  });
}

export async function removerOrcamento(
  prisma: PrismaClient,
  householdId: string,
  id: string,
) {
  const existente = await buscarOrcamento(prisma, householdId, id);
  if (!existente) return null;

  return prisma.orcamentoPlanejado.delete({ where: { id } });
}
