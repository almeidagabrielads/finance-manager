import * as z from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { TipoGastoSchema } from "./tipoGasto";

export const ModoParcelamentoValues = ["GRADUAL", "AVISTA", "PREVISAO"] as const;
export const ModoParcelamentoSchema = z.enum(ModoParcelamentoValues);
export type ModoParcelamento = z.infer<typeof ModoParcelamentoSchema>;

// ─── Helpers puros ──────────────────────────────────────────────────────────

// Divide o valor total em `quantidade` parcelas inteiras (centavos), jogando
// o resto da divisão na última parcela para que a soma bata exatamente com o
// valor total (nunca usar float para dinheiro).
export function dividirParcelas(
  valorTotalCentavos: number,
  quantidade: number,
): number[] {
  const base = Math.floor(valorTotalCentavos / quantidade);
  const resto = valorTotalCentavos - base * quantidade;
  return Array.from({ length: quantidade }, (_, i) =>
    i === quantidade - 1 ? base + resto : base,
  );
}

// Data da parcela de índice `indice` (0 = primeira parcela), somando meses em
// UTC a partir de dataPrimeiraParcela. Mantém o dia de dataPrimeiraParcela,
// limitado ao último dia do mês de destino (ex.: 31/jan -> 28-29/fev).
export function dataDaParcela(
  dataPrimeiraParcela: Date,
  indice: number,
): Date {
  const ano = dataPrimeiraParcela.getUTCFullYear();
  const mes = dataPrimeiraParcela.getUTCMonth() + indice;
  const dia = dataPrimeiraParcela.getUTCDate();
  const ultimoDiaDoMesDestino = new Date(
    Date.UTC(ano, mes + 1, 0),
  ).getUTCDate();
  return new Date(Date.UTC(ano, mes, Math.min(dia, ultimoDiaDoMesDestino)));
}

export function parcelasRestantes(
  quantidadeParcelas: number,
  numerosParcelaLancados: (number | null)[],
): number {
  const distintos = new Set(
    numerosParcelaLancados.filter((n): n is number => n !== null),
  );
  return quantidadeParcelas - distintos.size;
}

// ─── Schemas ────────────────────────────────────────────────────────────────

export const CriarParcelamentoSchema = z.object({
  descricaoOrigem: z.string().trim().min(1).nullish(),
  descricaoPropria: z.string().trim().min(1).nullish(),
  // Valor de UMA parcela — o total é calculado (valorParcelaCentavos * quantidadeParcelas).
  valorParcelaCentavos: z
    .number()
    .int("Valor deve ser um inteiro em centavos.")
    .positive("Valor deve ser maior que zero."),
  quantidadeParcelas: z
    .number()
    .int()
    .min(2, "Parcelamento requer ao menos 2 parcelas."),
  dataPrimeiraParcela: z.coerce.date(),
  modo: ModoParcelamentoSchema,
  categoriaId: z.string().trim().min(1).nullish(),
  subcategoriaId: z.string().trim().min(1).nullish(),
  bancoId: z.string().trim().min(1, "Banco é obrigatório."),
  pessoaDivisaoId: z.string().trim().min(1, "Divisão é obrigatória."),
  pessoaPagouId: z.string().trim().min(1, "Quem pagou é obrigatório."),
  tipoGasto: TipoGastoSchema,
});
export type CriarParcelamentoInput = z.infer<typeof CriarParcelamentoSchema>;

// PATCH genérico só edita metadados — quantidade/valor/modo/data exigem os
// endpoints dedicados (alterarModoParcelamento) pois implicam recriar parcelas.
export const AtualizarParcelamentoSchema = z.object({
  descricaoOrigem: z.string().trim().min(1).nullish(),
  descricaoPropria: z.string().trim().min(1).nullish(),
  categoriaId: z.string().trim().min(1).nullish(),
  subcategoriaId: z.string().trim().min(1).nullish(),
  bancoId: z.string().trim().min(1).optional(),
  pessoaDivisaoId: z.string().trim().min(1).optional(),
  pessoaPagouId: z.string().trim().min(1).optional(),
  tipoGasto: TipoGastoSchema.optional(),
});
export type AtualizarParcelamentoInput = z.infer<
  typeof AtualizarParcelamentoSchema
>;

export const AlterarModoParcelamentoSchema = z.object({
  novoModo: ModoParcelamentoSchema,
});
export type AlterarModoParcelamentoInput = z.infer<
  typeof AlterarModoParcelamentoSchema
>;

