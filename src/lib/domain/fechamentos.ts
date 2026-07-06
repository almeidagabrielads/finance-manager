import * as z from "zod";
import type { PrismaClient } from "@/generated/prisma/client";

export const SalvarFechamentoSchema = z.object({
  ano: z.number().int(),
  saldoCentavos: z.number().int(),
});

export type SalvarFechamentoInput = z.infer<typeof SalvarFechamentoSchema>;

export function buscarFechamento(
  prisma: PrismaClient,
  householdId: string,
  ano: number,
) {
  return prisma.fechamentoAnual.findUnique({
    where: { householdId_ano: { householdId, ano } },
  });
}

export function salvarFechamento(
  prisma: PrismaClient,
  householdId: string,
  input: SalvarFechamentoInput,
) {
  return prisma.fechamentoAnual.upsert({
    where: { householdId_ano: { householdId, ano: input.ano } },
    create: {
      householdId,
      ano: input.ano,
      saldoCentavos: input.saldoCentavos,
    },
    update: { saldoCentavos: input.saldoCentavos },
  });
}
