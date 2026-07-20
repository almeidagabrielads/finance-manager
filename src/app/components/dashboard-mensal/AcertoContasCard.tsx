import Link from "next/link";
import { formatarReais } from "../dashboard-anual/formatoAnual";

type Transferencia = { deId: string; paraId: string; valorCentavos: number };
type SaldoDivisaoGrupo = {
  participantes: string[];
  transferenciasSugeridas: Transferencia[];
};

type Props = {
  carregada: boolean;
  divisao: SaldoDivisaoGrupo | null;
  nomePessoa: (id: string) => string;
};

export function AcertoContasCard({ carregada, divisao, nomePessoa }: Props) {
  return (
    <div className="gap-md bg-primary p-lg text-on-primary flex flex-col justify-between rounded-xl shadow-sm">
      <h2 className="text-on-primary/70 text-center font-sans text-xs font-semibold tracking-wide uppercase">
        Acerto de contas
      </h2>
      {!carregada ? (
        <p className="text-on-primary/80 text-center text-sm">Carregando…</p>
      ) : !divisao ? (
        <p className="text-on-primary/90 text-center text-sm">
          Cadastre pelo menos duas pessoas do tipo Individual em{" "}
          <Link href="/pessoas" className="font-semibold underline">
            Pessoas
          </Link>{" "}
          para calcular o acerto de contas.
        </p>
      ) : divisao.transferenciasSugeridas.length === 0 ? (
        <>
          <div className="gap-md flex items-center justify-center">
            {divisao.participantes.slice(0, 2).map((id, i) => (
              <span
                key={id}
                className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${
                  i === 0
                    ? "bg-tertiary-container text-on-tertiary-container"
                    : "bg-secondary text-on-secondary"
                }`}
              >
                {nomePessoa(id).charAt(0).toUpperCase()}
              </span>
            ))}
          </div>
          <p className="text-on-primary/90 text-center text-sm">
            Saldo zerado.
          </p>
        </>
      ) : (
        <div className="flex flex-col gap-2 text-center">
          {divisao.transferenciasSugeridas.slice(0, 2).map((t, i) => (
            <p key={i} className="text-lg font-bold">
              {nomePessoa(t.deId)} deve {formatarReais(t.valorCentavos)}
            </p>
          ))}
          {divisao.transferenciasSugeridas.length > 2 && (
            <p className="text-on-primary/70 text-sm">
              +{divisao.transferenciasSugeridas.length - 2} outra(s)
              pendência(s)
            </p>
          )}
          <p className="text-on-primary/70 text-sm">
            Para equilibrar os gastos compartilhados
          </p>
        </div>
      )}
      <Link
        href="/divisao"
        className="bg-on-primary/10 px-md py-sm hover:bg-on-primary/20 rounded-xl text-center text-sm font-semibold"
      >
        Ver detalhes
      </Link>
    </div>
  );
}
