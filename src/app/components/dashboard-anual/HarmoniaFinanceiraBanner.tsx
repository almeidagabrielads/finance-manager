import Link from "next/link";
import { formatarReais } from "./formatoAnual";

type Props = {
  ano: number;
  economiaTotalAno: number;
  taxaPoupancaPercentual: number;
};

export function HarmoniaFinanceiraBanner({
  ano,
  economiaTotalAno,
  taxaPoupancaPercentual,
}: Props) {
  return (
    <div className="gap-md bg-primary p-lg text-on-primary flex flex-col items-start justify-between rounded-xl sm:flex-row sm:items-center">
      <div>
        <h3 className="text-lg font-bold">Harmonia financeira</h3>
        <p className="text-on-primary/85 text-sm">
          {economiaTotalAno >= 0
            ? `Em ${ano}, vocês economizaram ${formatarReais(economiaTotalAno)} em relação ao planejado, com taxa de poupança de ${taxaPoupancaPercentual.toFixed(1)}%. Parabéns pela parceria!`
            : `Em ${ano}, os gastos ficaram ${formatarReais(Math.abs(economiaTotalAno))} acima do planejado. Vale revisar o orçamento juntos.`}
        </p>
      </div>
      <Link
        href="/relatorios"
        className="bg-on-primary/10 px-md py-sm hover:bg-on-primary/20 rounded-xl text-sm font-semibold"
      >
        Ver relatório detalhado
      </Link>
    </div>
  );
}
