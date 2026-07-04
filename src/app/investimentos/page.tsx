import { InvestimentosClient } from "./InvestimentosClient";

export default function InvestimentosPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-lg p-lg">
      <h1 className="text-2xl font-bold text-on-surface">Investimentos</h1>
      <InvestimentosClient />
    </main>
  );
}
