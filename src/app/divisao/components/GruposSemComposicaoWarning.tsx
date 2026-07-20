import Link from "next/link";

type GrupoSemComposicao = { pessoaId: string; nome: string };

type Props = {
  grupos: GrupoSemComposicao[];
};

export function GruposSemComposicaoWarning({ grupos }: Props) {
  if (grupos.length === 0) return null;

  return (
    <p className="border-danger/30 bg-danger-container p-lg text-on-danger-container rounded-xl border text-sm">
      {grupos.map((g) => g.nome).join(", ")}{" "}
      {grupos.length === 1 ? "não tem" : "não têm"} integrantes cadastrados — os
      gastos atribuídos a {grupos.length === 1 ? "esse grupo" : "esses grupos"}{" "}
      ficaram de fora do acerto. Configure a composição em{" "}
      <Link href="/pessoas" className="font-medium underline">
        Pessoas
      </Link>
      .
    </p>
  );
}
