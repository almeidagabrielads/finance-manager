import { formatarMoeda } from "@/lib/domain/formatacao";
import { NOMES_MES } from "./types";

type Props = {
  mes: number;
  ano: number;
  totalDoMes: number;
  totalDoAno: number;
};

export function ReceitasTotaisCards({
  mes,
  ano,
  totalDoMes,
  totalDoAno,
}: Props) {
  return (
    <div className="gap-sm flex">
      <div className="bg-primary px-lg text-on-primary flex flex-col gap-1 rounded-xl py-3">
        <span className="text-xs font-semibold tracking-wide uppercase opacity-80">
          Total do Mês ({NOMES_MES[mes - 1]})
        </span>
        <span className="data-tabular text-2xl font-bold">
          {formatarMoeda(totalDoMes)}
        </span>
      </div>
      <div className="bg-surface-container-high px-lg flex flex-col gap-1 rounded-xl py-3">
        <span className="text-on-surface-variant text-xs font-semibold tracking-wide uppercase">
          Total do Ano ({ano})
        </span>
        <span className="data-tabular text-on-tertiary-container text-2xl font-bold">
          {formatarMoeda(totalDoAno)}
        </span>
      </div>
    </div>
  );
}
