"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Settings, LogOut } from "lucide-react";
import { corPessoa } from "./components/PessoaBadge";
import { CalculadoraLateral } from "./components/CalculadoraLateral";
import { unicosPorId } from "@/lib/dedupe";

type Usuario = { id: string; email: string; nome: string };
type Pessoa = { id: string; nome: string; tipo: string };

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/lancamentos", label: "Lançamentos" },
  { href: "/receitas", label: "Receitas" },
  { href: "/investimentos", label: "Investimentos" },
  { href: "/divisao", label: "Divisão" },
  { href: "/relatorios", label: "Relatórios" },
  { href: "/orcamento", label: "Orçamento" },
];

const ROTAS_PUBLICAS = ["/login", "/cadastro"];
const MAX_AVATARES = 4;

export function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [usuario, setUsuario] = useState<Usuario | null | undefined>(undefined);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);

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

  useEffect(() => {
    if (
      usuario === null &&
      !ROTAS_PUBLICAS.some(
        (rota) => pathname === rota || pathname.startsWith(`${rota}/`),
      )
    ) {
      router.replace("/login");
    }
  }, [pathname, router, usuario]);

  useEffect(() => {
    if (!usuario) return;
    let cancelado = false;
    fetch("/api/pessoas")
      .then(async (response) => {
        if (cancelado || !response.ok) return;
        const dados: Pessoa[] = await response.json();
        setPessoas(unicosPorId(dados).filter((p) => p.tipo === "INDIVIDUAL"));
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [usuario]);

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUsuario(null);
    router.replace("/login");
    router.refresh();
  }

  if (ROTAS_PUBLICAS.includes(pathname)) {
    return null;
  }

  return (
    <header className="border-outline-variant bg-surface sticky top-0 z-50 w-full border-b shadow-sm">
      <div className="px-lg mx-auto flex h-16 max-w-[1400px] items-center justify-between">
        <div className="gap-xl flex items-center">
          <Link href="/" className="flex items-baseline gap-1.5">
            <span className="font-display text-primary text-2xl font-bold">
              Revanto
            </span>
          </Link>
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
            <>
              <CalculadoraLateral />
              <Link
                href="/configuracoes"
                aria-label="Configurações"
                className="text-on-surface-variant hover:bg-surface-container hover:text-primary rounded-full p-1.5 transition-colors"
              >
                <Settings className="h-5 w-5" />
              </Link>
              <div className="flex items-center -space-x-2">
                {pessoas.slice(0, MAX_AVATARES).map((p) => (
                  <span
                    key={p.id}
                    title={p.nome}
                    className={`border-surface flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${corPessoa(p.id)}`}
                  >
                    {p.nome.charAt(0).toUpperCase()}
                  </span>
                ))}
                {pessoas.length > MAX_AVATARES && (
                  <span
                    title={`+${pessoas.length - MAX_AVATARES}`}
                    className="border-surface bg-surface-container text-on-surface-variant flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold"
                  >
                    +{pessoas.length - MAX_AVATARES}
                  </span>
                )}
              </div>
              <button
                onClick={sair}
                title="Sair"
                aria-label="Sair"
                className="text-on-surface-variant hover:bg-surface-container hover:text-danger rounded-full p-1.5 transition-colors"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </>
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
