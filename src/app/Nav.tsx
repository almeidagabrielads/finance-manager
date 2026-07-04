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

  if (pathname === "/login" || pathname === "/cadastro") {
    return null;
  }

  return (
    <header className="border-outline-variant bg-surface sticky top-0 z-50 w-full border-b shadow-sm">
      <div className="px-lg mx-auto flex h-16 max-w-[1400px] items-center justify-between">
        <div className="gap-xl flex items-center">
          <span className="text-primary text-lg font-bold">FINANCO</span>
          <nav className="gap-xs hidden items-center md:flex">
            {LINKS.map((link) => {
              const ativo =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    ativo
                      ? "bg-primary/10 px-md text-primary rounded-full py-1.5 text-xs font-bold"
                      : "px-md text-on-surface-variant hover:text-primary rounded-full py-1.5 text-xs font-medium transition-colors"
                  }
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="gap-md flex items-center text-sm">
          {usuario === undefined ? null : usuario ? (
            <div className="gap-md flex items-center">
              <span className="text-on-surface-variant">{usuario.nome}</span>
              <button
                onClick={sair}
                className="border-outline-variant px-md text-primary hover:bg-primary/10 rounded-full border py-1.5 text-xs font-semibold transition-colors"
              >
                Sair
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-primary px-md text-on-primary rounded-full py-1.5 text-xs font-semibold hover:opacity-90"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
