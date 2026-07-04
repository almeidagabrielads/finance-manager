import { LoginClient } from "./LoginClient";

export default function LoginPage() {
  return (
    <main className="flex flex-1">
      <section className="hidden flex-1 flex-col justify-between bg-primary p-xl text-on-primary lg:flex">
        <div>
          <h1 className="text-2xl font-bold">Nosso Lar</h1>
          <p className="text-xs uppercase tracking-wide text-on-primary/70">
            Financial Harmony
          </p>
        </div>
        <p className="max-w-[28rem] text-base leading-relaxed text-on-primary/90">
          &ldquo;Onde o planejamento encontra a parceria. Transformamos a
          gestão financeira em um diálogo leve e transparente para o
          casal.&rdquo;
        </p>
      </section>

      <section className="flex flex-1 items-center justify-center bg-surface p-md lg:p-xl">
        <div className="w-full max-w-[28rem] space-y-lg">
          <div className="flex flex-col items-center gap-1 lg:hidden">
            <h1 className="text-xl font-bold text-primary">Nosso Lar</h1>
            <p className="text-xs uppercase tracking-wide text-on-surface-variant">
              Financial Harmony
            </p>
          </div>
          <header className="space-y-xs">
            <h2 className="text-2xl font-bold text-on-surface">
              Bem-vindos de volta
            </h2>
            <p className="text-sm text-on-surface-variant">
              Acesse sua gestão compartilhada
            </p>
          </header>
          <LoginClient />
        </div>
      </section>
    </main>
  );
}
