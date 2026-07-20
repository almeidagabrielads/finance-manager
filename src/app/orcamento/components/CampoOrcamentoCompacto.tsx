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

// Versão compacta de CampoOrcamento: os três controles (valor, divisão, tipo
// de gasto) empilhados numa única célula — usada na Visão Anual, onde cada
// mês já é uma coluna e não caberiam 3 colunas a mais por mês.
export function CampoOrcamentoCompacto({
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
    <div className="flex flex-col items-stretch gap-1">
      <input
        type="number"
        step="0.01"
        value={valorTexto}
        onChange={(e) => setValorTexto(e.target.value)}
        onBlur={() =>
          onSalvar(valorTexto, divisaoSelecionada || null, tipoSelecionado)
        }
        className="border-outline-variant bg-surface-container-lowest data-tabular w-28 rounded-lg border px-1.5 py-1 text-right"
      />
      <Select
        value={divisaoSelecionada}
        onChange={(v) => {
          setDivisaoSelecionada(v);
          onSalvar(valorTexto, v || null, tipoSelecionado);
        }}
        placeholder="Divisão"
        className="w-28 text-xs"
        options={pessoas.map((p) => ({ value: p.id, label: p.nome }))}
      />
      <Select
        value={tipoSelecionado}
        onChange={(v) => {
          setTipoSelecionado(v);
          onSalvar(valorTexto, divisaoSelecionada || null, v);
        }}
        placeholder="Tipo de gasto"
        className="w-28 text-xs"
        options={TIPOS_GASTO.map((t) => ({ value: t.value, label: t.label }))}
      />
    </div>
  );
}
