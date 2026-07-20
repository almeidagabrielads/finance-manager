import * as z from "zod";
import type { PrismaClient } from "@/generated/prisma/client";

export const SubtipoReceitaSchema = z.enum([
  "SALARIO",
  "VOUCHER",
  "INVESTIMENTO",
  "OUTROS",
]);

export const CriarReceitaSchema = z
  .object({
    pessoaId: z.string().trim().min(1, "Pessoa é obrigatória."),
    subtipo: SubtipoReceitaSchema,
    descricao: z.string().trim().min(1).nullable().optional(),
    valorCentavos: z
      .number()
      .int("Valor deve ser um inteiro em centavos.")
      .positive("Valor deve ser positivo."),
    mes: z.coerce.date(),
  })
  .refine((data) => data.subtipo !== "OUTROS" || !!data.descricao, {
    message: "Descrição é obrigatória para o subtipo Outros.",
    path: ["descricao"],
  });

export const AtualizarReceitaSchema = z
  .object({
    pessoaId: z.string().trim().min(1, "Pessoa é obrigatória.").optional(),
    subtipo: SubtipoReceitaSchema.optional(),
    descricao: z.string().trim().min(1).nullable().optional(),
    valorCentavos: z
      .number()
      .int("Valor deve ser um inteiro em centavos.")
      .positive("Valor deve ser positivo.")
      .optional(),
    mes: z.coerce.date().optional(),
  })
  .refine((data) => data.subtipo !== "OUTROS" || !!data.descricao, {
    message: "Descrição é obrigatória para o subtipo Outros.",
    path: ["descricao"],
  });

export type CriarReceitaInput = z.infer<typeof CriarReceitaSchema>;
export type AtualizarReceitaInput = z.infer<typeof AtualizarReceitaSchema>;

// Normaliza para o 1º dia do mês em UTC — representa o mês de competência.
export function primeiroDiaMes(data: Date): Date {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), 1));
}

export function listarReceitas(
  prisma: PrismaClient,
  householdId: string,
  opts: { pessoaId?: string; mesInicio?: Date; mesFim?: Date } = {},
) {
  return prisma.receita.findMany({
    where: {
      householdId,
      ...(opts.pessoaId ? { pessoaId: opts.pessoaId } : {}),
      ...(opts.mesInicio || opts.mesFim
        ? {
            mes: {
              ...(opts.mesInicio
                ? { gte: primeiroDiaMes(opts.mesInicio) }
                : {}),
              ...(opts.mesFim ? { lte: primeiroDiaMes(opts.mesFim) } : {}),
            },
          }
        : {}),
    },
    orderBy: { mes: "desc" },
  });
}

export function buscarReceita(
  prisma: PrismaClient,
  householdId: string,
  id: string,
) {
  return prisma.receita.findFirst({ where: { id, householdId } });
}

export async function criarReceita(
  prisma: PrismaClient,
  householdId: string,
  input: CriarReceitaInput,
) {
  const pessoa = await prisma.pessoa.findFirst({
    where: { id: input.pessoaId, householdId },
  });
  if (!pessoa) return null;

  return prisma.receita.create({
    data: { ...input, mes: primeiroDiaMes(input.mes), householdId },
  });
}

export async function atualizarReceita(
  prisma: PrismaClient,
  householdId: string,
  id: string,
  input: AtualizarReceitaInput,
) {
  const existente = await buscarReceita(prisma, householdId, id);
  if (!existente) return null;

  if (input.pessoaId) {
    const pessoa = await prisma.pessoa.findFirst({
      where: { id: input.pessoaId, householdId },
    });
    if (!pessoa) return null;
  }

  return prisma.receita.update({
    where: { id },
    data: {
      ...input,
      ...(input.mes ? { mes: primeiroDiaMes(input.mes) } : {}),
    },
  });
}

export async function removerReceita(
  prisma: PrismaClient,
  householdId: string,
  id: string,
) {
  const existente = await buscarReceita(prisma, householdId, id);
  if (!existente) return null;

  return prisma.receita.delete({ where: { id } });
}

// --- Lógica pura de exibição/filtragem (usada pela tela de Receitas) ---

export const SUBTIPOS_RECEITA = [
  { value: "SALARIO", label: "Salário" },
  { value: "VOUCHER", label: "Voucher" },
  { value: "INVESTIMENTO", label: "Investimento" },
  { value: "OUTROS", label: "Outros" },
] as const;

