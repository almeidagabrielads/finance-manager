"use client";

import { useEffect, useMemo, useState } from "react";

const SUBTIPOS_RECEITA = [
  { value: "SALARIO", label: "Salário" },
  { value: "VOUCHER", label: "Voucher" },
  { value: "OUTROS", label: "Outros" },
] as const;

type SubtipoReceita = (typeof SUBTIPOS_RECEITA)[number]["value"];

function labelSubtipo(subtipo: string): string {
  return SUBTIPOS_RECEITA.find((s) => s.value === subtipo)?.label ?? subtipo;
}

type Pessoa = { id: string; nome: string };

type Receita = {
  id: string;
  pessoaId: string;
  subtipo: SubtipoReceita;
  valorCentavos: number;
  mes: string;
};

async function parseErro(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  if (typeof body?.error === "string") return body.error;
  return "Não foi possível completar a operação.";
}

function centavosParaReais(valor: number): string {
  return (valor / 100).toFixed(2);
}

function reaisParaCentavos(valor: string): number {
  const n = Number(valor.replace(",", "."));
  return Math.round(n * 100);
}

// "2026-07-01T00:00:00.000Z" -> "2026-07"
function mesParaInputMonth(mes: string): string {
  return mes.slice(0, 7);
}

export function ReceitasClient() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [receitas, setReceitas] = useState<Receita[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [naoAutenticado, setNaoAutenticado] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const [novaPessoaId, setNovaPessoaId] = useState("");
  const [novoSubtipo, setNovoSubtipo] = useState<SubtipoReceita>("SALARIO");
  const [novoValor, setNovoValor] = useState("");
  const [novoMes, setNovoMes] = useState("");

  function carregar() {
    setReloadToken((t) => t + 1);
  }

  useEffect(() => {
    let cancelado = false;
    fetch("/api/pessoas")
      .then(async (response) => {
        if (cancelado) return;
        if (response.status === 401) {
          setNaoAutenticado(true);
          return;
        }
        const lista: Pessoa[] = await response.json();
        setPessoas(lista);
        setNovaPessoaId((atual) => atual || (lista[0]?.id ?? ""));
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar as pessoas.");
      });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    fetch("/api/receitas")
      .then(async (response) => {
        if (cancelado) return;
        if (response.status === 401) {
          setNaoAutenticado(true);
          return;
        }
        setNaoAutenticado(false);
        setReceitas(await response.json());
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar as receitas.");
      });
    return () => {
      cancelado = true;
    };
  }, [reloadToken]);

  const nomePessoa = useMemo(() => {
    const mapa = new Map(pessoas.map((p) => [p.id, p.nome]));
    return (id: string) => mapa.get(id) ?? "—";
  }, [pessoas]);

  async function criarReceita(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const response = await fetch("/api/receitas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pessoaId: novaPessoaId,
        subtipo: novoSubtipo,
        valorCentavos: reaisParaCentavos(novoValor),
        mes: `${novoMes}-01`,
      }),
    });
    if (!response.ok) {
      setErro(await parseErro(response));
      return;
    }
    setNovoValor("");
    carregar();
  }

  async function atualizarReceita(
    id: string,
    input: Partial<{
      pessoaId: string;
      subtipo: SubtipoReceita;
      valorCentavos: number;
      mes: string;
    }>,
  ) {
    setErro(null);
    const response = await fetch(`/api/receitas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      setErro(await parseErro(response));
      return;
    }
    carregar();
  }

  async function removerReceita(receita: Receita) {
    if (!confirm("Remover essa receita? Essa ação não pode ser desfeita.")) {
      return;
    }
    setErro(null);
    const response = await fetch(`/api/receitas/${receita.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setErro(await parseErro(response));
      return;
    }
    carregar();
  }

  if (naoAutenticado) {
    return (
      <p className="text-on-surface-variant">
        Não autenticado — faça login para gerenciar receitas.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {erro && (
        <p className="rounded-lg border border-danger/30 bg-danger-container p-sm text-sm text-on-danger-container">
          {erro}
        </p>
      )}

      <form
        onSubmit={criarReceita}
        className="flex flex-wrap items-end gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-lg"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant" htmlFor="nova-pessoa">
            Pessoa
          </label>
          <select
            id="nova-pessoa"
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1"
            value={novaPessoaId}
            onChange={(e) => setNovaPessoaId(e.target.value)}
            required
          >
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant" htmlFor="novo-subtipo">
            Subtipo
          </label>
          <select
            id="novo-subtipo"
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1"
            value={novoSubtipo}
            onChange={(e) => setNovoSubtipo(e.target.value as SubtipoReceita)}
          >
            {SUBTIPOS_RECEITA.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant" htmlFor="novo-valor">
            Valor (R$)
          </label>
          <input
            id="novo-valor"
            type="number"
            step="0.01"
            className="w-32 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1"
            value={novoValor}
            onChange={(e) => setNovoValor(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant" htmlFor="novo-mes">
            Mês
          </label>
          <input
            id="novo-mes"
            type="month"
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1"
            value={novoMes}
            onChange={(e) => setNovoMes(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-primary px-md py-1.5 text-xs font-semibold text-on-primary hover:opacity-90"
        >
          Adicionar
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {receitas?.map((receita) => (
          <ReceitaItem
            key={receita.id}
            receita={receita}
            pessoas={pessoas}
            nomePessoa={nomePessoa}
            onAtualizar={atualizarReceita}
            onRemover={removerReceita}
          />
        ))}
      </ul>

      {receitas?.length === 0 && (
        <p className="text-sm text-on-surface-variant">Nenhuma receita cadastrada.</p>
      )}
    </div>
  );
}

function ReceitaItem({
  receita,
  pessoas,
  nomePessoa,
  onAtualizar,
  onRemover,
}: {
  receita: Receita;
  pessoas: Pessoa[];
  nomePessoa: (id: string) => string;
  onAtualizar: (
    id: string,
    input: Partial<{
      pessoaId: string;
      subtipo: SubtipoReceita;
      valorCentavos: number;
      mes: string;
    }>,
  ) => Promise<void>;
  onRemover: (receita: Receita) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [pessoaId, setPessoaId] = useState(receita.pessoaId);
  const [subtipo, setSubtipo] = useState<SubtipoReceita>(receita.subtipo);
  const [valor, setValor] = useState(centavosParaReais(receita.valorCentavos));
  const [mes, setMes] = useState(mesParaInputMonth(receita.mes));

  async function salvar() {
    await onAtualizar(receita.id, {
      pessoaId,
      subtipo,
      valorCentavos: reaisParaCentavos(valor),
      mes: `${mes}-01`,
    });
    setEditando(false);
  }

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-sm">
      {editando ? (
        <>
          <select
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1"
            value={pessoaId}
            onChange={(e) => setPessoaId(e.target.value)}
          >
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1"
            value={subtipo}
            onChange={(e) => setSubtipo(e.target.value as SubtipoReceita)}
          >
            {SUBTIPOS_RECEITA.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            className="w-28 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
          <input
            type="month"
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
          />
          <button
            className="text-sm font-semibold text-success"
            onClick={salvar}
          >
            Salvar
          </button>
          <button
            className="text-sm text-on-surface-variant"
            onClick={() => setEditando(false)}
          >
            Cancelar
          </button>
        </>
      ) : (
        <>
          <span className="font-medium text-on-surface">{nomePessoa(receita.pessoaId)}</span>
          <span className="text-sm text-on-surface-variant">
            {labelSubtipo(receita.subtipo)}
          </span>
          <span className="text-sm text-on-surface-variant">
            {mesParaInputMonth(receita.mes)}
          </span>
          <span className="data-tabular font-medium text-on-surface">
            R$ {centavosParaReais(receita.valorCentavos)}
          </span>
          <button
            className="text-sm font-medium text-primary"
            onClick={() => setEditando(true)}
          >
            Editar
          </button>
          <button
            className="text-sm font-medium text-danger"
            onClick={() => onRemover(receita)}
          >
            Remover
          </button>
        </>
      )}
    </li>
  );
}
