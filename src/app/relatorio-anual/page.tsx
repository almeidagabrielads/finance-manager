import { RelatorioAnualClient } from "./RelatorioAnualClient";

export default function RelatorioAnualPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Relatório anual consolidado</h1>
      <RelatorioAnualClient />
    </main>
  );
}
