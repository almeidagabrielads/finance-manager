import { ReceitasClient } from "./ReceitasClient";

export default function ReceitasPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-lg p-lg">
      <ReceitasClient />
    </main>
  );
}
