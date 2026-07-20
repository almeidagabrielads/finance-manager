import { Fragment } from "react";
import { mediaMensesConcluidos as calcularMedia } from "@/lib/domain/relatorioAnual";
import { formatarReaisCompactoComSimbolo } from "./formatoAnual";

const MESES = [
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

type ItemConsolidado = {
  categoriaId: string;
  subcategoriaId: string | null;
  meses: { planejadoCentavos: number; realCentavos: number }[];
};

type Categoria = { id: string; nome: string };

type Props = {
  categorias: Categoria[];
  itensConsolidados: ItemConsolidado[];
  totalConsolidadoPorMes: number[];
  mesesConcluidos: number;
  nomeSubcategoria: (subcategoriaId: string) => string | undefined;
};

function chave(categoriaId: string, subcategoriaId: string | null) {
  return `${categoriaId}::${subcategoriaId ?? ""}`;
}

function media(valoresPorMes: number[], mesesConcluidos: number): string {
  const resultado = calcularMedia(valoresPorMes, mesesConcluidos);
  return resultado === null ? "—" : formatarReaisCompactoComSimbolo(resultado);
}

export function RelatorioAnualTable({
  categorias,
  itensConsolidados,
  totalConsolidadoPorMes,
  mesesConcluidos,
  nomeSubcategoria,
}: Props) {
  const categoriasComItens = categorias
    .map((c) => ({
      categoria: c,
      itens: itensConsolidados.filter((i) => i.categoriaId === c.id),
    }))
    .filter((c) => c.itens.length > 0);

  return (
    <div className="border-outline-variant bg-surface-container-lowest overflow-x-auto rounded-xl border">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-outline-variant text-on-surface-variant border-b text-xs font-semibold tracking-wide uppercase">
            <th className="p-2 text-left">Categoria</th>
            {MESES.map((m) => (
              <th key={m} className="p-2 text-right">
                {m}
              </th>
            ))}
            <th className="border-outline-variant border-l p-2 text-right">
              Média
            </th>
          </tr>
        </thead>
        <tbody>
          {categoriasComItens.map(({ categoria, itens }) => {
            const subtotalPorMes = Array.from({ length: 12 }, (_, i) =>
              itens.reduce(
                (soma, item) => soma + item.meses[i].realCentavos,
                0,
              ),
            );
            return (
              <Fragment key={categoria.id}>
                <tr className="bg-surface-container-low">
                  <td className="text-on-surface p-2 font-semibold">
                    {categoria.nome}
                  </td>
                  {subtotalPorMes.map((total, idx) => (
                    <td
                      key={idx}
                      className="data-tabular text-on-surface p-2 text-right font-semibold"
                    >
                      {formatarReaisCompactoComSimbolo(total)}
                    </td>
                  ))}
                  <td className="data-tabular text-on-surface border-outline-variant border-l p-2 text-right font-semibold">
                    {media(subtotalPorMes, mesesConcluidos)}
                  </td>
                </tr>
                {itens.map((item) => {
                  const realPorMes = item.meses.map((mes) => mes.realCentavos);
                  return (
                    <tr
                      key={chave(item.categoriaId, item.subcategoriaId)}
                      className="border-outline-variant/60 border-b"
                    >
                      <td className="pl-lg text-on-surface-variant p-2">
                        {item.subcategoriaId
                          ? (nomeSubcategoria(item.subcategoriaId) ??
                            item.subcategoriaId)
                          : "Geral"}
                      </td>
                      {item.meses.map((mes, idx) => (
                        <td
                          key={idx}
                          className={`data-tabular p-2 text-right ${
                            mes.planejadoCentavos > 0 &&
                            mes.realCentavos > mes.planejadoCentavos
                              ? "text-danger font-semibold"
                              : "text-on-surface"
                          }`}
                        >
                          {formatarReaisCompactoComSimbolo(mes.realCentavos)}
                        </td>
                      ))}
                      <td className="data-tabular text-on-surface-variant border-outline-variant border-l p-2 text-right">
                        {media(realPorMes, mesesConcluidos)}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
          <tr className="border-outline-variant border-t-2 font-semibold">
            <td className="text-on-surface p-2">Total consolidado</td>
            {totalConsolidadoPorMes.map((total, idx) => (
              <td
                key={idx}
                className="data-tabular text-on-surface p-2 text-right"
              >
                {formatarReaisCompactoComSimbolo(total)}
              </td>
            ))}
            <td className="data-tabular text-on-surface border-outline-variant border-l p-2 text-right">
              {media(totalConsolidadoPorMes, mesesConcluidos)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
