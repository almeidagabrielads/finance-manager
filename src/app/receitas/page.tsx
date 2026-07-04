import { ReceitasClient } from "./ReceitasClient";

export default function ReceitasPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-lg p-lg">
      <h1 className="text-2xl font-bold text-on-surface">Receitas</h1>
      <ReceitasClient />
    </main>
  );
}
