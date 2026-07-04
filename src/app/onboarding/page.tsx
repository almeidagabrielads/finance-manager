import Link from "next/link";

const PASSOS = [
  {
    href: "/pessoas",
    titulo: "Configurar pessoas",
    descricao:
      "Adicione seu parceiro ou parceira e definam quem cuida do quê no dia a dia.",
  },
  {
    href: "/bancos",
    titulo: "Conectar contas",
    descricao:
      "Cadastre bancos e cartões para ter uma visão automática e clara do saldo do casal.",
  },
  {
    href: "/categorias",
    titulo: "Definir categorias",
    descricao:
      "Personalize as categorias de gastos e o percentual sugerido do orçamento.",
  },
];

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-xl p-lg">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-on-surface">
          Bem-vindos ao FINANCO! Vamos começar?
        </h1>
        <p className="text-sm text-on-surface-variant">
          Estamos aqui para ajudar vocês a construir uma harmonia financeira
          duradoura. Siga os passos abaixo para configurar seu espaço
          compartilhado.
        </p>
      </div>

      <div className="flex flex-col gap-md">
        {PASSOS.map((passo, i) => (
          <Link
            key={passo.href}
            href={passo.href}
            className="flex items-center gap-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg transition-colors hover:border-primary"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {i + 1}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-base font-semibold text-on-surface">
                {passo.titulo}
              </span>
              <span className="text-sm text-on-surface-variant">
                {passo.descricao}
              </span>
            </span>
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-md">
        <Link
          href="/pessoas"
          className="rounded-full bg-primary px-md py-1.5 text-xs font-semibold text-on-primary hover:opacity-90"
        >
          Começar configuração
        </Link>
        <Link
          href="/importacao"
          className="text-xs font-semibold text-primary hover:underline"
        >
          Importar dados de outro app
        </Link>
      </div>
    </main>
  );
}
