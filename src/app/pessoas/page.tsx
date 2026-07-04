import { PessoasClient } from "./PessoasClient";

export default function PessoasPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-lg p-lg">
      <h1 className="text-2xl font-bold text-on-surface">Pessoas</h1>
      <PessoasClient />
    </main>
  );
}
