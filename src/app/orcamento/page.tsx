import { OrcamentoClient } from "./OrcamentoClient";

export default function OrcamentoPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-lg p-lg">
      <h1 className="text-2xl font-bold text-on-surface">Orçamento planejado</h1>
      <OrcamentoClient />
    </main>
  );
}
