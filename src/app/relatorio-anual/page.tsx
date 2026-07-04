import { PeriodoTabs } from "../PeriodoTabs";
import { RelatorioAnualClient } from "./RelatorioAnualClient";

export default function RelatorioAnualPage() {
  return (
    <main className="flex w-full flex-col">
      <PeriodoTabs />
      <div className="p-lg mx-auto flex w-full max-w-6xl flex-col">
        <RelatorioAnualClient />
      </div>
    </main>
  );
}
