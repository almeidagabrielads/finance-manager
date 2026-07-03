import { DivisaoClient } from "./DivisaoClient";

export default function DivisaoPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Quem deve quem</h1>
      <DivisaoClient />
    </main>
  );
}
