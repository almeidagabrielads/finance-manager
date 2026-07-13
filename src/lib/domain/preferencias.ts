import * as z from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { ModoParcelamentoSchema } from "./parcelamentos";

export const MoedaValues = ["BRL", "USD", "EUR"] as const;
export const IdiomaValues = ["pt-BR", "en-US", "es"] as const;
export const TemaValues = ["CLARO", "ESCURO"] as const;

export const AtualizarPreferenciasSchema = z.object({
  moeda: z.enum(MoedaValues).optional(),
  idioma: z.enum(IdiomaValues).optional(),
  tema: z.enum(TemaValues).optional(),
  modoParcelamentoPadrao: ModoParcelamentoSchema.optional(),
});

export type AtualizarPreferenciasInput = z.infer<
  typeof AtualizarPreferenciasSchema
>;

// Cria a linha de preferências com os padrões na primeira leitura, já que
// todo household deve ter exatamente uma (RF: configurações do sistema).
export function obterOuCriarPreferencias(
  prisma: PrismaClient,
  householdId: string,
) {
  return prisma.preferencia.upsert({
    where: { householdId },
    update: {},
    create: { householdId },
  });
}

export function atualizarPreferencias(
  prisma: PrismaClient,
  householdId: string,
  input: AtualizarPreferenciasInput,
) {
  return prisma.preferencia.upsert({
    where: { householdId },
    update: input,
    create: { householdId, ...input },
  });
}
