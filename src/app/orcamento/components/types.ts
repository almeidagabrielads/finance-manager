import type { IndicadorPlanejado } from "@/lib/domain/orcamento";

export type Subcategoria = {
  id: string;
  nome: string;
  categoriaId: string;
  ativo: boolean;
};
export type Categoria = {
  id: string;
  nome: string;
  ativo: boolean;
  subcategorias: Subcategoria[];
};
export type Pessoa = { id: string; nome: string; tipo: string };
export type OrcamentoItem = {
  id: string;
  pessoaId: string | null;
  divisaoId: string | null;
  categoriaId: string;
  subcategoriaId: string | null;
  mes: number | null;
  ano: number;
  valorCentavos: number;
  tipoGasto: string;
};

export type LinhaMensalPlanejadoReal = IndicadorPlanejado & { mes: number };

export type PlanejadoVsRealCategoria = {
  categoriaId: string;
  subcategoriaId: string | null;
  meses: LinhaMensalPlanejadoReal[];
  acumulado: IndicadorPlanejado;
};

export type PlanejadoEditavel = {
  valorCentavos: number;
  itemId?: string;
  divisaoId: string | null;
  tipoGasto: string;
  pessoas: Pessoa[];
  onSalvar: (
    valorTexto: string,
    divisaoId: string | null,
    tipoGasto: string,
  ) => void;
};

// "" = Total (casa toda): soma de todas as pessoas INDIVIDUAL, somente leitura.
export const TOTAL_CASA = "";

export const MESES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export const MESES_LONGOS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const TIPOS_GASTO = [
  { value: "FIXO", label: "Fixo" },
  { value: "VARIAVEL", label: "Variável" },
  { value: "INVESTIMENTO", label: "Investimento" },
] as const;

export async function parseErro(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  if (typeof body?.error === "string") return body.error;
  return "Não foi possível completar a operação.";
}

export function chave(
  categoriaId: string,
  subcategoriaId: string | null,
  mes: number | null,
): string {
  return `${categoriaId}|${subcategoriaId ?? ""}|${mes ?? "ANUAL"}`;
}

export function chaveCategoria(
  categoriaId: string,
  subcategoriaId: string | null,
) {
  return `${categoriaId}::${subcategoriaId ?? ""}`;
}

// Agrupa os itens de orçamento por categoria/subcategoria, ordenados por mês
// (mes ausente = vigente desde o mês 1). Usado para achar a divisão/tipo de
// gasto vigentes num mês sem entrada própria — mesmo princípio do valor
// vigente (ver relatorios.ts), calculado no cliente porque divisão e tipo de
// gasto não são numéricos e não passam pelo relatório planejado vs. real.
export function agruparPorSubcategoria(
  itens: OrcamentoItem[],
): Map<string, OrcamentoItem[]> {
  const mapa = new Map<string, OrcamentoItem[]>();
  for (const item of itens) {
    const k = chaveCategoria(item.categoriaId, item.subcategoriaId);
    const lista = mapa.get(k) ?? [];
    lista.push(item);
    mapa.set(k, lista);
  }
  for (const lista of mapa.values()) {
    lista.sort((a, b) => (a.mes ?? 1) - (b.mes ?? 1));
  }
  return mapa;
}

export function vigenteExtra(
  itensDaSubcategoria: OrcamentoItem[] | undefined,
  mes: number,
): { divisaoId: string | null; tipoGasto: string } {
  let vigente: OrcamentoItem | undefined;
  for (const item of itensDaSubcategoria ?? []) {
    if ((item.mes ?? 1) <= mes) vigente = item;
  }
  return {
    divisaoId: vigente?.divisaoId ?? null,
    tipoGasto: vigente?.tipoGasto ?? "VARIAVEL",
  };
}

// A API já filtra categorias inativas por padrão, mas não filtra
// subcategorias inativas dentro de uma categoria ativa.
export function somenteAtivas(categorias: Categoria[]): Categoria[] {
  return categorias
    .filter((c) => c.ativo)
    .map((c) => ({
      ...c,
      subcategorias: c.subcategorias.filter((s) => s.ativo),
    }));
}

export function deslocarMes(
  ano: number,
  mes: number,
  delta: number,
): { ano: number; mes: number } {
  const total = (ano * 12 + (mes - 1) + delta + 12_000) % 12; // guarda contra negativos
  const anoBase = ano + Math.floor((mes - 1 + delta) / 12);
  return { ano: anoBase, mes: total + 1 };
}
