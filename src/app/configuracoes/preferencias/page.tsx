import { PreferenciasClient } from "./PreferenciasClient";

export default function PreferenciasPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-lg p-lg">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Preferências do sistema</h1>
        <p className="text-sm text-on-surface-variant">
          Personalize sua experiência e configurações regionais.
        </p>
      </div>
      <PreferenciasClient />
    </main>
  );
}
