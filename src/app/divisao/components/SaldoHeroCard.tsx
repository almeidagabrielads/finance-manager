import { corPessoa } from "../../components/PessoaBadge";
import { formatarMoeda } from "@/lib/domain/formatacao";

type Transferencia = { deId: string; paraId: string; valorCentavos: number };

type Props = {
  participantes: string[];
  transferenciasSugeridas: Transferencia[];
  nome: (id: string) => string;
};

export function SaldoHeroCard({
  participantes,
  transferenciasSugeridas,
  nome,
}: Props) {
  return (
    <div className="bg-primary p-lg text-on-primary rounded-xl">
      <div className="gap-md flex items-start justify-between">
        <div>
          <p className="text-on-primary/70 text-xs font-semibold tracking-wide uppercase">
            Saldo acumulado
          </p>
          {transferenciasSugeridas.length === 0 ? (
            <p className="mt-2 text-2xl font-bold">Contas quitadas</p>
          ) : (
            transferenciasSugeridas.map((t, i) => (
              <p key={i} className="mt-2 text-2xl font-bold">
                {nome(t.deId)} deve {formatarMoeda(t.valorCentavos)} para{" "}
                {nome(t.paraId)}
              </p>
            ))
          )}
          <p className="text-on-primary/70 mt-2 text-sm">
            Baseado em todo o histórico de gastos compartilhados
          </p>
        </div>
        <div className="flex -space-x-2">
          {participantes.map((id) => (
            <span
              key={id}
              className={`border-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${corPessoa(id)}`}
            >
              {nome(id).charAt(0).toUpperCase()}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