export function labelSubtipoReceita(subtipo: string): string {
  return (
    SUBTIPOS_RECEITA.find((s) => s.value === subtipo)?.label ??
    SUBTIPOS_RECEITA[3].label
  );
}

export type ReceitaResumo = {
  pessoaId: string;
  valorCentavos: number;
  mes: string; // ISO — "2026-07-01T00:00:00.000Z"
};

export type ModoVisualizacaoReceitas = "mensal" | "anual";

// "2026-07-01T00:00:00.000Z" -> "2026-07"
export function mesParaInputMonth(mes: string): string {
  return mes.slice(0, 7);
}

// "2026-07" -> "Julho 2026"
export function formatarMesAno(mesInput: string): string {
  const [ano, mesNum] = mesInput.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mesNum - 1, 1));
  const nome = data.toLocaleDateString("pt-BR", {
    month: "long",
    timeZone: "UTC",
  });
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} ${ano}`;
}

export function totalPorMes<T extends ReceitaResumo>(
  receitas: T[],
  mesSelecionado: string,
): number {
  return receitas
    .filter((r) => mesParaInputMonth(r.mes) === mesSelecionado)
    .reduce((soma, r) => soma + r.valorCentavos, 0);
}

export function totalPorAno<T extends ReceitaResumo>(
  receitas: T[],
  ano: number,
): number {
  return receitas
    .filter((r) => r.mes.slice(0, 4) === String(ano))
    .reduce((soma, r) => soma + r.valorCentavos, 0);
}

export type DadosGraficoMes = {
  mes: number;
  porPessoa: Record<string, number>;
};

// Agrega o total por pessoa em cada mês do ano informado — alimenta o
// gráfico de barras "Total por Pessoa e Mês" da tela de Receitas.
export function dadosGraficoAnual<
  T extends ReceitaResumo & { pessoaId: string },
>(receitas: T[], ano: number): DadosGraficoMes[] {
  const porMes: Record<number, Record<string, number>> = {};
  for (let m = 1; m <= 12; m++) porMes[m] = {};
  for (const r of receitas) {
    if (r.mes.slice(0, 4) !== String(ano)) continue;
    const mesNum = Number(r.mes.slice(5, 7));
    porMes[mesNum][r.pessoaId] =
      (porMes[mesNum][r.pessoaId] ?? 0) + r.valorCentavos;
  }
  return Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    porPessoa: porMes[i + 1],
  }));
}

export type FiltroReceitas = {
  modo: ModoVisualizacaoReceitas;
  ano: number;
  mesSelecionadoStr: string;
  pessoaFiltro: string | null;
  busca: string;
};

export function filtrarReceitas<T extends ReceitaResumo & { pessoaId: string }>(
  receitas: T[],
  filtro: FiltroReceitas,
  camposBusca: (receita: T) => string[],
): T[] {
  const buscaLower = filtro.busca.trim().toLowerCase();
  return receitas.filter((r) => {
    if (filtro.modo === "mensal") {
      if (mesParaInputMonth(r.mes) !== filtro.mesSelecionadoStr) return false;
    } else if (r.mes.slice(0, 4) !== String(filtro.ano)) {
      return false;
    }
    if (filtro.pessoaFiltro && r.pessoaId !== filtro.pessoaFiltro) return false;
    if (!buscaLower) return true;
    return camposBusca(r).some((campo) =>
      campo.toLowerCase().includes(buscaLower),
    );
  });
}

export function ordenarReceitasPorMesDesc<T extends { mes: string }>(
  receitas: T[],
): T[] {
  const copia = [...receitas];
  copia.sort((a, b) => -a.mes.localeCompare(b.mes));
  return copia;
}

// Meses distintos presentes em `receitasOrdenadas`, na ordem em que aparecem
// — usado para paginar a visão anual em blocos de meses.
export function mesesDistintosOrdenados<T extends { mes: string }>(
  receitasOrdenadas: T[],
): string[] {
  const vistos = new Set<string>();
  const ordem: string[] = [];
  for (const r of receitasOrdenadas) {
    const chave = mesParaInputMonth(r.mes);
    if (!vistos.has(chave)) {
      vistos.add(chave);
      ordem.push(chave);
    }
  }
  return ordem;
}
