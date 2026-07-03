import * as z from "zod";
import type { PrismaClient } from "@/generated/prisma/client";

export const TipoInvestimentoValues = [
  "RENDA_FIXA",
  "FUNDO",
  "FGTS",
  "OUTRO",
] as const;

// Vencimento/liquidez é informado como D+n (liquidezDias) OU como data de
// vencimento (vencimento) — nunca ambos (RF12). FGTS costuma não ter nenhum
// dos dois (liquidez indefinida).
export const CriarInvestimentoSchema = z
  .object({
    bancoId: z.string().trim().min(1, "Banco é obrigatório."),
    tipo: z.enum(TipoInvestimentoValues),
    produto: z.string().trim().min(1, "Produto é obrigatório."),
    valorAtualCentavos: z.number().int("Valor deve ser um inteiro em centavos."),
    vencimento: z.coerce.date().nullish(),
    liquidezDias: z.number().int().nonnegative().nullish(),
    observacao: z.string().trim().nullish(),
    pessoaId: z.string().trim().min(1, "Titular é obrigatório."),
  })
  .refine((data) => !(data.vencimento && data.liquidezDias != null), {
    message: "Informe apenas vencimento ou liquidezDias, não ambos.",
    path: ["vencimento"],
  });

export const AtualizarInvestimentoSchema = z
  .object({
    bancoId: z.string().trim().min(1).optional(),
    tipo: z.enum(TipoInvestimentoValues).optional(),
    produto: z.string().trim().min(1).optional(),
    valorAtualCentavos: z.number().int().optional(),
    vencimento: z.coerce.date().nullish(),
    liquidezDias: z.number().int().nonnegative().nullish(),
    observacao: z.string().trim().nullish(),
    pessoaId: z.string().trim().min(1).optional(),
  })
  .refine((data) => !(data.vencimento && data.liquidezDias != null), {
    message: "Informe apenas vencimento ou liquidezDias, não ambos.",
    path: ["vencimento"],
  });

export type CriarInvestimentoInput = z.infer<typeof CriarInvestimentoSchema>;
export type AtualizarInvestimentoInput = z.infer<
  typeof AtualizarInvestimentoSchema
>;

export function listarInvestimentos(
  prisma: PrismaClient,
  householdId: string,
  opts: { pessoaId?: string; bancoId?: string; tipo?: string } = {},
) {
  return prisma.investimento.findMany({
    where: {
      householdId,
      ...(opts.pessoaId ? { pessoaId: opts.pessoaId } : {}),
      ...(opts.bancoId ? { bancoId: opts.bancoId } : {}),
      ...(opts.tipo ? { tipo: opts.tipo as never } : {}),
    },
    orderBy: { produto: "asc" },
  });
}

export function buscarInvestimento(
  prisma: PrismaClient,
  householdId: string,
  id: string,
) {
  return prisma.investimento.findFirst({ where: { id, householdId } });
}

async function validarReferencias(
  prisma: PrismaClient,
  householdId: string,
  input: { bancoId?: string; pessoaId?: string },
) {
  if (input.bancoId) {
    const banco = await prisma.banco.findFirst({
      where: { id: input.bancoId, householdId },
    });
    if (!banco) return false;
  }

  if (input.pessoaId) {
    const pessoa = await prisma.pessoa.findFirst({
      where: { id: input.pessoaId, householdId },
    });
    if (!pessoa) return false;
  }

  return true;
}

export async function criarInvestimento(
  prisma: PrismaClient,
  householdId: string,
  input: CriarInvestimentoInput,
) {
  const valido = await validarReferencias(prisma, householdId, input);
  if (!valido) return null;

  return prisma.investimento.create({
    data: {
      bancoId: input.bancoId,
      tipo: input.tipo,
      produto: input.produto,
      valorAtualCentavos: input.valorAtualCentavos,
      vencimento: input.vencimento ?? null,
      liquidezDias: input.liquidezDias ?? null,
      observacao: input.observacao ?? null,
      pessoaId: input.pessoaId,
      householdId,
    },
  });
}

