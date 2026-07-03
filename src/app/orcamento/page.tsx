import { OrcamentoClient } from "./OrcamentoClient";

export default function OrcamentoPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Orçamento planejado</h1>
      <OrcamentoClient />
    </main>
  );
}
