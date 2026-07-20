import Link from "next/link";
import { formatarReais } from "../dashboard-anual/formatoAnual";
import { Badge } from "../Badge";
import { cardClass, cardTitleClass, linkClass } from "./estiloDashboardMensal";

type Lancamento = {
  id: string;
  data: string;
  descricaoOrigem: string | null;
  descricaoPropria: string | null;
  valorCentavos: number;
  descontoCentavos: number;
  pessoaDivisaoId: string;
  pessoaPagouId: string;
};

type Props = {
  lancamentos: Lancamento[];
  nomePessoa: (id: string) => string;
  valorAtribuido: (l: Lancamento) => number;
};

export function TransacoesRecentesCard({
  lancamentos,
  nomePessoa,
  valorAtribuido,
}: Props) {
  return (
    <div className={`${cardClass} lg:col-span-2`}>
      <div className="flex items-center justify-between">
        <h2 className={cardTitleClass}>Transações recentes</h2>
      </div>
      {lancamentos.length > 0 ? (
        <div className="divide-outline-variant/60 flex flex-col divide-y">
          <div className="gap-sm pb-sm text-on-surface-variant grid grid-cols-5 text-xs font-semibold tracking-wide uppercase">
            <span>Data</span>
            <span>Descrição</span>
            <span>Pagador</span>
            <span>Divisão</span>
            <span className="justify-self-end">Valor</span>
          </div>
          {lancamentos.map((l) => (
            <div
              key={l.id}
              className="gap-sm py-sm grid grid-cols-5 items-center text-sm"
            >
              <span className="text-on-surface-variant">
                {new Date(l.data).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  timeZone: "UTC",
                })}
              </span>
              <span className="text-on-surface truncate">
                {l.descricaoPropria || l.descricaoOrigem || "—"}
              </span>
              <Badge className="justify-self-start">
                {nomePessoa(l.pessoaPagouId)}
              </Badge>
              <Badge className="justify-self-start">
                {nomePessoa(l.pessoaDivisaoId)}
              </Badge>
              <span className="data-tabular text-on-surface justify-self-end font-semibold">
                {formatarReais(valorAtribuido(l))}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-on-surface-variant text-sm">
          Nenhum lançamento neste mês.
        </p>
      )}
      <Link href="/lancamentos" className={linkClass}>
        Ver extrato completo →
      </Link>
    </div>
  );
}
