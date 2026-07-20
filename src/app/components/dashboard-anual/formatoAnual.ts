// Formatação de moeda específica do Dashboard Anual — diferente de
// `formatarMoeda` (src/lib/domain/formatacao.ts), que sempre usa valor
// absoluto: aqui o sinal é preservado (saldos negativos aparecem com "-"),
// e há uma variante compacta sem casas decimais para a tabela anual.

export function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatarReaisCompacto(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

export function formatarReaisCompactoComSimbolo(centavos: number): string {
  return `R$ ${formatarReaisCompacto(centavos)}`;
}
