"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Usuario = { id: string; email: string; nome: string };

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/lancamentos", label: "Lançamentos" },
  { href: "/receitas", label: "Receitas" },
  { href: "/orcamento", label: "Orçamento" },
  { href: "/investimentos", label: "Investimentos" },
  { href: "/divisao", label: "Divisão" },
  { href: "/relatorios", label: "Relatórios" },
  { href: "/importacao", label: "Importar" },
  { href: "/configuracoes", label: "Configurações" },
];

export function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [usuario, setUsuario] = useState<Usuario | null | undefined>(undefined);

  useEffect(() => {
    let cancelado = false;
    fetch("/api/auth/me")
      .then(async (response) => {
        if (cancelado) return;
        setUsuario(response.ok ? await response.json() : null);
      })
      .catch(() => {
        if (!cancelado) setUsuario(null);
      });
    return () => {
      cancelado = true;
    };
  }, [router]);

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUsuario(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface shadow-sm">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-lg">
        <div className="flex items-center gap-xl">
          <span className="text-lg font-bold text-primary">FINANCO</span>
          <nav className="hidden items-center gap-xs md:flex">
            {LINKS.map((link) => {
              const ativo = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    ativo
                      ? "rounded-full bg-primary/10 px-md py-1.5 text-xs font-bold text-primary"
                      : "rounded-full px-md py-1.5 text-xs font-medium text-on-surface-variant transition-colors hover:text-primary"
                  }
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-md text-sm">
          {usuario === undefined ? null : usuario ? (
            <div className="flex items-center gap-md">
              <span className="text-on-surface-variant">{usuario.nome}</span>
              <button
                onClick={sair}
                className="rounded-full border border-outline-variant px-md py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                Sair
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-primary px-md py-1.5 text-xs font-semibold text-on-primary hover:opacity-90"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
