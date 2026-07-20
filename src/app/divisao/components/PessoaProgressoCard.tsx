import { corPessoa } from "../../components/PessoaBadge";
import { formatarMoeda } from "@/lib/domain/formatacao";

// Paleta e hash puramente decorativos (cor da barra de progresso por
// pessoa) — sem regra de negócio, por isso ficam locais ao componente, no
// mesmo espírito de hashSimples/corPessoa em PessoaBadge.tsx.
const BARRAS = [
  "bg-secondary",
  "bg-tertiary",
  "bg-success",
  "bg-danger",
] as const;

function hashSimples(texto: string): number {
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = (hash * 31 + texto.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function corBarra(pessoaId: string): string {
  return BARRAS[hashSimples(pessoaId) % BARRAS.length];
}

type Props = {
  pessoaId: string;
  nome: string;
  pagoCentavos: number;
  percentual: number;
};

export function PessoaProgressoCard({
  pessoaId,
  nome,
  pagoCentavos,
  percentual,
}: Props) {
  return (
    <div className="gap-sm border-outline-variant bg-surface-container-lowest p-lg flex flex-col rounded-xl border">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${corPessoa(pessoaId)}`}
          >
            {nome.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="text-on-surface text-sm font-semibold">{nome}</p>
            <p className="text-on-surface-variant text-xs">Pagou no total</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-on-surface text-lg font-bold">
            {formatarMoeda(pagoCentavos)}
          </p>
          <p className="text-on-surface-variant text-xs">
            {percentual.toFixed(1)}%
          </p>
        </div>
      </div>
      <div className="bg-surface-container h-1.5 w-full overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full ${corBarra(pessoaId)}`}
          style={{ width: `${percentual}%` }}
        />
      </div>
    </div>
  );
}
