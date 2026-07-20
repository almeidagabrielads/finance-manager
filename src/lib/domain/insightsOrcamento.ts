function centavosParaReais(valor: number): string {
  return (valor / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export type CategoriaMesParaInsight = {
  nome: string;
  planejadoCentavos: number;
  realCentavos: number;
};

/**
 * Resume, em uma frase, a maior economia e o maior estouro do mês.
 * Retorna null quando não há variação relevante (nenhum planejado/real).
 */
export function gerarInsightMensal(
  categorias: CategoriaMesParaInsight[],
): string | null {
  const comVariacao = categorias
    .map((c) => ({
      ...c,
      diferencaCentavos: c.planejadoCentavos - c.realCentavos,
    }))
    .filter((c) => c.planejadoCentavos > 0 || c.realCentavos > 0);

  if (comVariacao.length === 0) return null;

  const maiorEconomia = comVariacao.reduce((a, b) =>
    b.diferencaCentavos > a.diferencaCentavos ? b : a,
  );
  const maiorEstouro = comVariacao.reduce((a, b) =>
    b.diferencaCentavos < a.diferencaCentavos ? b : a,
  );

  const houveEconomia = maiorEconomia.diferencaCentavos > 0;
  const houveEstouro = maiorEstouro.diferencaCentavos < 0;

  if (houveEconomia && houveEstouro) {
    return `Vocês economizaram ${centavosParaReais(maiorEconomia.diferencaCentavos)} em ${maiorEconomia.nome} este mês. Isso ajuda a compensar o excesso de ${centavosParaReais(Math.abs(maiorEstouro.diferencaCentavos))} em ${maiorEstouro.nome}.`;
  }

  if (houveEconomia) {
    return `Vocês economizaram ${centavosParaReais(maiorEconomia.diferencaCentavos)} em ${maiorEconomia.nome} este mês.`;
  }

  if (houveEstouro) {
    return `Atenção: os gastos em ${maiorEstouro.nome} superaram o planejado em ${centavosParaReais(Math.abs(maiorEstouro.diferencaCentavos))} este mês.`;
  }

  return null;
}
