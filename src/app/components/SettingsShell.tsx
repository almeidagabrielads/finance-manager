"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Users, Settings, Landmark, BarChart3, Download } from "lucide-react";

const ITENS = [
  { href: "/pessoas", label: "Pessoas & Acesso", Icone: Users },
  {
    href: "/configuracoes/preferencias",
    label: "Preferências",
    Icone: Settings,
  },
  { href: "/bancos", label: "Contas & Bancos", Icone: Landmark },
  { href: "/categorias", label: "Categorias", Icone: BarChart3 },
  {
    href: "/configuracoes/exportar-dados",
    label: "Exportar & Dados",
    Icone: Download,
  },
] as const;

export function SettingsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="gap-lg p-lg mx-auto flex w-full max-w-5xl flex-col">
      <div>
        <h1 className="text-on-surface text-2xl font-bold">
          Configurações do Sistema
        </h1>
        <p className="text-on-surface-variant text-sm">
          Gerencie o acesso, preferências e estrutura da sua vida financeira
          compartilhada.
        </p>
      </div>

      <div className="gap-lg border-outline-variant bg-surface-container-lowest flex flex-col rounded-xl border sm:flex-row">
        <nav className="p-md sm:border-outline-variant flex shrink-0 flex-row gap-1 overflow-x-auto sm:w-64 sm:flex-col sm:overflow-visible sm:border-r">
          {ITENS.map((item) => {
            const ativo = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  ativo
                    ? "bg-primary/10 px-md text-primary flex items-center gap-2 rounded-lg py-2 text-sm font-semibold whitespace-nowrap"
                    : "px-md text-on-surface-variant hover:bg-surface-container hover:text-on-surface flex items-center gap-2 rounded-lg py-2 text-sm whitespace-nowrap transition-colors"
                }
              >
                <item.Icone className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-lg flex-1">{children}</div>
      </div>
    </main>
  );
}
