import { formatarReais } from "./formatoAnual";

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

type Props = {
  ano: number;
  totalConsolidadoPorMes: number[];
  mesMaisCaro: number;
  mesMaisBarato: number;
};

export function TendenciaAnualCard({
  ano,
  totalConsolidadoPorMes,
  mesMaisCaro,
  mesMaisBarato,
}: Props) {
  return (
    <div className="gap-sm border-outline-variant bg-surface-container-lowest p-lg flex flex-col rounded-xl border shadow-sm">
      <h3 className="text-on-surface text-base font-semibold">
        Visão de tendência {ano}
      </h3>
      {totalConsolidadoPorMes.some((v) => v > 0) ? (
        <p className="text-on-surface-variant text-sm">
          O mês com maior gasto consolidado foi{" "}
          <span className="text-on-surface font-semibold">
            {MESES[mesMaisCaro]}
          </span>{" "}
          ({formatarReais(totalConsolidadoPorMes[mesMaisCaro])}), enquanto{" "}
          <span className="text-on-surface font-semibold">
            {MESES[mesMaisBarato]}
          </span>{" "}
          teve o menor consolidado (
          {formatarReais(totalConsolidadoPorMes[mesMaisBarato])}).
        </p>
      ) : (
        <p className="text-on-surface-variant text-sm">
          Sem lançamentos com orçamento planejado em {ano}.
        </p>
      )}
    </div>
  );
}
