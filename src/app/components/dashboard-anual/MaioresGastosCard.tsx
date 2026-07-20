import { formatarReais } from "./formatoAnual";

type CategoriaGasto = { categoriaId: string; totalCentavos: number };

type Props = {
  ano: number;
  maioresGastos: CategoriaGasto[];
  nomeCategoria: (categoriaId: string) => string | undefined;
};

export function MaioresGastosCard({
  ano,
  maioresGastos,
  nomeCategoria,
}: Props) {
  const maiorGastoCentavos = maioresGastos[0]?.totalCentavos ?? 1;

  return (
    <div className="gap-sm border-outline-variant bg-surface-container-lowest p-lg flex flex-col rounded-xl border shadow-sm">
      <h2 className="text-on-surface text-base font-semibold">
        Maiores gastos
      </h2>
      {maioresGastos.length > 0 ? (
        <div className="gap-md flex flex-col">
          {maioresGastos.map((g) => (
            <div key={g.categoriaId} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-on-surface font-medium">
                  {nomeCategoria(g.categoriaId) ?? g.categoriaId}
                </span>
                <span className="data-tabular text-on-surface-variant">
                  {formatarReais(g.totalCentavos)}
                </span>
              </div>
              <div className="bg-surface-container h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{
                    width: `${(g.totalCentavos / maiorGastoCentavos) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-on-surface-variant text-sm">
          Nenhum lançamento em {ano}.
        </p>
      )}
    </div>
  );
}
