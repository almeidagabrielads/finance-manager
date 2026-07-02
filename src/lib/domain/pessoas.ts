import * as z from "zod";
import type { PrismaClient } from "@/generated/prisma/client";

export const TipoPessoaSchema = z.enum([
  "INDIVIDUAL",
  "CASAL",
  "FAMILIA",
  "OUTRO",
]);

export const CriarPessoaSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório."),
  tipo: TipoPessoaSchema,
});

export const AtualizarPessoaSchema = CriarPessoaSchema.partial();

export type CriarPessoaInput = z.infer<typeof CriarPessoaSchema>;
export type AtualizarPessoaInput = z.infer<typeof AtualizarPessoaSchema>;

export function listarPessoas(prisma: PrismaClient, householdId: string) {
  return prisma.pessoa.findMany({
    where: { householdId },
    orderBy: { nome: "asc" },
  });
}

export function buscarPessoa(
  prisma: PrismaClient,
  householdId: string,
  id: string,
) {
  return prisma.pessoa.findFirst({ where: { id, householdId } });
}

export function criarPessoa(
  prisma: PrismaClient,
  householdId: string,
  input: CriarPessoaInput,
) {
  return prisma.pessoa.create({
    data: { ...input, householdId },
  });
}

export async function atualizarPessoa(
  prisma: PrismaClient,
  householdId: string,
  id: string,
  input: AtualizarPessoaInput,
) {
  const existente = await buscarPessoa(prisma, householdId, id);
  if (!existente) return null;

  return prisma.pessoa.update({
    where: { id },
    data: input,
  });
}

export async function removerPessoa(
  prisma: PrismaClient,
  householdId: string,
  id: string,
) {
  const existente = await buscarPessoa(prisma, householdId, id);
  if (!existente) return null;

  return prisma.pessoa.delete({ where: { id } });
}
