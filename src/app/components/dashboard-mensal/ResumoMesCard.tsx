import { formatarReais } from "../dashboard-anual/formatoAnual";
import { cardClass, cardTitleClass } from "./estiloDashboardMensal";

type Props = {
  receitaCentavos: number | null;
  despesaCentavos: number | null;
  saldoCentavos: number | null;
};

export function ResumoMesCard({
  receitaCentavos,
  despesaCentavos,
  saldoCentavos,
}: Props) {
  return (
    <div className={`${cardClass} lg:col-span-2`}>
      <h2 className={cardTitleClass}>Resumo do mês</h2>
      <div className="gap-sm grid grid-cols-1 sm:grid-cols-3">
        <div>
          <p className="text-on-surface-variant text-xs">Receita total</p>
          <p className="data-tabular text-on-surface text-2xl font-semibold">
            {receitaCentavos !== null ? formatarReais(receitaCentavos) : "—"}
          </p>
        </div>
        <div>
          <p className="text-on-surface-variant text-xs">Gastos totais</p>
          <p className="data-tabular text-on-surface text-2xl font-semibold">
            {despesaCentavos !== null ? formatarReais(despesaCentavos) : "—"}
          </p>
        </div>
        <div>
          <p className="text-on-surface-variant text-xs">Saldo do mês</p>
          <p
            className={`data-tabular text-2xl font-semibold ${
              saldoCentavos !== null && saldoCentavos < 0
                ? "text-danger"
                : "text-on-surface"
            }`}
          >
            {saldoCentavos !== null ? formatarReais(saldoCentavos) : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
