import { formatarReais, formatarReaisCompacto } from "./formatoAnual";

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

type SaldoMensal = {
  mes: number;
  receitaCentavos: number;
  despesaCentavos: number;
};

type Props = {
  porMes: SaldoMensal[];
  maxFluxoMensal: number;
};

export function GraficoAnual({ porMes, maxFluxoMensal }: Props) {
  return (
    <div className="gap-sm border-outline-variant bg-surface-container-lowest p-lg flex flex-col rounded-xl border shadow-sm lg:col-span-2">
      <h2 className="text-on-surface text-base font-semibold">
        Fluxo de caixa mensal
      </h2>
      <div className="flex h-48 items-end gap-2">
        {porMes.map((m) => {
          const pctReceita = (m.receitaCentavos / maxFluxoMensal) * 100;
          const pctDespesa = (m.despesaCentavos / maxFluxoMensal) * 100;
          return (
            <div
              key={m.mes}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div className="flex h-32 w-full items-end justify-center gap-0.5">
                <div className="relative flex h-full w-1/2 items-end">
                  <span
                    className="data-tabular text-on-surface-variant absolute left-1/2 -translate-x-1/2 text-[9px] font-semibold whitespace-nowrap"
                    style={{ bottom: `calc(${pctReceita}% + 2px)` }}
                  >
                    {formatarReaisCompacto(m.receitaCentavos)}
                  </span>
                  <div
                    className="bg-primary w-full rounded-t"
                    style={{ height: `${pctReceita}%` }}
                    title={`Receita: ${formatarReais(m.receitaCentavos)}`}
                  />
                </div>
                <div className="relative flex h-full w-1/2 items-end">
                  <span
                    className="data-tabular text-on-surface-variant absolute left-1/2 -translate-x-1/2 text-[9px] font-semibold whitespace-nowrap"
                    style={{ bottom: `calc(${pctDespesa}% + 2px)` }}
                  >
                    {formatarReaisCompacto(m.despesaCentavos)}
                  </span>
                  <div
                    className="bg-outline-variant w-full rounded-t"
                    style={{ height: `${pctDespesa}%` }}
                    title={`Despesa: ${formatarReais(m.despesaCentavos)}`}
                  />
                </div>
              </div>
              <span className="text-on-surface-variant text-[10px] font-medium">
                {MESES[m.mes - 1].toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>
      <div className="gap-md text-on-surface-variant flex items-center text-xs">
        <span className="flex items-center gap-1">
          <span className="bg-primary h-2.5 w-2.5 rounded-sm" /> Receita
        </span>
        <span className="flex items-center gap-1">
          <span className="bg-outline-variant h-2.5 w-2.5 rounded-sm" /> Despesa
        </span>
      </div>
    </div>
  );
}
