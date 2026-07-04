import { DashboardClient } from "./DashboardClient";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-lg p-lg">
      <h1 className="text-2xl font-bold text-on-surface">Visão geral</h1>
      <DashboardClient />
    </main>
  );
}
