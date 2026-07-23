import Link from "next/link";
import { House } from "lucide-react";
import { CadastroClient } from "./CadastroClient";

export default function CadastroPage() {
  return (
    <main className="flex flex-1">
      <section className="bg-primary p-xl text-on-primary hidden flex-1 flex-col justify-between lg:flex">
        <div className="gap-sm flex items-center">
          <House className="h-6 w-6 shrink-0" />
          <div>
            <h1 className="text-4xl leading-tight font-bold">Revanto</h1>
          </div>
        </div>
        <p className="text-on-primary/90 max-w-[28rem] text-base leading-relaxed">
          &ldquo;Onde o planejamento encontra a parceria. Transformamos a gestão
          financeira em um diálogo leve e transparente para quem divide a
          casa.&rdquo;
        </p>
      </section>

      <section className="bg-surface p-md lg:p-xl flex flex-1 items-center justify-center">
        <div className="space-y-lg w-full max-w-[28rem]">
          <div className="flex flex-col items-center gap-1 lg:hidden">
            <h1 className="text-primary text-3xl font-bold">Revanto</h1>
          </div>
          <header className="space-y-xs">
            <h2 className="text-on-surface text-2xl font-bold">
              Comecem agora
            </h2>
            <p className="text-on-surface-variant text-sm">
              Criem a gestão financeira compartilhada da sua casa
            </p>
          </header>
          <CadastroClient />
          <p className="text-on-surface-variant text-center text-sm">
            Já têm uma conta?{" "}
            <Link href="/login" className="text-primary font-semibold">
              Entrar
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
