"use client";

import { useEffect, useRef, useState } from "react";
import { Filter } from "lucide-react";
import {
  filtroEstaAtivo,
  filtroVazio,
  type FiltroColuna,
  type Ordenacao,
  type TipoColunaTabela,
} from "@/lib/domain/tabela";

type Props = {
  label: string;
  chave: string;
  tipo: TipoColunaTabela;
  ordenacao: Ordenacao | null;
  onOrdenar: (chave: string) => void;
  filtro?: FiltroColuna;
  onFiltrar: (chave: string, filtro: FiltroColuna) => void;
  onLimparFiltro: (chave: string) => void;
  opcoes?: string[];
  align?: "left" | "right";
};

const inputClass =
  "w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1 text-xs focus:border-primary focus:outline-none";

export function ColumnHeader({
  label,
  chave,
  tipo,
  ordenacao,
  onOrdenar,
  filtro,
  onFiltrar,
  onLimparFiltro,
  opcoes = [],
  align = "left",
}: Props) {
  const [aberto, setAberto] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [aberto]);

  const direcaoAtual = ordenacao?.coluna === chave ? ordenacao.direcao : null;
  const filtroAtual = filtro ?? filtroVazio(tipo);
  const filtroAtivo = filtroEstaAtivo(filtroAtual);

  return (
    <th
      className={`p-2 whitespace-nowrap select-none ${align === "right" ? "text-right" : "text-left"}`}
    >
      <div
        className={`flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}
      >
        <button
          type="button"
          onClick={() => onOrdenar(chave)}
          className="hover:text-on-surface flex cursor-pointer items-center gap-1"
          title={`Ordenar por ${label}`}
        >
          <span>{label}</span>
          <span aria-hidden className="text-[10px] leading-none">
            {direcaoAtual === "asc" ? "▲" : direcaoAtual === "desc" ? "▼" : "⇅"}
          </span>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            title={`Filtrar por ${label}`}
            aria-label={`Filtrar por ${label}`}
            className={`hover:bg-surface-container rounded p-0.5 ${
              filtroAtivo ? "text-primary" : "text-on-surface-variant/60"
            }`}
          >
            <Filter className="h-3 w-3" />
          </button>

          {aberto && (
            <div
              ref={popoverRef}
              className={`border-outline-variant bg-surface-container-lowest p-sm absolute top-full z-20 mt-1 min-w-[180px] rounded-lg border text-left shadow-lg ${
                align === "right" ? "right-0" : "left-0"
              }`}
            >
              <CampoFiltro
                tipo={tipo}
                filtro={filtroAtual}
                opcoes={opcoes}
                onChange={(f) => onFiltrar(chave, f)}
              />
              {filtroAtivo && (
                <button
                  type="button"
                  onClick={() => {
                    onLimparFiltro(chave);
                    setAberto(false);
                  }}
                  className="text-on-surface-variant mt-1.5 cursor-pointer text-xs font-medium underline"
                >
                  Limpar filtro
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </th>
  );
}

function CampoFiltro({
  tipo,
  filtro,
  opcoes,
  onChange,
}: {
  tipo: TipoColunaTabela;
  filtro: FiltroColuna;
  opcoes: string[];
  onChange: (filtro: FiltroColuna) => void;
}) {
  if (tipo === "texto" && filtro.tipo === "texto") {
    return (
      <input
        autoFocus
        className={inputClass}
        placeholder="Buscar..."
        value={filtro.valor}
        onChange={(e) => onChange({ tipo: "texto", valor: e.target.value })}
      />
    );
  }

  if (tipo === "numero" && filtro.tipo === "numero") {
    return (
      <div className="flex flex-col gap-1">
        <input
          type="number"
          className={inputClass}
          placeholder="Mín."
          value={filtro.min}
          onChange={(e) => onChange({ ...filtro, min: e.target.value })}
        />
        <input
          type="number"
          className={inputClass}
          placeholder="Máx."
          value={filtro.max}
          onChange={(e) => onChange({ ...filtro, max: e.target.value })}
        />
      </div>
    );
  }

  if (tipo === "data" && filtro.tipo === "data") {
    return (
      <div className="flex flex-col gap-1">
        <input
          type="date"
          className={inputClass}
          value={filtro.de}
          onChange={(e) => onChange({ ...filtro, de: e.target.value })}
        />
        <input
          type="date"
          className={inputClass}
          value={filtro.ate}
          onChange={(e) => onChange({ ...filtro, ate: e.target.value })}
        />
      </div>
    );
  }

  if (tipo === "opcoes" && filtro.tipo === "opcoes") {
    return (
      <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
        {opcoes.length === 0 && (
          <p className="text-on-surface-variant text-xs">Sem opções.</p>
        )}
        {opcoes.map((op) => {
          const marcado = filtro.selecionadas.includes(op);
          return (
            <label
              key={op}
              className="text-on-surface flex cursor-pointer items-center gap-1.5 text-xs whitespace-nowrap"
            >
              <input
                type="checkbox"
                checked={marcado}
                onChange={(e) =>
                  onChange({
                    tipo: "opcoes",
                    selecionadas: e.target.checked
                      ? [...filtro.selecionadas, op]
                      : filtro.selecionadas.filter((s) => s !== op),
                  })
                }
              />
              {op}
            </label>
          );
        })}
      </div>
    );
  }

  return null;
}
