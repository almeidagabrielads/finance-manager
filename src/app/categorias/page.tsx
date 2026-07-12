import { SettingsShell } from "../components/SettingsShell";
import { CategoriasClient } from "./CategoriasClient";

export default function CategoriasPage() {
  return (
    <SettingsShell>
      <div className="flex flex-col gap-lg">
        <div>
          <h2 className="text-lg font-semibold text-on-surface">
            Categorias
          </h2>
          <p className="text-sm text-on-surface-variant">
            Categorias e subcategorias — ative ou inative conforme o uso.
          </p>
        </div>
        <CategoriasClient />
      </div>
    </SettingsShell>
  );
}
