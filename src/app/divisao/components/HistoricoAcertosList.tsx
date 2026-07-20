import { Badge } from "../../components/Badge";
import { formatarMoeda } from "@/lib/domain/formatacao";

type Acerto = {
  id: string;
  dataInicio: string;
  dataFim: string;
  valorCentavos: number;
  resolvidoEm: string;
  de: { id: string; nome: string };
  para: { id: string; nome: string };
};

function formatarDataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

function nomeMes(iso: string): string {
  const nome = new Date(iso).toLocaleDateString("pt-BR", {
    month: "long",
    timeZone: "UTC",
  });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

function IconeHistorico() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v5h5" />
      <path d="M3.05 13a9 9 0 1 0 .5-4.5L3 8" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

type Props = {
  historico: Acerto[];
  mostrarCompleto: boolean;
  onToggleCompleto: () => void;
  onRecarregar: () => void;
  nome: (id: string) => string;
};

export function HistoricoAcertosList({
  historico,
  mostrarCompleto,
  onToggleCompleto,
  onRecarregar,
  nome,
}: Props) {
  const historicoVisivel = mostrarCompleto ? historico : historico.slice(0, 3);

  return (
    <div className="border-outline-variant bg-surface-container-lowest p-lg flex flex-col gap-2 rounded-xl border">
      <div className="flex items-center justify-between">
        <h3 className="text-on-surface text-base font-semibold">
          Histórico de acertos
        </h3>
        <button
          onClick={onRecarregar}
          className="text-on-surface-variant hover:text-on-surface"
          aria-label="Atualizar histórico"
        >
          <IconeHistorico />
        </button>
      </div>
      {historico.length === 0 ? (
        <p className="text-on-surface-variant text-sm">
          Nenhum acerto resolvido ainda.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {historicoVisivel.map((a) => (
            <li
              key={a.id}
              className="border-primary flex items-center justify-between gap-2 border-l-2 pl-2"
            >
              <div>
                <p className="text-on-surface text-sm font-medium">
                  {nome(a.de.id)} → {nome(a.para.id)} · {nomeMes(a.dataInicio)}
                </p>
                <p className="text-on-surface-variant text-xs">
                  Resolvido em {formatarDataCurta(a.resolvidoEm)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-success text-sm font-semibold">
                  {formatarMoeda(a.valorCentavos)}
                </span>
                <Badge variant="success" size="2xs">
                  PAGO
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
      {historico.length > 3 && (
        <button
          onClick={onToggleCompleto}
          className="border-outline-variant text-on-surface-variant hover:bg-surface-container-low rounded-lg border py-1.5 text-sm font-medium"
        >
          {mostrarCompleto ? "Mostrar menos" : "Ver histórico completo"}
        </button>
      )}
    </div>
  );
}
