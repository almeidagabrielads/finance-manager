import { useState } from "react";
import { Select } from "@/app/components/Select";
import { corPessoa } from "@/app/components/PessoaBadge";
import {
  centavosParaReais,
  formatarMoeda,
  reaisParaCentavos,
} from "@/lib/domain/formatacao";
import { formatarMesAno, mesParaInputMonth } from "@/lib/domain/receitas";
import {
  IconeCheck,
  IconeLapis,
  IconeLixeira,
  IconeX,
  infoSubtipo,
} from "./Icones";
import {
  SUBTIPOS_RECEITA_UI,
  type Pessoa,
  type Receita,
  type ReceitaInput,
  type SubtipoReceita,
} from "./types";

type Props = {
  receita: Receita;
  pessoas: Pessoa[];
  nomePessoa: (id: string) => string;
  onAtualizar: (
    id: string,
    input: ReceitaInput,
  ) => Promise<boolean | undefined>;
  onRemover: (receita: Receita) => Promise<void>;
};

export function LinhaReceita({
  receita,
  pessoas,
  nomePessoa,
  onAtualizar,
  onRemover,
}: Props) {
  const [editando, setEditando] = useState(false);
  const [pessoaId, setPessoaId] = useState(receita.pessoaId);
  const [subtipo, setSubtipo] = useState<SubtipoReceita>(receita.subtipo);
  const [descricao, setDescricao] = useState(receita.descricao ?? "");
  const [valor, setValor] = useState(centavosParaReais(receita.valorCentavos));
  const [mes, setMes] = useState(mesParaInputMonth(receita.mes));
  const [erroDescricao, setErroDescricao] = useState(false);

  async function salvar() {
    if (subtipo === "OUTROS" && descricao.trim() === "") {
      setErroDescricao(true);
      return;
    }
    setErroDescricao(false);
    const sucesso = await onAtualizar(receita.id, {
      pessoaId,
      subtipo,
      descricao: descricao.trim() === "" ? null : descricao,
      valorCentavos: reaisParaCentavos(valor),
      mes: `${mes}-01`,
    });
    if (sucesso) setEditando(false);
  }

  function cancelar() {
    setPessoaId(receita.pessoaId);
    setSubtipo(receita.subtipo);
    setDescricao(receita.descricao ?? "");
    setValor(centavosParaReais(receita.valorCentavos));
    setMes(mesParaInputMonth(receita.mes));
    setErroDescricao(false);
    setEditando(false);
  }

  const inputClass =
    "rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1";

  if (editando) {
    return (
      <tr className="border-outline-variant/60 bg-surface-container-low border-b">
        <td colSpan={6} className="p-sm">
          <div className="gap-sm flex flex-wrap items-end">
            <div className="flex flex-col gap-1">
              <label className="text-on-surface-variant text-xs font-semibold">
                Responsável
              </label>
              <Select
                value={pessoaId}
                onChange={setPessoaId}
                options={pessoas.map((p) => ({ value: p.id, label: p.nome }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-on-surface-variant text-xs font-semibold">
                Tipo / Categoria
              </label>
              <Select
                value={subtipo}
                onChange={(v) => setSubtipo(v as SubtipoReceita)}
                options={SUBTIPOS_RECEITA_UI.map((s) => ({
                  value: s.value,
                  label: s.label,
                }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-on-surface-variant text-xs font-semibold">
                Descrição
              </label>
              <input
                className={`${inputClass} ${erroDescricao ? "border-danger" : ""}`}
                value={descricao}
                onChange={(e) => {
                  setDescricao(e.target.value);
                  if (erroDescricao) setErroDescricao(false);
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-on-surface-variant text-xs font-semibold">
                Mês
              </label>
              <input
                type="month"
                className={inputClass}
                value={mes}
                onChange={(e) => setMes(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-on-surface-variant text-xs font-semibold">
                Valor
              </label>
              <input
                type="number"
                step="0.01"
                className={`w-28 text-right ${inputClass}`}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button
                className="text-success hover:bg-success/15 rounded-full p-1.5 transition-colors"
                onClick={salvar}
                title="Salvar"
                aria-label="Salvar"
              >
                <IconeCheck />
              </button>
              <button
                className="text-on-surface-variant hover:bg-surface-container-low rounded-full p-1.5 transition-colors"
                onClick={cancelar}
                title="Cancelar"
                aria-label="Cancelar"
              >
                <IconeX />
              </button>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  const { label: labelCategoria, Icone: IconeCategoria } = infoSubtipo(
    receita.subtipo,
  );

  return (
    <tr className="border-outline-variant/60 hover:bg-surface-container-low border-b">
      <td className="p-md">
        <div className="text-on-surface flex items-center gap-2 font-medium">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${corPessoa(receita.pessoaId)}`}
          >
            {nomePessoa(receita.pessoaId).charAt(0).toUpperCase()}
          </span>
          {nomePessoa(receita.pessoaId)}
        </div>
      </td>
      <td className="p-md">
        <div className="text-on-surface-variant flex items-center gap-1.5">
          <IconeCategoria className="text-on-surface h-4 w-4" />
          <span className="text-on-surface">{labelCategoria}</span>
        </div>
      </td>
      <td className="p-md text-on-surface-variant">
        {receita.descricao ?? "—"}
      </td>
      <td className="p-md text-on-surface-variant whitespace-nowrap">
        {formatarMesAno(mesParaInputMonth(receita.mes))}
      </td>
      <td className="data-tabular p-md text-right font-medium">
        {formatarMoeda(receita.valorCentavos)}
      </td>
      <td className="p-md">
        <div className="flex justify-end gap-2">
          <button
            className="text-primary hover:bg-primary/10 rounded-full p-1.5 transition-colors"
            onClick={() => setEditando(true)}
            title="Editar"
            aria-label="Editar"
          >
            <IconeLapis />
          </button>
          <button
            className="text-danger hover:bg-danger-container rounded-full p-1.5 transition-colors"
            onClick={() => onRemover(receita)}
            title="Remover"
            aria-label="Remover"
          >
            <IconeLixeira />
          </button>
        </div>
      </td>
    </tr>
  );
}
