"use client";

/**
 * Shell padrão de modal: overlay escurecido + painel centralizado.
 * O conteúdo (título, formulário, botões) fica por conta de quem usa.
 */
export function Modal({
  children,
  maxWidthClass = "max-w-[32rem]",
  zIndexClass = "z-[100]",
}: {
  children: React.ReactNode;
  maxWidthClass?: string;
  zIndexClass?: string;
}) {
  return (
    <div
      className={`bg-on-surface/40 p-lg fixed inset-0 ${zIndexClass} flex items-center justify-center`}
    >
      <div
        className={`gap-md p-lg border-outline-variant bg-surface-container-lowest flex w-full ${maxWidthClass} flex-col rounded-2xl border shadow-lg`}
      >
        {children}
      </div>
    </div>
  );
}
