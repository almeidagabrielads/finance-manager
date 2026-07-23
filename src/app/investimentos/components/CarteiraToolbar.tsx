"use client";

import { CirclePlus } from "lucide-react";
import { Badge } from "../../components/Badge";
import { Select } from "../../components/Select";

function IconePlusCirculo() {
  return <CirclePlus className="h-4 w-4" />;
}

type Props = {
  totalItens: number;
  algumFiltroAtivo: boolean;
  onLimparFiltros: () => void;
  mostrarFinalizados: boolean;
  onMostrarFinalizadosChange: (valor: boolean) => void;
  anoPosicoes: number;
  anoAtual: number;
  onAnoPosicoesChange: (ano: number) => void;
  onNovoInvestimento: () => void;
};

export function CarteiraToolbar({
  totalItens,
  algumFiltroAtivo,
  onLimparFiltros,
  mostrarFinalizados,
  onMostrarFinalizadosChange,
  anoPosicoes,
  anoAtual,
  onAnoPosicoesChange,
  onNovoInvestimento,
}: Props) {
  return (
    <div className="gap-md p-lg pb-md flex flex-wrap items-center justify-between">
      <div className="flex items-center gap-2">
        <h2 className="text-on-surface text-base font-bold">Carteira</h2>
        <Badge>
          {totalItens}{" "}
          {totalItens === 1 ? "item cadastrado" : "itens cadastrados"}
        </Badge>
        <button
          type="button"
          onClick={onNovoInvestimento}
          className="bg-primary text-on-primary flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold hover:opacity-90"
        >
          <IconePlusCirculo />
          Novo Investimento
        </button>
      </div>
      <div className="gap-md flex items-center">
        {algumFiltroAtivo && (
          <button
            type="button"
            onClick={onLimparFiltros}
            className="text-primary hover:bg-primary-container rounded-full px-3 py-1 text-xs font-semibold transition-colors"
          >
            Limpar filtros
          </button>
        )}
        <label className="text-on-surface-variant flex cursor-pointer items-center gap-1.5 text-xs font-semibold">
          <input
            type="checkbox"
            checked={mostrarFinalizados}
            onChange={(e) => onMostrarFinalizadosChange(e.target.checked)}
          />
          Mostrar finalizados
        </label>
        <div className="gap-sm flex items-center">
          <label
            className="text-on-surface-variant text-xs font-semibold"
            htmlFor="ano-posicoes"
          >
            Posições do ano
          </label>
          <Select
            id="ano-posicoes"
            value={String(anoPosicoes)}
            onChange={(v) => onAnoPosicoesChange(Number(v))}
            options={[anoAtual, anoAtual - 1, anoAtual - 2].map((a) => ({
              value: String(a),
              label: String(a),
            }))}
          />
        </div>
      </div>
    </div>
  );
}
