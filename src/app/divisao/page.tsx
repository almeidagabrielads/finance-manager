import { DivisaoClient } from "./DivisaoClient";

export default function DivisaoPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-lg p-lg">
      <h1 className="text-2xl font-bold text-on-surface">Quem deve quem</h1>
      <DivisaoClient />
    </main>
  );
}
