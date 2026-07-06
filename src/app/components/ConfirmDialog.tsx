"use client";

import { useCallback, useState } from "react";

type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type PendingConfirm = ConfirmOptions & {
  message: string;
  resolve: (valor: boolean) => void;
};

/**
 * Substitui window.confirm por um diálogo que respeita a identidade visual
 * do sistema. Uso: const { confirmar, dialog } = useConfirmDialog(); depois
 * `if (!(await confirmar("..."))) return;` e renderizar {dialog} no JSX.
 */
export function useConfirmDialog() {
  const [pendente, setPendente] = useState<PendingConfirm | null>(null);

  const confirmar = useCallback((message: string, options?: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPendente({ message, ...options, resolve });
    });
  }, []);

  function responder(valor: boolean) {
    pendente?.resolve(valor);
    setPendente(null);
  }

  const dialog = pendente ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/40 p-lg">
      <div className="flex w-full max-w-[24rem] flex-col gap-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-lg shadow-lg">
        <h2 className="text-base font-bold text-on-surface">
          {pendente.title ?? "Confirmar ação"}
        </h2>
        <p className="text-sm text-on-surface-variant">{pendente.message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => responder(false)}
            className="rounded-full border border-outline-variant px-md py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container-low"
          >
            {pendente.cancelLabel ?? "Cancelar"}
          </button>
          <button
            type="button"
            onClick={() => responder(true)}
            className="rounded-full bg-danger px-md py-1.5 text-xs font-semibold text-on-danger hover:opacity-90"
          >
            {pendente.confirmLabel ?? "Remover"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirmar, dialog };
}
