import { LancamentosClient } from "./LancamentosClient";

export default function LancamentosPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-lg p-lg">
      <h1 className="text-2xl font-bold text-on-surface">Lançamentos</h1>
      <LancamentosClient />
    </main>
  );
}
