import { BancosClient } from "./BancosClient";

export default function BancosPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-lg p-lg">
      <h1 className="text-2xl font-bold text-on-surface">Bancos e meios de pagamento</h1>
      <BancosClient />
    </main>
  );
}
