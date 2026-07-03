import * as z from "zod";
import type { PrismaClient } from "@/generated/prisma/client";

export const TipoBancoValues = [
  "CARTAO_CREDITO",
  "CONTA_CORRENTE",
  "CORRETORA",
  "DINHEIRO",
  "OUTRO",
] as const;

export const CriarBancoSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório."),
  tipo: z.enum(TipoBancoValues),
});

export const AtualizarBancoSchema = CriarBancoSchema.partial();

export type CriarBancoInput = z.infer<typeof CriarBancoSchema>;
export type AtualizarBancoInput = z.infer<typeof AtualizarBancoSchema>;

export function listarBancos(
  prisma: PrismaClient,
  householdId: string,
  opts: { incluirInativos?: boolean } = {},
) {
  return prisma.banco.findMany({
    where: {
      householdId,
      ...(opts.incluirInativos ? {} : { ativo: true }),
    },
    orderBy: { nome: "asc" },
  });
}

export function buscarBanco(
  prisma: PrismaClient,
  householdId: string,
  id: string,
) {
  return prisma.banco.findFirst({ where: { id, householdId } });
}

export function criarBanco(
  prisma: PrismaClient,
  householdId: string,
  input: CriarBancoInput,
) {
  return prisma.banco.create({
    data: { ...input, householdId },
  });
}

async function buscarBancoSimples(
  prisma: PrismaClient,
  householdId: string,
  id: string,
) {
  return prisma.banco.findFirst({ where: { id, householdId } });
}

export async function atualizarBanco(
  prisma: PrismaClient,
  householdId: string,
  id: string,
  input: AtualizarBancoInput,
) {
  const existente = await buscarBancoSimples(prisma, householdId, id);
  if (!existente) return null;

  return prisma.banco.update({
    where: { id },
    data: input,
  });
}

export async function inativarBanco(
  prisma: PrismaClient,
  householdId: string,
  id: string,
) {
  const existente = await buscarBancoSimples(prisma, householdId, id);
  if (!existente) return null;

  return prisma.banco.update({
    where: { id },
    data: { ativo: false },
  });
}

export async function reativarBanco(
  prisma: PrismaClient,
  householdId: string,
  id: string,
) {
  const existente = await buscarBancoSimples(prisma, householdId, id);
  if (!existente) return null;

  return prisma.banco.update({
    where: { id },
    data: { ativo: true },
  });
}
