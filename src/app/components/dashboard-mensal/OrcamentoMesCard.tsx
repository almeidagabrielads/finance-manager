import Link from "next/link";
import { formatarReais } from "../dashboard-anual/formatoAnual";
import { cardClass, cardTitleClass } from "./estiloDashboardMensal";

type CategoriaOrcamento = {
  categoriaId: string;
  planejadoCentavos: number;
  realCentavos: number;
};

type Props = {
  categorias: CategoriaOrcamento[];
  totalPlanejadoCentavos: number;
  totalRealCentavos: number;
  nomeCategoria: (id: string) => string;
};

export function OrcamentoMesCard({
  categorias,
  totalPlanejadoCentavos,
  totalRealCentavos,
  nomeCategoria,
}: Props) {
  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between">
        <h2 className={cardTitleClass}>Orçamento do mês</h2>
        <Link
          href="/orcamento"
          className="text-primary text-xs font-medium hover:underline"
        >
          Ver tudo
        </Link>
      </div>
      {categorias.length > 0 ? (
        <div className="gap-md flex flex-col">
          {categorias.map((c) => {
            const estourou = c.realCentavos > c.planejadoCentavos;
            const percentual =
              c.planejadoCentavos > 0
                ? Math.min((c.realCentavos / c.planejadoCentavos) * 100, 100)
                : c.realCentavos > 0
                  ? 100
                  : 0;
            return (
              <div key={c.categoriaId} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-on-surface">
                    {nomeCategoria(c.categoriaId)}
                  </span>
                  <span
                    className={`data-tabular text-xs font-medium ${
                      estourou ? "text-danger" : "text-on-surface-variant"
                    }`}
                  >
                    {formatarReais(c.realCentavos)} /{" "}
                    {formatarReais(c.planejadoCentavos)}
                  </span>
                </div>
                <div className="bg-surface-container h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className={`h-full rounded-full ${
                      estourou
                        ? "bg-danger"
                        : percentual >= 50
                          ? "bg-secondary"
                          : "bg-primary"
                    }`}
                    style={{ width: `${percentual}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-on-surface-variant text-sm">
          Nenhum orçamento planejado para este mês.
        </p>
      )}
      <div className="bg-surface-container-low p-sm mt-auto flex items-center justify-between rounded-lg text-sm">
        <span className="text-on-surface-variant">
          Total planejado: {formatarReais(totalPlanejadoCentavos)}
        </span>
        <span
          className={`data-tabular font-semibold ${
            totalPlanejadoCentavos - totalRealCentavos < 0
              ? "text-danger"
              : "text-on-surface"
          }`}
        >
          Saldo: {formatarReais(totalPlanejadoCentavos - totalRealCentavos)}
        </span>
      </div>
    </div>
  );
}
