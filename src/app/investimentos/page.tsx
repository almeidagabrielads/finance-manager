import { InvestimentosClient } from "./InvestimentosClient";

export default function InvestimentosPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Investimentos</h1>
      <InvestimentosClient />
    </main>
  );
}
