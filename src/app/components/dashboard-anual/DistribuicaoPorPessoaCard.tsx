import { formatarReais } from "./formatoAnual";

type DistribuicaoPessoa = {
  pessoaId: string;
  label: string;
  totalCentavos: number;
};
type Transferencia = { deId: string; paraId: string; valorCentavos: number };

type Props = {
  ano: number;
  distribuicao: DistribuicaoPessoa[];
  transferenciasSugeridas: Transferencia[];
  nomePessoa: (pessoaId: string) => string | undefined;
};

export function DistribuicaoPorPessoaCard({
  ano,
  distribuicao,
  transferenciasSugeridas,
  nomePessoa,
}: Props) {
  const totalGeral = distribuicao.reduce(
    (soma, s) => soma + s.totalCentavos,
    0,
  );

  return (
    <div className="gap-sm border-outline-variant bg-surface-container-lowest p-lg flex flex-col rounded-xl border shadow-sm">
      <h3 className="text-on-surface text-base font-semibold">
        Distribuição por responsável
      </h3>
      {distribuicao.length > 0 && totalGeral > 0 ? (
        <div className="gap-md flex flex-col">
          {distribuicao.map((s) => (
            <div key={s.pessoaId} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-on-surface font-medium">{s.label}</span>
                <span className="data-tabular text-on-surface-variant">
                  {((s.totalCentavos / totalGeral) * 100).toFixed(0)}% (
                  {formatarReais(s.totalCentavos)})
                </span>
              </div>
              <div className="bg-surface-container h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-secondary h-full rounded-full"
                  style={{ width: `${(s.totalCentavos / totalGeral) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-on-surface-variant text-sm">
          Sem lançamentos com pessoa vinculada em {ano}.
        </p>
      )}
      {transferenciasSugeridas.length > 0 && (
        <div className="mt-auto flex flex-col gap-0.5">
          {transferenciasSugeridas.map((t, i) => (
            <p key={i} className="text-on-surface-variant text-xs">
              {nomePessoa(t.deId) ?? t.deId} deve{" "}
              {formatarReais(t.valorCentavos)} para{" "}
              {nomePessoa(t.paraId) ?? t.paraId} para equilibrar o ano.
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
