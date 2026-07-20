import type { FormEvent } from "react";
import { Select } from "@/app/components/Select";
import { IconePlusCirculo, IconeSalvar, IconeX } from "./Icones";
import {
  SUBTIPOS_RECEITA_UI,
  inputClass,
  type Pessoa,
  type SubtipoReceita,
} from "./types";

type Props = {
  pessoas: Pessoa[];
  pessoaId: string;
  onPessoaIdChange: (pessoaId: string) => void;
  subtipo: SubtipoReceita;
  onSubtipoChange: (subtipo: SubtipoReceita) => void;
  descricao: string;
  onDescricaoChange: (descricao: string) => void;
  valor: string;
  onValorChange: (valor: string) => void;
  mes: string;
  onMesChange: (mes: string) => void;
  onFechar: () => void;
  onSubmit: (e: FormEvent) => void;
};

export function NovoReceitaModal({
  pessoas,
  pessoaId,
  onPessoaIdChange,
  subtipo,
  onSubtipoChange,
  descricao,
  onDescricaoChange,
  valor,
  onValorChange,
  mes,
  onMesChange,
  onFechar,
  onSubmit,
}: Props) {
  return (
    <div className="p-lg bg-on-surface/40 fixed inset-0 z-[100] flex items-center justify-center">
      <div className="gap-md border-outline-variant bg-surface-container-lowest p-lg flex w-full max-w-[36rem] flex-col rounded-2xl border shadow-lg">
        <div className="border-outline-variant pb-md text-on-surface flex items-center justify-between gap-2 border-b">
          <div className="flex items-center gap-2">
            <IconePlusCirculo />
            <h2 className="text-base font-bold">Registrar Nova Entrada</h2>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="text-on-surface-variant hover:bg-surface-container-low rounded-full p-1.5 transition-colors"
          >
            <IconeX />
          </button>
        </div>
        <form onSubmit={onSubmit} className="gap-md flex flex-col">
          <div className="gap-md grid grid-cols-2">
            <div className="flex flex-col gap-1">
              <label
                className="text-on-surface-variant text-xs font-semibold"
                htmlFor="nova-pessoa"
              >
                Responsável
              </label>
              <Select
                id="nova-pessoa"
                value={pessoaId}
                onChange={onPessoaIdChange}
                options={pessoas.map((p) => ({ value: p.id, label: p.nome }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                className="text-on-surface-variant text-xs font-semibold"
                htmlFor="novo-mes"
              >
                Referência
              </label>
              <input
                id="novo-mes"
                type="month"
                className={inputClass}
                value={mes}
                onChange={(e) => onMesChange(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                className="text-on-surface-variant text-xs font-semibold"
                htmlFor="novo-subtipo"
              >
                Tipo / Categoria
              </label>
              <Select
                id="novo-subtipo"
                value={subtipo}
                onChange={(v) => onSubtipoChange(v as SubtipoReceita)}
                options={SUBTIPOS_RECEITA_UI.map((s) => ({
                  value: s.value,
                  label: s.label,
                }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                className="text-on-surface-variant text-xs font-semibold"
                htmlFor="novo-valor"
              >
                Valor (R$)
              </label>
              <input
                id="novo-valor"
                type="number"
                step="0.01"
                placeholder="0,00"
                className={`text-right ${inputClass}`}
                value={valor}
                onChange={(e) => onValorChange(e.target.value)}
                required
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <label
                className="text-on-surface-variant text-xs font-semibold"
                htmlFor="nova-descricao"
              >
                Descrição (Opcional)
              </label>
              <input
                id="nova-descricao"
                placeholder="Ex: Dividendos..."
                className={inputClass}
                value={descricao}
                onChange={(e) => onDescricaoChange(e.target.value)}
                required={subtipo === "OUTROS"}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onFechar}
              className="border-outline-variant px-md text-on-surface hover:bg-surface-container-low rounded-full border py-2 text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-primary px-md text-on-primary flex items-center gap-2 rounded-full py-2 text-xs font-semibold hover:opacity-90"
            >
              <IconeSalvar /> Salvar Entrada
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
