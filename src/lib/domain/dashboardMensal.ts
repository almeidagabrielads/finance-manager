import { valorLiquidoCentavos } from "./lancamentos";

// ─── Rateio de lançamentos ao filtrar por pessoa ───────────────────────────────
//
// Sem filtro (Geral) ou filtrando por um grupo, o valor exibido é o valor
// integral do lançamento. Filtrando por uma pessoa individual, um lançamento
// dividido em um grupo do qual ela participa mostra só a fração dela —
// coerente com "Gastos totais", que já soma essa mesma fração (ver
// resolverFracaoPorGrupo no backend).

export type IntegranteDoGrupo = { pessoaId: string; peso: number };

export type PessoaParaRateio = {
  id: string;
  integrantesDoGrupo: IntegranteDoGrupo[];
};

export type LancamentoParaRateio = {
  valorCentavos: number;
  descontoCentavos: number;
  pessoaDivisaoId: string;
};

export function somaPesos(integrantes: IntegranteDoGrupo[]): number {
  return integrantes.reduce((soma, i) => soma + i.peso, 0);
}

export function valorAtribuidoPorPessoa(
  lancamento: LancamentoParaRateio,
  pessoas: PessoaParaRateio[],
  pessoaFiltroId: string,
): number {
  const liquido = valorLiquidoCentavos(lancamento);
  if (!pessoaFiltroId || lancamento.pessoaDivisaoId === pessoaFiltroId) {
    return liquido;
  }

  const grupo = pessoas.find((p) => p.id === lancamento.pessoaDivisaoId);
  const integrante = grupo?.integrantesDoGrupo.find(
    (i) => i.pessoaId === pessoaFiltroId,
  );
  if (!grupo || !integrante) return liquido;

  const pesos = somaPesos(grupo.integrantesDoGrupo);
  return pesos > 0 ? Math.round(liquido * (integrante.peso / pesos)) : liquido;
}

// ─── Orçamento do mês (planejado vs. real por categoria) ───────────────────────

export type MesPlanejadoVsReal = {
  mes: number;
  planejadoCentavos: number;
  realCentavos: number;
};

export type PlanejadoVsRealCategoria = {
  categoriaId: string;
  meses: MesPlanejadoVsReal[];
};

export type TotalCategoriaDoMes = {
  categoriaId: string;
  planejadoCentavos: number;
  realCentavos: number;
};

export type CategoriasOrcamentoDoMes = {
  categorias: TotalCategoriaDoMes[];
  totalPlanejadoCentavos: number;
  totalRealCentavos: number;
};

// Reduz o orçamento anual (planejado vs. real por categoria, com 12 meses
// cada) ao mês selecionado, descarta categorias sem movimento (nem
// planejado, nem real) e ordena as demais pelo maior percentual consumido —
// as que mais estouraram o planejado aparecem primeiro.
export function agregarCategoriasDoMes(
  orcamento: PlanejadoVsRealCategoria[],
  mes: number,
): CategoriasOrcamentoDoMes {
  const totaisPorCategoria = new Map<string, TotalCategoriaDoMes>();
  for (const c of orcamento) {
    const doMes = c.meses.find((m) => m.mes === mes) ?? {
      planejadoCentavos: 0,
      realCentavos: 0,
    };
    const acumulado = totaisPorCategoria.get(c.categoriaId) ?? {
      categoriaId: c.categoriaId,
      planejadoCentavos: 0,
      realCentavos: 0,
    };
    acumulado.planejadoCentavos += doMes.planejadoCentavos;
    acumulado.realCentavos += doMes.realCentavos;
    totaisPorCategoria.set(c.categoriaId, acumulado);
  }

  const categorias = Array.from(totaisPorCategoria.values())
    .filter((c) => c.planejadoCentavos > 0 || c.realCentavos > 0)
    .sort((a, b) => {
      const percentualA =
        a.planejadoCentavos > 0
          ? a.realCentavos / a.planejadoCentavos
          : Infinity;
      const percentualB =
        b.planejadoCentavos > 0
          ? b.realCentavos / b.planejadoCentavos
          : Infinity;
      return percentualB - percentualA;
    });

  return {
    categorias,
    totalPlanejadoCentavos: categorias.reduce(
      (soma, c) => soma + c.planejadoCentavos,
      0,
    ),
    totalRealCentavos: categorias.reduce((soma, c) => soma + c.realCentavos, 0),
  };
}
