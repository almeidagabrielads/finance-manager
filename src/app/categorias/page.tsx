import { CategoriasClient } from "./CategoriasClient";

export default function CategoriasPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-lg p-lg">
      <h1 className="text-2xl font-bold text-on-surface">Categorias e subcategorias</h1>
      <CategoriasClient />
    </main>
  );
}
