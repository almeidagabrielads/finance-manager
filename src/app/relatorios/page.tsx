import { RelatoriosClient } from "./RelatoriosClient";

export default function RelatoriosPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-lg p-lg">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Relatórios financeiros</h1>
        <p className="text-sm text-on-surface-variant">
          Analise o desempenho financeiro do Nosso Lar.
        </p>
      </div>
      <RelatoriosClient />
    </main>
  );
}
