import { RelatorioAnualClient } from "./RelatorioAnualClient";

export default function RelatorioAnualPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-lg p-lg">
      <h1 className="text-2xl font-bold text-on-surface">Relatório anual consolidado</h1>
      <RelatorioAnualClient />
    </main>
  );
}
