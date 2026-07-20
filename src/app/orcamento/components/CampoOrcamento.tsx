"use client";

import { useState } from "react";
import { Select } from "../../components/Select";
import { TIPOS_GASTO, type Pessoa } from "./types";

type Props = {
  valorCentavos: number;
  temRegistro: boolean;
  divisaoId: string | null;
  tipoGasto: string;
  pessoas: Pessoa[];
  onSalvar: (
    valorTexto: string,
    divisaoId: string | null,
    tipoGasto: string,
  ) => void;
};

// Uma "célula" de orçamento editável: valor + divisão + tipo de gasto,
// sempre salvos juntos (mudar qualquer um dos três grava a linha do mês com
// o estado atual dos outros dois) — evita salvar um campo sem os outros.
// Usado pela aba Mês Atual (uma célula por subcategoria).
export function CampoOrcamento({
  valorCentavos,
  temRegistro,
  divisaoId,
  tipoGasto,
  pessoas,
  onSalvar,
}: Props) {
  const [valorTexto, setValorTexto] = useState(
    valorCentavos > 0 || temRegistro ? (valorCentavos / 100).toFixed(2) : "",
  );
  const [divisaoSelecionada, setDivisaoSelecionada] = useState(divisaoId ?? "");
  const [tipoSelecionado, setTipoSelecionado] = useState(tipoGasto);

  return (
    <>
      <td className="p-1">
        <Select
          value={divisaoSelecionada}
          onChange={(v) => {
            setDivisaoSelecionada(v);
            onSalvar(valorTexto, v || null, tipoSelecionado);
          }}
          placeholder="Divisão"
          className="w-full text-xs"
          options={pessoas.map((p) => ({ value: p.id, label: p.nome }))}
        />
      </td>
      <td className="p-1">
        <Select
          value={tipoSelecionado}
          onChange={(v) => {
            setTipoSelecionado(v);
            onSalvar(valorTexto, divisaoSelecionada || null, v);
          }}
          placeholder="Tipo de gasto"
          className="w-full text-xs"
          options={TIPOS_GASTO.map((t) => ({ value: t.value, label: t.label }))}
        />
      </td>
      <td className="p-1 text-right">
        <input
          type="number"
          step="0.01"
          value={valorTexto}
          onChange={(e) => setValorTexto(e.target.value)}
          onBlur={() =>
            onSalvar(valorTexto, divisaoSelecionada || null, tipoSelecionado)
          }
          className="border-outline-variant bg-surface-container-lowest data-tabular w-24 rounded-lg border px-1.5 py-1 text-right"
        />
      </td>
    </>
  );
}
