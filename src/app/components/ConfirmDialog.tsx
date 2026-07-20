"use client";

import { useCallback, useState } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";

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
    <Modal maxWidthClass="max-w-[24rem]" zIndexClass="z-[110]">
      <h2 className="text-on-surface text-base font-bold">
        {pendente.title ?? "Confirmar ação"}
      </h2>
      <p className="text-on-surface-variant text-sm">{pendente.message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => responder(false)}>
          {pendente.cancelLabel ?? "Cancelar"}
        </Button>
        <Button variant="danger" onClick={() => responder(true)}>
          {pendente.confirmLabel ?? "Remover"}
        </Button>
      </div>
    </Modal>
  ) : null;

  return { confirmar, dialog };
}