export const QuitarParcelamentoSchema = z.object({
  dataQuitacao: z.coerce.date().optional(),
  descontoCentavos: z.number().int().nonnegative().default(0),
});
export type QuitarParcelamentoInput = z.infer<typeof QuitarParcelamentoSchema>;

// ─── Erros de negócio ───────────────────────────────────────────────────────

export class ParcelamentoJaQuitadoError extends Error {
  constructor() {
    super("Parcelamento já quitado.");
    this.name = "ParcelamentoJaQuitadoError";
  }
}

export class ParcelamentoModoInvalidoError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ParcelamentoModoInvalidoError";
  }
}

export class ParcelamentoConcluidoError extends Error {
  constructor() {
    super("Todas as parcelas já foram lançadas.");
    this.name = "ParcelamentoConcluidoError";
  }
}

export class ParcelamentoComLancamentosRealizadosError extends Error {
  constructor() {
    super(
      "Não é possível excluir: já existem parcelas realizadas neste parcelamento.",
    );
    this.name = "ParcelamentoComLancamentosRealizadosError";
  }
}

// ─── Validação de referências ───────────────────────────────────────────────

type ReferenciasParcelamento = {
  bancoId: string;
  pessoaDivisaoId: string;
  pessoaPagouId: string;
  categoriaId?: string | null;
  subcategoriaId?: string | null;
};

async function referenciasValidas(
  prisma: PrismaClient,
  householdId: string,
  refs: ReferenciasParcelamento,
): Promise<boolean> {
  const [banco, pessoaDivisao, pessoaPagou] = await Promise.all([
    prisma.banco.findFirst({ where: { id: refs.bancoId, householdId } }),
    prisma.pessoa.findFirst({
      where: { id: refs.pessoaDivisaoId, householdId },
    }),
    prisma.pessoa.findFirst({
      where: { id: refs.pessoaPagouId, householdId },
    }),
  ]);
  if (!banco || !pessoaDivisao || !pessoaPagou) return false;

  if (refs.subcategoriaId) {
    if (!refs.categoriaId) return false;
    const subcategoria = await prisma.subcategoria.findFirst({
      where: { id: refs.subcategoriaId, householdId },
    });
    if (!subcategoria || subcategoria.categoriaId !== refs.categoriaId) {
      return false;
    }
  }

  if (refs.categoriaId) {
    const categoria = await prisma.categoria.findFirst({
      where: { id: refs.categoriaId, householdId },
    });
    if (!categoria) return false;
  }

  return true;
}

// ─── CRUD ───────────────────────────────────────────────────────────────────

export function listarParcelamentos(
  prisma: PrismaClient,
  householdId: string,
  opts: { bancoId?: string; pessoaId?: string; incluirQuitados?: boolean } = {},
) {
  return prisma.parcelamento.findMany({
    where: {
      householdId,
      ...(opts.bancoId ? { bancoId: opts.bancoId } : {}),
      ...(opts.pessoaId
        ? { OR: [{ pessoaDivisaoId: opts.pessoaId }, { pessoaPagouId: opts.pessoaId }] }
        : {}),
      ...(opts.incluirQuitados ? {} : { quitadoEm: null }),
    },
    include: { lancamentos: true },
    orderBy: { dataPrimeiraParcela: "desc" },
  });
}

export function buscarParcelamento(
  prisma: PrismaClient,
  householdId: string,
  id: string,
) {
  return prisma.parcelamento.findFirst({
    where: { id, householdId },
    include: { lancamentos: { orderBy: { numeroParcela: "asc" } } },
  });
}

