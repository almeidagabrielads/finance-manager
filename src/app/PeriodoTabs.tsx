"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/", label: "Mês Atual" },
  { href: "/relatorio-anual", label: "Ano" },
  { href: "/relatorios", label: "Relatórios" },
];

function tituloMesAtual(): string {
  const hoje = new Date();
  const mes = hoje.toLocaleDateString("pt-BR", {
    month: "long",
    timeZone: "UTC",
  });
  const mesCapitalizado = mes.charAt(0).toUpperCase() + mes.slice(1);
  return `${mesCapitalizado} ${hoje.getUTCFullYear()}`;
}

export function PeriodoTabs() {
  const pathname = usePathname();

  return (
    <div className="border-outline-variant bg-surface-container-lowest px-lg py-md border-b">
      <div className="gap-lg mx-auto flex w-full max-w-6xl flex-wrap items-center">
        <h1 className="text-on-surface text-xl font-bold">
          {tituloMesAtual()}
        </h1>
        <nav className="gap-lg flex items-center text-sm">
          {ABAS.map((aba) => (
            <Link
              key={aba.href}
              href={aba.href}
              className={
                pathname === aba.href
                  ? "border-primary text-on-surface border-b-2 pb-1 font-semibold"
                  : "text-on-surface-variant hover:text-primary pb-1"
              }
            >
              {aba.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
