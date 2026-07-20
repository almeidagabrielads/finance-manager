"use client";

export type AbaInvestimentos = "CARTEIRA" | "RELATORIOS";

const TABS: { value: AbaInvestimentos; label: string }[] = [
  { value: "RELATORIOS", label: "Relatórios" },
  { value: "CARTEIRA", label: "Carteira" },
];

type Props = {
  aba: AbaInvestimentos;
  onChange: (aba: AbaInvestimentos) => void;
};

export function InvestimentosTabs({ aba, onChange }: Props) {
  return (
    <nav className="gap-sm border-outline-variant flex items-center border-b">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={
            aba === tab.value
              ? "border-primary text-on-surface border-b-2 px-1 pb-2 text-sm font-semibold"
              : "text-on-surface-variant hover:text-on-surface px-1 pb-2 text-sm font-medium"
          }
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
