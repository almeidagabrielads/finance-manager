import { formatarMoeda } from "@/lib/domain/formatacao";
import type { IndicadorPlanejado } from "@/lib/domain/orcamento";
import { CampoOrcamento } from "./CampoOrcamento";
import type { PlanejadoEditavel } from "./types";

type Props = {
  label: string;
  indicador: IndicadorPlanejado;
  destaque?: boolean;
  expansivel?: boolean;
  aberta?: boolean;
  onToggle?: () => void;
  planejadoEditavel?: PlanejadoEditavel;
};

export function LinhaMes({
  label,
  indicador,
  destaque = false,
  expansivel = false,
  aberta = false,
  onToggle,
  planejadoEditavel,
}: Props) {
  const diferenca = indicador.realCentavos - indicador.planejadoCentavos;
  const estourou = diferenca > 0;
  const percentual =
    indicador.planejadoCentavos > 0
      ? (Math.abs(diferenca) / indicador.planejadoCentavos) * 100
      : null;

  return (
    <tr
      className={`border-outline-variant/60 border-b ${
        destaque ? "bg-surface-container-low font-medium" : ""
      }`}
    >
      <td className={`p-3 ${destaque ? "" : "pl-8"}`}>
        <span className="gap-sm flex items-center">
          {expansivel ? (
            <button
              onClick={onToggle}
              aria-label={aberta ? "Recolher categoria" : "Expandir categoria"}
              className="text-on-surface-variant hover:text-primary"
            >
              {aberta ? "▾" : "▸"}
            </button>
          ) : destaque ? (
            <span className="inline-block w-3" />
          ) : null}
          {label}
        </span>
      </td>
      {planejadoEditavel ? (
        <CampoOrcamento
          key={
            planejadoEditavel.itemId ??
            `${label}-${planejadoEditavel.valorCentavos}-${planejadoEditavel.divisaoId}-${planejadoEditavel.tipoGasto}`
          }
          valorCentavos={planejadoEditavel.valorCentavos}
          temRegistro={!!planejadoEditavel.itemId}
          divisaoId={planejadoEditavel.divisaoId}
          tipoGasto={planejadoEditavel.tipoGasto}
          pessoas={planejadoEditavel.pessoas}
          onSalvar={planejadoEditavel.onSalvar}
        />
      ) : (
        <>
          <td className="p-3"></td>
          <td className="p-3"></td>
          <td className="data-tabular p-3 text-right">
            {formatarMoeda(indicador.planejadoCentavos)}
          </td>
        </>
      )}
      <td className="data-tabular p-3 text-right">
        {formatarMoeda(indicador.realCentavos)}
      </td>
      <td className="data-tabular p-3 text-right">
        {diferenca === 0 ? (
          <span className="text-on-surface-variant">
            {formatarMoeda(0)} (0%)
          </span>
        ) : (
          <span className={estourou ? "text-danger" : "text-success"}>
            {formatarMoeda(Math.abs(diferenca))}
            {percentual !== null && ` (${percentual.toFixed(1)}%)`}{" "}
            {estourou ? "↑" : "↓"}
          </span>
        )}
      </td>
    </tr>
  );
}