export async function criarParcelamento(
  prisma: PrismaClient,
  householdId: string,
  input: CriarParcelamentoInput,
) {
  const valido = await referenciasValidas(prisma, householdId, input);
  if (!valido) return null;

  const valorTotalCentavos =
    input.valorParcelaCentavos * input.quantidadeParcelas;
  const valoresParcelas = dividirParcelas(
    valorTotalCentavos,
    input.quantidadeParcelas,
  );

  const dadosHeader = {
    householdId,
    descricaoOrigem: input.descricaoOrigem ?? null,
    descricaoPropria: input.descricaoPropria ?? null,
    valorTotalCentavos,
    quantidadeParcelas: input.quantidadeParcelas,
    dataPrimeiraParcela: input.dataPrimeiraParcela,
    modo: input.modo,
    categoriaId: input.categoriaId ?? null,
    subcategoriaId: input.subcategoriaId ?? null,
    bancoId: input.bancoId,
    pessoaDivisaoId: input.pessoaDivisaoId,
    pessoaPagouId: input.pessoaPagouId,
    tipoGasto: input.tipoGasto,
  };

  const dadosLancamentoBase = {
    householdId,
    descricaoOrigem: input.descricaoOrigem ?? null,
    descricaoPropria: input.descricaoPropria ?? null,
    categoriaId: input.categoriaId ?? null,
    subcategoriaId: input.subcategoriaId ?? null,
    bancoId: input.bancoId,
    pessoaDivisaoId: input.pessoaDivisaoId,
    pessoaPagouId: input.pessoaPagouId,
    tipoGasto: input.tipoGasto,
  };

  return prisma.$transaction(async (tx) => {
    const header = await tx.parcelamento.create({ data: dadosHeader });

    if (input.modo === "AVISTA") {
      await tx.lancamento.create({
        data: {
          ...dadosLancamentoBase,
          data: input.dataPrimeiraParcela,
          valorCentavos: valorTotalCentavos,
          numeroParcela: null,
          previsto: false,
          parcelamentoId: header.id,
        },
      });
    } else if (input.modo === "GRADUAL") {
      await tx.lancamento.create({
        data: {
          ...dadosLancamentoBase,
          data: dataDaParcela(input.dataPrimeiraParcela, 0),
          valorCentavos: valoresParcelas[0],
          numeroParcela: 1,
          previsto: false,
          parcelamentoId: header.id,
        },
      });
    } else {
      // PREVISAO: a parcela do mês corrente (1ª) já ocorreu, as demais são
      // previsão até chegar o mês respectivo.
      for (let i = 0; i < input.quantidadeParcelas; i++) {
        await tx.lancamento.create({
          data: {
            ...dadosLancamentoBase,
            data: dataDaParcela(input.dataPrimeiraParcela, i),
            valorCentavos: valoresParcelas[i],
            numeroParcela: i + 1,
            previsto: i > 0,
            parcelamentoId: header.id,
          },
        });
      }
    }

    return tx.parcelamento.findUniqueOrThrow({
      where: { id: header.id },
      include: { lancamentos: { orderBy: { numeroParcela: "asc" } } },
    });
  });
}

export async function atualizarParcelamento(
  prisma: PrismaClient,
  householdId: string,
  id: string,
  input: AtualizarParcelamentoInput,
) {
  const existente = await buscarParcelamento(prisma, householdId, id);
  if (!existente) return null;

  const refs: ReferenciasParcelamento = {
    bancoId: input.bancoId ?? existente.bancoId,
    pessoaDivisaoId: input.pessoaDivisaoId ?? existente.pessoaDivisaoId,
    pessoaPagouId: input.pessoaPagouId ?? existente.pessoaPagouId,
    categoriaId:
      input.categoriaId !== undefined ? input.categoriaId : existente.categoriaId,
    subcategoriaId:
      input.subcategoriaId !== undefined
        ? input.subcategoriaId
        : existente.subcategoriaId,
  };
  const valido = await referenciasValidas(prisma, householdId, refs);
  if (!valido) return null;

  return prisma.$transaction(async (tx) => {
    await tx.parcelamento.update({ where: { id }, data: input });
    await tx.lancamento.updateMany({
      where: { parcelamentoId: id },
      data: {
        ...(input.descricaoOrigem !== undefined
          ? { descricaoOrigem: input.descricaoOrigem }
          : {}),
        ...(input.descricaoPropria !== undefined
          ? { descricaoPropria: input.descricaoPropria }
          : {}),
        ...(input.categoriaId !== undefined
          ? { categoriaId: input.categoriaId }
          : {}),
        ...(input.subcategoriaId !== undefined
          ? { subcategoriaId: input.subcategoriaId }
          : {}),
        ...(input.bancoId !== undefined ? { bancoId: input.bancoId } : {}),
        ...(input.pessoaDivisaoId !== undefined
          ? { pessoaDivisaoId: input.pessoaDivisaoId }
          : {}),
        ...(input.pessoaPagouId !== undefined
          ? { pessoaPagouId: input.pessoaPagouId }
          : {}),
        ...(input.tipoGasto !== undefined ? { tipoGasto: input.tipoGasto } : {}),
      },
    });
    return tx.parcelamento.findUniqueOrThrow({
      where: { id },
      include: { lancamentos: { orderBy: { numeroParcela: "asc" } } },
    });
  });
}

