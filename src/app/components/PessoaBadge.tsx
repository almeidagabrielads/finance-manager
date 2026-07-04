const VARIANTES = {
  isa: "bg-secondary-container text-on-secondary-container",
  gabi: "bg-tertiary-container text-on-tertiary-container",
  compartilhado: "bg-primary-container text-on-primary-container",
} as const;

export type PessoaBadgeVariant = keyof typeof VARIANTES;

export function PessoaBadge({
  nome,
  variant,
}: {
  nome: string;
  variant: PessoaBadgeVariant;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-sm py-0.5 text-xs font-semibold ${VARIANTES[variant]}`}
    >
      {nome}
    </span>
  );
}
