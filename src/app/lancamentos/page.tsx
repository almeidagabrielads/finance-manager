import { LancamentosClient } from "./LancamentosClient";

export default function LancamentosPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-lg p-lg">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">
          Lançamento Rápido
        </h1>
        <p className="text-sm text-on-surface-variant">
          Gerencie entradas manuais ou revise importações em massa.
        </p>
      </div>
      <LancamentosClient />
    </main>
  );
}
