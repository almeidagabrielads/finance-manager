"use client";

import { useEffect, useRef, useState } from "react";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * Select customizado (não usa <select> nativo) para que o estilo do app seja
 * preservado também no painel aberto — o menu de um <select> nativo é
 * renderizado pelo SO e ignora a maior parte do CSS.
 */
export function Select({
  value,
  onChange,
  options,
  placeholder = "Selecione...",
  id,
  ariaLabel,
  disabled = false,
  className = "",
}: Props) {
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setAberto(false);
      }
    }
    function aoPressionarTecla(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoPressionarTecla);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoPressionarTecla);
    };
  }, [aberto]);

  const selecionada = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-label={ariaLabel}
        className="border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low px-md flex w-full items-center justify-between gap-2 rounded-full border py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          className={selecionada ? "" : "text-on-surface-variant font-normal"}
        >
          {selecionada ? selecionada.label : placeholder}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {aberto && (
        <div
          role="listbox"
          className="border-outline-variant bg-surface-container-lowest absolute z-30 mt-1 max-h-64 min-w-full overflow-y-auto rounded-xl border py-1 shadow-lg"
        >
          {options.length === 0 && (
            <p className="text-on-surface-variant px-md py-2 text-sm">
              Sem opções.
            </p>
          )}
          {options.map((opcao) => (
            <button
              key={opcao.value}
              type="button"
              role="option"
              aria-selected={opcao.value === value}
              disabled={opcao.disabled}
              onClick={() => {
                onChange(opcao.value);
                setAberto(false);
              }}
              className={`px-md w-full py-2 text-left text-sm whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                opcao.value === value
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-on-surface hover:bg-surface-container-low"
              }`}
            >
              {opcao.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
