export const SUBTIPOS_RECEITA_UI = [
  { value: "SALARIO", label: "Salário" },
  { value: "VOUCHER", label: "Voucher" },
  { value: "INVESTIMENTO", label: "Investimento" },
  { value: "OUTROS", label: "Outros" },
] as const;

export type SubtipoReceita = (typeof SUBTIPOS_RECEITA_UI)[number]["value"];

export type Pessoa = { id: string; nome: string };

export type Receita = {
  id: string;
  pessoaId: string;
  subtipo: SubtipoReceita;
  descricao: string | null;
  valorCentavos: number;
  mes: string;
};

export type ReceitaInput = Partial<{
  pessoaId: string;
  subtipo: SubtipoReceita;
  descricao: string | null;
  valorCentavos: number;
  mes: string;
}>;

export type ModoVisualizacao = "mensal" | "anual";

export const NOMES_MES = [
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

export const NOMES_MES_ABREV = [
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

export const MESES_INICIAIS = 2;

export const inputClass =
  "rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-1.5 text-sm focus:border-primary focus:outline-none";

export const cardClass =
  "rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm";
