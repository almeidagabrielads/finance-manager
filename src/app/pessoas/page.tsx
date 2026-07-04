import { PessoasClient } from "./PessoasClient";

export default function PessoasPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Pessoas</h1>
      <PessoasClient />
    </main>
  );
}
