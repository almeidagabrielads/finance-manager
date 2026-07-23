"use client";

import { Plus, Upload } from "lucide-react";
import { ParcelamentosPanel } from "./ParcelamentosPanel";

type Props = {
  quantidadeLinhasImportacaoPendentes: number;
  onNovoLancamento: () => void;
  onImportar: () => void;
  onParcelamentosAlterados: () => void;
  refreshSignalParcelamentos: number;
};

export function LancamentosHeader({
  quantidadeLinhasImportacaoPendentes,
  onNovoLancamento,
  onImportar,
  onParcelamentosAlterados,
  refreshSignalParcelamentos,
}: Props) {
  return (
    <div className="gap-sm flex items-center justify-between">
      <h1 className="text-on-surface text-2xl font-bold">Lançamentos</h1>
      <div className="flex gap-2">
        <ParcelamentosPanel
          onAlterado={onParcelamentosAlterados}
          refreshSignal={refreshSignalParcelamentos}
        />
        <button
          type="button"
          onClick={onNovoLancamento}
          className="bg-primary px-lg text-on-primary flex items-center gap-1.5 rounded-full py-2 text-sm font-semibold hover:opacity-90"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Novo Lançamento
        </button>
        <button
          type="button"
          onClick={onImportar}
          className="border-outline-variant bg-surface-container-lowest px-lg text-on-surface hover:bg-surface-container-low flex items-center gap-1.5 rounded-full border py-2 text-sm font-semibold"
        >
          <Upload className="h-4 w-4" aria-hidden />
          Importar
          {quantidadeLinhasImportacaoPendentes > 0 && (
            <span className="bg-primary text-on-primary flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold">
              {quantidadeLinhasImportacaoPendentes}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
