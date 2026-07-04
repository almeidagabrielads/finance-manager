import { ImportacaoClient } from "./ImportacaoClient";

export default function ImportacaoPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-lg p-lg">
      <h1 className="text-2xl font-bold text-on-surface">Importar extrato/fatura</h1>
      <ImportacaoClient />
    </main>
  );
}