export async function atualizarInvestimento(
  prisma: PrismaClient,
  householdId: string,
  id: string,
  input: AtualizarInvestimentoInput,
) {
  const existente = await buscarInvestimento(prisma, householdId, id);
  if (!existente) return null;

  const valido = await validarReferencias(prisma, householdId, {
    bancoId: input.bancoId,
    pessoaId: input.pessoaId,
  });
  if (!valido) return null;

  return prisma.investimento.update({
    where: { id },
    data: input,
  });
}

export async function removerInvestimento(
  prisma: PrismaClient,
  householdId: string,
  id: string,
) {
  const existente = await buscarInvestimento(prisma, householdId, id);
  if (!existente) return null;

  return prisma.investimento.delete({ where: { id } });
}

// ─── Liquidez consolidada (RF15) ────────────────────────────────────────────

export const FAIXAS_LIQUIDEZ = [
  "IMEDIATO", // D+0
  "ATE_30_DIAS",
  "ATE_90_DIAS",
  "ATE_180_DIAS",
  "ATE_365_DIAS",
  "MAIS_DE_1_ANO",
  "INDEFINIDO", // sem vencimento nem liquidezDias (ex.: FGTS)
] as const;

export type FaixaLiquidez = (typeof FAIXAS_LIQUIDEZ)[number];

function diasParaFaixa(dias: number | null): FaixaLiquidez {
  if (dias === null) return "INDEFINIDO";
  if (dias <= 0) return "IMEDIATO";
  if (dias <= 30) return "ATE_30_DIAS";
  if (dias <= 90) return "ATE_90_DIAS";
  if (dias <= 180) return "ATE_180_DIAS";
  if (dias <= 365) return "ATE_365_DIAS";
  return "MAIS_DE_1_ANO";
}

function diasAteResgate(
  investimento: { liquidezDias: number | null; vencimento: Date | null },
  dataReferencia: Date,
): number | null {
  if (investimento.liquidezDias !== null) return investimento.liquidezDias;
  if (investimento.vencimento !== null) {
    const msPorDia = 1000 * 60 * 60 * 24;
    const diff = Math.ceil(
      (investimento.vencimento.getTime() - dataReferencia.getTime()) /
        msPorDia,
    );
    return Math.max(diff, 0);
  }
  return null;
}

export type LiquidezConsolidada = {
  faixa: FaixaLiquidez;
  totalCentavos: number;
  investimentos: { id: string; produto: string; valorAtualCentavos: number }[];
}[];

export async function liquidezConsolidada(
  prisma: PrismaClient,
  householdId: string,
  opts: { pessoaId?: string; dataReferencia?: Date } = {},
): Promise<LiquidezConsolidada> {
  const dataReferencia = opts.dataReferencia ?? new Date();
  const investimentos = await prisma.investimento.findMany({
    where: {
      householdId,
      ...(opts.pessoaId ? { pessoaId: opts.pessoaId } : {}),
    },
  });

  const porFaixa = new Map<
    FaixaLiquidez,
    { totalCentavos: number; investimentos: { id: string; produto: string; valorAtualCentavos: number }[] }
  >();
  for (const faixa of FAIXAS_LIQUIDEZ) {
    porFaixa.set(faixa, { totalCentavos: 0, investimentos: [] });
  }

  for (const inv of investimentos) {
    const faixa = diasParaFaixa(diasAteResgate(inv, dataReferencia));
    const grupo = porFaixa.get(faixa)!;
    grupo.totalCentavos += inv.valorAtualCentavos;
    grupo.investimentos.push({
      id: inv.id,
      produto: inv.produto,
      valorAtualCentavos: inv.valorAtualCentavos,
    });
  }

  return FAIXAS_LIQUIDEZ.map((faixa) => ({
    faixa,
    ...porFaixa.get(faixa)!,
  }));
}
