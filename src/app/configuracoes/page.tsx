import Link from "next/link";

const ITENS = [
  {
    href: "/pessoas",
    titulo: "Pessoas & Acesso",
    descricao: "Quem faz parte do household e como a divisão é calculada.",
  },
  {
    href: "/bancos",
    titulo: "Contas & Bancos",
    descricao: "Bancos, cartões e corretoras usados nos lançamentos.",
  },
  {
    href: "/categorias",
    titulo: "Categorias & Orçamento",
    descricao: "Categorias, subcategorias e percentual sugerido do orçamento.",
  },
  {
    href: "/configuracoes/preferencias",
    titulo: "Preferências",
    descricao: "Moeda, idioma e tema do sistema.",
  },
  {
    href: "/configuracoes/exportar-dados",
    titulo: "Exportar & Dados",
    descricao: "Baixe o histórico de lançamentos em CSV.",
  },
];

export default function ConfiguracoesPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-lg p-lg">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Configurações do sistema</h1>
        <p className="text-sm text-on-surface-variant">
          Gerencie o acesso, preferências e estrutura da sua vida financeira
          compartilhada.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
        {ITENS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col gap-1 rounded-xl border border-outline-variant bg-surface-container-lowest p-lg transition-colors hover:border-primary"
          >
            <h2 className="text-base font-semibold text-on-surface">{item.titulo}</h2>
            <p className="text-sm text-on-surface-variant">{item.descricao}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
