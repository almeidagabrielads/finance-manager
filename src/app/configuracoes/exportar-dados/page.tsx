import { ExportarDadosClient } from "./ExportarDadosClient";

export default function ExportarDadosPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-lg p-lg">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Exportar & dados</h1>
        <p className="text-sm text-on-surface-variant">
          Gerencie a portabilidade dos seus dados.
        </p>
      </div>
      <ExportarDadosClient />
    </main>
  );
}
