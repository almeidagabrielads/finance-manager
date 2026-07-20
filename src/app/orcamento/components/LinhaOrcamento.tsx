import { formatarMoeda } from "@/lib/domain/formatacao";
import { CampoOrcamentoCompacto } from "./CampoOrcamentoCompacto";
import {
  MESES,
  chave,
  chaveCategoria,
  vigenteExtra,
  type OrcamentoItem,
  type Pessoa,
} from "./types";

type Props = {
  label: string;
  categoriaId: string;
  subcategoriaId: string | null;
  mapaOrcamentos: Map<string, OrcamentoItem>;
  itensPorSubcategoria: Map<string, OrcamentoItem[]>;
  valorVigenteMes: (
    categoriaId: string,
    subcategoriaId: string | null,
    mes: number,
  ) => number;
  totalAnual: number;
  onSalvar: (
    categoriaId: string,
    subcategoriaId: string | null,
    mes: number,
    valorTexto: string,
    divisaoId: string | null,
    tipoGasto: string,
    valorVigenteAntes: number,
    divisaoIdAntes: string | null,
    tipoGastoAntes: string,
  ) => Promise<void>;
  editavel: boolean;
  pessoas: Pessoa[];
  destaque?: boolean;
};

export function LinhaOrcamento({
  label,
  categoriaId,
  subcategoriaId,
  mapaOrcamentos,
  itensPorSubcategoria,
  valorVigenteMes,
  totalAnual,
  onSalvar,
  editavel,
  pessoas,
  destaque = false,
}: Props) {
  return (
    <tr
      className={`border-outline-variant/60 border-b ${
        destaque ? "bg-surface-container-low font-medium" : ""
      }`}
    >
      <td
        className={`sticky left-0 p-2 ${
          destaque
            ? "bg-surface-container-low"
            : "bg-surface-container-lowest pl-6"
        }`}
      >
        {label}
      </td>
      {MESES.map((_, i) => {
        const mes = i + 1;
        const item = mapaOrcamentos.get(
          chave(categoriaId, subcategoriaId, mes),
        );
        const valorVigente = item
          ? item.valorCentavos
          : valorVigenteMes(categoriaId, subcategoriaId, mes);
        const extraVigente = vigenteExtra(
          itensPorSubcategoria.get(chaveCategoria(categoriaId, subcategoriaId)),
          mes,
        );
        const divisaoExibida = item?.divisaoId ?? extraVigente.divisaoId;
        const tipoExibido = item?.tipoGasto ?? extraVigente.tipoGasto;
        return (
          <td
            key={mes}
            className={editavel ? "p-1" : "data-tabular p-2 text-right"}
          >
            {editavel ? (
              <CampoOrcamentoCompacto
                key={
                  item?.id ??
                  `${chave(categoriaId, subcategoriaId, mes)}-${valorVigente}-${divisaoExibida}-${tipoExibido}`
                }
                valorCentavos={valorVigente}
                temRegistro={!!item}
                divisaoId={divisaoExibida}
                tipoGasto={tipoExibido}
                pessoas={pessoas}
                onSalvar={(valorTexto, divisaoId, tipoGasto) =>
                  onSalvar(
                    categoriaId,
                    subcategoriaId,
                    mes,
                    valorTexto,
                    divisaoId,
                    tipoGasto,
                    valorVigente,
                    divisaoExibida,
                    tipoExibido,
                  )
                }
              />
            ) : (
              formatarMoeda(valorVigente)
            )}
          </td>
        );
      })}
      <td className="data-tabular text-on-surface-variant p-2 text-right">
        {formatarMoeda(totalAnual)}
      </td>
    </tr>
  );
}
