import { formatarReais, formatarReaisCompacto } from "./formatoAnual";

type Props = {
  ano: number;
  totalPlanejadoAno: number;
  totalRealAno: number;
  economiaTotalAno: number;
};

export function AnaliseAnualCards({
  ano,
  totalPlanejadoAno,
  totalRealAno,
  economiaTotalAno,
}: Props) {
  const cardClass =
    "flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-sm";

  return (
    <div className="gap-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <div className={cardClass}>
        <p className="text-on-surface-variant text-xs font-semibold uppercase">
          Total anual planejado
        </p>
        <p className="data-tabular text-on-surface text-xl font-bold">
          {formatarReais(totalPlanejadoAno)}
        </p>
        <p className="text-on-surface-variant text-xs">
          Meta: {formatarReaisCompacto(totalPlanejadoAno / 12)}/mês
        </p>
      </div>
      <div className={cardClass}>
        <p className="text-on-surface-variant text-xs font-semibold uppercase">
          Total anual realizado
        </p>
        <p className="data-tabular text-on-surface text-xl font-bold">
          {formatarReais(totalRealAno)}
        </p>
        <p
          className={`text-xs ${economiaTotalAno >= 0 ? "text-success" : "text-danger"}`}
        >
          {totalPlanejadoAno > 0
            ? `${Math.abs(((totalRealAno - totalPlanejadoAno) / totalPlanejadoAno) * 100).toFixed(1)}% ${
                economiaTotalAno >= 0 ? "abaixo" : "acima"
              } do planejado`
            : "—"}
        </p>
      </div>
      <div className={cardClass}>
        <p className="text-on-surface-variant text-xs font-semibold uppercase">
          Média mensal de gastos
        </p>
        <p className="data-tabular text-on-surface text-xl font-bold">
          {formatarReais(totalRealAno / 12)}
        </p>
        <p className="text-on-surface-variant text-xs">Nos 12 meses de {ano}</p>
      </div>
      <div className={cardClass}>
        <p className="text-on-surface-variant text-xs font-semibold uppercase">
          Economia total no ano
        </p>
        <p
          className={`data-tabular text-xl font-bold ${
            economiaTotalAno >= 0 ? "text-secondary" : "text-danger"
          }`}
        >
          {formatarReais(economiaTotalAno)}
        </p>
        <p className="text-on-surface-variant text-xs">Planejado − realizado</p>
      </div>
    </div>
  );
}
