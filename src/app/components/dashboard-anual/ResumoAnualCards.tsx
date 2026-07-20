import { Badge } from "../Badge";
import { formatarReais } from "./formatoAnual";

type Props = {
  ano: number;
  receitaCentavos: number;
  despesaCentavos: number;
  saldoCentavos: number;
  taxaPoupancaPercentual: number;
  despesaPercentualReceita: number;
  variacaoReceitaPercentual: number | null;
};

export function ResumoAnualCards({
  ano,
  receitaCentavos,
  despesaCentavos,
  saldoCentavos,
  taxaPoupancaPercentual,
  despesaPercentualReceita,
  variacaoReceitaPercentual,
}: Props) {
  return (
    <div className="gap-md border-outline-variant bg-surface-container-lowest p-lg grid grid-cols-1 rounded-xl border md:grid-cols-2 lg:grid-cols-4">
      <div className="flex flex-col gap-1">
        <p className="text-on-surface-variant text-sm">Receita total</p>
        <p className="data-tabular text-on-surface text-2xl font-bold">
          {formatarReais(receitaCentavos)}
        </p>
        {variacaoReceitaPercentual !== null && (
          <Badge
            variant={variacaoReceitaPercentual >= 0 ? "success" : "danger"}
            className="w-fit"
          >
            {variacaoReceitaPercentual >= 0 ? "+" : ""}
            {variacaoReceitaPercentual.toFixed(0)}% vs. {ano - 1}
          </Badge>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-on-surface-variant text-sm">Despesas totais</p>
        <p className="data-tabular text-on-surface text-2xl font-bold">
          {formatarReais(despesaCentavos)}
        </p>
        <span className="text-on-surface-variant text-xs">
          {despesaPercentualReceita.toFixed(0)}% da receita
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-on-surface-variant text-sm">Taxa de poupança</p>
        <p className="data-tabular text-secondary text-2xl font-bold">
          {taxaPoupancaPercentual.toFixed(1)}%
        </p>
        <div className="bg-surface-container h-2 w-full overflow-hidden rounded-full">
          <div
            className="bg-secondary h-full rounded-full"
            style={{
              width: `${Math.min(Math.max(taxaPoupancaPercentual, 0), 100)}%`,
            }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-on-surface-variant text-sm">
          Saldo anual até o momento
        </p>
        <p
          className={`data-tabular text-2xl font-bold ${
            saldoCentavos >= 0 ? "text-success" : "text-danger"
          }`}
        >
          {formatarReais(saldoCentavos)}
        </p>
        <span className="text-on-surface-variant text-xs">
          Receitas − despesas em {ano}
        </span>
      </div>
    </div>
  );
}