export async function removerParcelamento(
  prisma: PrismaClient,
  householdId: string,
  id: string,
) {
  const existente = await buscarParcelamento(prisma, householdId, id);
  if (!existente) return null;

  const temRealizadas = existente.lancamentos.some((l) => !l.previsto);
  if (temRealizadas) {
    throw new ParcelamentoComLancamentosRealizadosError();
  }

  return prisma.$transaction(async (tx) => {
    await tx.lancamento.deleteMany({ where: { parcelamentoId: id } });
    return tx.parcelamento.delete({ where: { id } });
  });
}

// ─── Ciclo de vida ──────────────────────────────────────────────────────────

export async function alterarModoParcelamento(
  prisma: PrismaClient,
  householdId: string,
  id: string,
  novoModo: ModoParcelamento,
) {
  const existente = await buscarParcelamento(prisma, householdId, id);
  if (!existente) return null;

  if (existente.quitadoEm) throw new ParcelamentoJaQuitadoError();

  if (existente.modo === "AVISTA") {
    throw new ParcelamentoModoInvalidoError(
      "Parcelamento à vista já teve o valor total lançado — não é possível mudar de modo. Use quitação/estorno manual.",
    );
  }

  if (novoModo === existente.modo) return existente;

  const valoresParcelas = dividirParcelas(
    existente.valorTotalCentavos,
    existente.quantidadeParcelas,
  );
  const dadosLancamentoBase = {
    householdId,
    descricaoOrigem: existente.descricaoOrigem,
    descricaoPropria: existente.descricaoPropria,
    categoriaId: existente.categoriaId,
    subcategoriaId: existente.subcategoriaId,
    bancoId: existente.bancoId,
    pessoaDivisaoId: existente.pessoaDivisaoId,
    pessoaPagouId: existente.pessoaPagouId,
    tipoGasto: existente.tipoGasto,
  };

  return prisma.$transaction(async (tx) => {
    if (novoModo === "PREVISAO") {
      const numerosExistentes = new Set(
        existente.lancamentos
          .map((l) => l.numeroParcela)
          .filter((n): n is number => n !== null),
      );
      for (let i = 0; i < existente.quantidadeParcelas; i++) {
        const numeroParcela = i + 1;
        if (numerosExistentes.has(numeroParcela)) continue;
        await tx.lancamento.create({
          data: {
            ...dadosLancamentoBase,
            data: dataDaParcela(existente.dataPrimeiraParcela, i),
            valorCentavos: valoresParcelas[i],
            numeroParcela,
            previsto: true,
            parcelamentoId: existente.id,
          },
        });
      }
    } else if (novoModo === "GRADUAL") {
      // Apaga as parcelas futuras auto-geradas (previsto=true) que ainda não
      // ocorreram — as já realizadas permanecem intactas.
      await tx.lancamento.deleteMany({
        where: { parcelamentoId: existente.id, previsto: true },
      });
    } else if (novoModo === "AVISTA") {
      // Consolida tudo (parcelas já realizadas e previstas) num único
      // lançamento com o valor total — mesmo resultado de ter criado o
      // parcelamento direto em modo AVISTA.
      await tx.lancamento.deleteMany({ where: { parcelamentoId: existente.id } });
      await tx.lancamento.create({
        data: {
          ...dadosLancamentoBase,
          data: existente.dataPrimeiraParcela,
          valorCentavos: existente.valorTotalCentavos,
          numeroParcela: null,
          previsto: false,
          parcelamentoId: existente.id,
        },
      });
    }

    return tx.parcelamento.update({
      where: { id },
      data: { modo: novoModo },
      include: { lancamentos: { orderBy: { numeroParcela: "asc" } } },
    });
  });
}

