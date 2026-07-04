"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Usuario = { id: string; email: string; nome: string };

export function Nav() {
  const router = useRouter();
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
    <nav className="flex items-center justify-between border-b border-zinc-200 bg-white px-8 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-medium text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="text-zinc-900 hover:text-zinc-600 dark:text-zinc-50 dark:hover:text-zinc-300">
          Início
        </Link>
        <Link href="/lancamentos" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Lançamentos
        </Link>
        <Link href="/receitas" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Receitas
        </Link>
        <Link href="/pessoas" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Pessoas
        </Link>
        <Link href="/categorias" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Categorias
        </Link>
        <Link href="/bancos" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Bancos
        </Link>
        <Link href="/orcamento" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Orçamento
        </Link>
        <Link href="/investimentos" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Investimentos
        </Link>
        <Link href="/divisao" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Divisão
        </Link>
        <Link href="/importacao" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Importar
        </Link>
        <Link href="/relatorio-anual" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Relatório Anual
        </Link>
      </div>
      <div className="text-sm">
        {usuario === undefined ? null : usuario ? (
          <div className="flex items-center gap-3">
            <span className="text-zinc-500">{usuario.nome}</span>
            <button
              onClick={sair}
              className="font-medium text-amber-700 dark:text-amber-500"
            >
              Sair
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="font-medium text-blue-700 dark:text-blue-400"
          >
            Entrar
          </Link>
        )}
      </div>
    </nav>
  );
}
