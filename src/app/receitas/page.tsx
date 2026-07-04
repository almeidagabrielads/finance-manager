import { ReceitasClient } from "./ReceitasClient";

export default function ReceitasPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Receitas</h1>
      <ReceitasClient />
    </main>
  );
}