export async function lancarProximaParcelaGradual(
  prisma: PrismaClient,
  householdId: string,
  id: string,
) {
  const existente = await buscarParcelamento(prisma, householdId, id);
  if (!existente) return null;

  if (existente.modo !== "GRADUAL") {
    throw new ParcelamentoModoInvalidoError(
      "Lançar próxima parcela manualmente só é permitido no modo gradual.",
    );
  }
  if (existente.quitadoEm) throw new ParcelamentoJaQuitadoError();

  const maiorNumeroLancado = existente.lancamentos.reduce(
    (max, l) => Math.max(max, l.numeroParcela ?? 0),
    0,
  );
  if (maiorNumeroLancado >= existente.quantidadeParcelas) {
    throw new ParcelamentoConcluidoError();
  }

  const valoresParcelas = dividirParcelas(
    existente.valorTotalCentavos,
    existente.quantidadeParcelas,
  );
  const proximoNumero = maiorNumeroLancado + 1;

  return prisma.lancamento.create({
    data: {
      householdId,
      descricaoOrigem: existente.descricaoOrigem,
      descricaoPropria: existente.descricaoPropria,
      categoriaId: existente.categoriaId,
      subcategoriaId: existente.subcategoriaId,
      bancoId: existente.bancoId,
      pessoaDivisaoId: existente.pessoaDivisaoId,
      pessoaPagouId: existente.pessoaPagouId,
      tipoGasto: existente.tipoGasto,
      data: dataDaParcela(existente.dataPrimeiraParcela, proximoNumero - 1),
      valorCentavos: valoresParcelas[proximoNumero - 1],
      numeroParcela: proximoNumero,
      previsto: false,
      parcelamentoId: existente.id,
    },
  });
}

export async function quitarAntecipadamente(
  prisma: PrismaClient,
  householdId: string,
  id: string,
  input: QuitarParcelamentoInput,
) {
  const existente = await buscarParcelamento(prisma, householdId, id);
  if (!existente) return null;

  if (existente.quitadoEm) throw new ParcelamentoJaQuitadoError();

  const dataQuitacao = input.dataQuitacao ?? new Date();
  const valoresParcelas = dividirParcelas(
    existente.valorTotalCentavos,
    existente.quantidadeParcelas,
  );
  // Só conta como "já lançada" a parcela realizada (previsto=false) — as
  // previstas (PREVISAO) são placeholders que serão apagados e substituídos
  // pela quitação, então entram no valor restante.
  const numerosLancados = new Set(
    existente.lancamentos
      .filter((l) => !l.previsto)
      .map((l) => l.numeroParcela)
      .filter((n): n is number => n !== null),
  );
  const valorRestante = valoresParcelas.reduce(
    (soma, valor, indice) =>
      numerosLancados.has(indice + 1) ? soma : soma + valor,
    0,
  );
  const valorAPagar = Math.max(valorRestante - input.descontoCentavos, 0);

  return prisma.$transaction(async (tx) => {
    await tx.lancamento.deleteMany({
      where: { parcelamentoId: existente.id, previsto: true },
    });

    const lancamentoQuitacao =
      valorAPagar > 0
        ? await tx.lancamento.create({
            data: {
              householdId,
              descricaoOrigem: existente.descricaoOrigem,
              descricaoPropria: `Quitação antecipada: ${existente.descricaoPropria ?? existente.descricaoOrigem ?? "parcelamento"}`,
              categoriaId: existente.categoriaId,
              subcategoriaId: existente.subcategoriaId,
              bancoId: existente.bancoId,
              pessoaDivisaoId: existente.pessoaDivisaoId,
              pessoaPagouId: existente.pessoaPagouId,
              tipoGasto: existente.tipoGasto,
              data: dataQuitacao,
              valorCentavos: valorAPagar,
              numeroParcela: null,
              previsto: false,
              parcelamentoId: existente.id,
            },
          })
        : null;

    const parcelamento = await tx.parcelamento.update({
      where: { id },
      data: {
        quitadoEm: dataQuitacao,
        descontoQuitacaoCentavos: input.descontoCentavos,
      },
      include: { lancamentos: { orderBy: { numeroParcela: "asc" } } },
    });

    return { parcelamento, lancamentoQuitacao };
  });
}

// ─── Uso pelo fluxo de importação ───────────────────────────────────────────

// Procura um parcelamento aberto já existente que corresponda aos mesmos
// dados de compra (mesmo banco/valor total/qtd/data da 1ª parcela) — usado
// para anexar uma parcela detectada num extrato/fatura à compra já
// registrada, em vez de criar um novo cabeçalho duplicado.
export function encontrarParcelamentoCorrespondente(
  prisma: PrismaClient,
  householdId: string,
  opts: {
    bancoId: string;
    valorTotalCentavos: number;
    quantidadeParcelas: number;
    dataPrimeiraParcela: Date;
  },
) {
  return prisma.parcelamento.findFirst({
    where: {
      householdId,
      bancoId: opts.bancoId,
      valorTotalCentavos: opts.valorTotalCentavos,
      quantidadeParcelas: opts.quantidadeParcelas,
      dataPrimeiraParcela: opts.dataPrimeiraParcela,
      quitadoEm: null,
    },
    include: { lancamentos: { orderBy: { numeroParcela: "asc" } } },
  });
}
