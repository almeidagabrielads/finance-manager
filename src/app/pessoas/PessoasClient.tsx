"use client";

import { useEffect, useState } from "react";

const TIPOS_PESSOA = [
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "CASAL", label: "Casal" },
  { value: "FAMILIA", label: "Família" },
  { value: "OUTRO", label: "Outro" },
] as const;

type TipoPessoa = (typeof TIPOS_PESSOA)[number]["value"];

function labelTipo(tipo: string): string {
  return TIPOS_PESSOA.find((t) => t.value === tipo)?.label ?? tipo;
}

type Pessoa = {
  id: string;
  nome: string;
  tipo: TipoPessoa;
};

async function parseErro(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  if (typeof body?.error === "string") return body.error;
  return "Não foi possível completar a operação.";
}

export function PessoasClient() {
  const [pessoas, setPessoas] = useState<Pessoa[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState<TipoPessoa>("INDIVIDUAL");
  const [naoAutenticado, setNaoAutenticado] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

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
        setNaoAutenticado(false);
        setPessoas(await response.json());
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar as pessoas.");
      });

    return () => {
      cancelado = true;
    };
  }, [reloadToken]);

  async function criarPessoa(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const response = await fetch("/api/pessoas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: novoNome, tipo: novoTipo }),
    });
    if (!response.ok) {
      setErro(await parseErro(response));
      return;
    }
    setNovoNome("");
    carregar();
  }

  async function atualizarPessoa(
    id: string,
    input: { nome?: string; tipo?: TipoPessoa },
  ) {
    setErro(null);
    const response = await fetch(`/api/pessoas/${id}`, {
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

  async function removerPessoa(pessoa: Pessoa) {
    if (!confirm(`Remover "${pessoa.nome}"? Essa ação não pode ser desfeita.`)) {
      return;
    }
    setErro(null);
    const response = await fetch(`/api/pessoas/${pessoa.id}`, {
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
      <p className="text-zinc-600 dark:text-zinc-400">
        Não autenticado — faça login para gerenciar pessoas.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {erro && (
        <p className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      <form
        onSubmit={criarPessoa}
        className="flex flex-wrap items-end gap-2 rounded border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="novo-nome">
            Nova pessoa
          </label>
          <input
            id="novo-nome"
            className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="novo-tipo">
            Tipo
          </label>
          <select
            id="novo-tipo"
            className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            value={novoTipo}
            onChange={(e) => setNovoTipo(e.target.value as TipoPessoa)}
          >
            {TIPOS_PESSOA.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Adicionar
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {pessoas?.map((pessoa) => (
          <PessoaItem
            key={pessoa.id}
            pessoa={pessoa}
            onAtualizar={atualizarPessoa}
            onRemover={removerPessoa}
          />
        ))}
      </ul>

      {pessoas?.length === 0 && (
        <p className="text-sm text-zinc-500">Nenhuma pessoa cadastrada.</p>
      )}
    </div>
  );
}

function PessoaItem({
  pessoa,
  onAtualizar,
  onRemover,
}: {
  pessoa: Pessoa;
  onAtualizar: (
    id: string,
    input: { nome?: string; tipo?: TipoPessoa },
  ) => Promise<void>;
  onRemover: (pessoa: Pessoa) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(pessoa.nome);
  const [tipo, setTipo] = useState<TipoPessoa>(pessoa.tipo);

  async function salvar() {
    await onAtualizar(pessoa.id, { nome, tipo });
    setEditando(false);
  }

  return (
    <li className="flex flex-wrap items-center gap-2 rounded border border-zinc-200 p-3 dark:border-zinc-800">
      {editando ? (
        <>
          <input
            className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <select
            className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoPessoa)}
          >
            {TIPOS_PESSOA.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            className="text-sm font-medium text-emerald-700"
            onClick={salvar}
          >
            Salvar
          </button>
          <button
            className="text-sm text-zinc-500"
            onClick={() => setEditando(false)}
          >
            Cancelar
          </button>
        </>
      ) : (
        <>
          <h2 className="text-base font-semibold">{pessoa.nome}</h2>
          <span className="text-sm text-zinc-500">{labelTipo(pessoa.tipo)}</span>
          <button
            className="text-sm font-medium text-blue-700"
            onClick={() => setEditando(true)}
          >
            Editar
          </button>
          <button
            className="text-sm font-medium text-red-700"
            onClick={() => onRemover(pessoa)}
          >
            Remover
          </button>
        </>
      )}
    </li>
  );
}
