"use client";

import { useEffect, useState } from "react";

const TIPOS_BANCO = [
  { value: "CARTAO_CREDITO", label: "Cartão de crédito" },
  { value: "CONTA_CORRENTE", label: "Conta corrente" },
  { value: "CORRETORA", label: "Corretora" },
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "OUTRO", label: "Outro" },
] as const;

type TipoBanco = (typeof TIPOS_BANCO)[number]["value"];

function labelTipo(tipo: string): string {
  return TIPOS_BANCO.find((t) => t.value === tipo)?.label ?? tipo;
}

type Banco = {
  id: string;
  nome: string;
  tipo: TipoBanco;
  ativo: boolean;
};

async function parseErro(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  if (typeof body?.error === "string") return body.error;
  return "Não foi possível completar a operação.";
}

export function BancosClient() {
  const [bancos, setBancos] = useState<Banco[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState<TipoBanco>("CARTAO_CREDITO");
  const [naoAutenticado, setNaoAutenticado] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  function carregar() {
    setReloadToken((t) => t + 1);
  }

  useEffect(() => {
    let cancelado = false;

    fetch(`/api/bancos${mostrarInativos ? "?incluirInativos=true" : ""}`)
      .then(async (response) => {
        if (cancelado) return;
        if (response.status === 401) {
          setNaoAutenticado(true);
          return;
        }
        setNaoAutenticado(false);
        setBancos(await response.json());
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar os bancos.");
      });

    return () => {
      cancelado = true;
    };
  }, [mostrarInativos, reloadToken]);

  async function criarBanco(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const response = await fetch("/api/bancos", {
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

  async function atualizarBanco(
    id: string,
    input: { nome?: string; tipo?: TipoBanco },
  ) {
    setErro(null);
    const response = await fetch(`/api/bancos/${id}`, {
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

  async function alternarAtivo(banco: Banco) {
    setErro(null);
    const acao = banco.ativo ? "inativar" : "reativar";
    const response = await fetch(`/api/bancos/${banco.id}/${acao}`, {
      method: "POST",
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
        Não autenticado — faça login para gerenciar bancos.
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
        onSubmit={criarBanco}
        className="flex flex-wrap items-end gap-2 rounded border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="novo-nome">
            Novo banco
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
            onChange={(e) => setNovoTipo(e.target.value as TipoBanco)}
          >
            {TIPOS_BANCO.map((t) => (
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

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={mostrarInativos}
          onChange={(e) => setMostrarInativos(e.target.checked)}
        />
        Mostrar bancos inativos
      </label>

      <ul className="flex flex-col gap-2">
        {bancos?.map((banco) => (
          <BancoItem
            key={banco.id}
            banco={banco}
            onAtualizar={atualizarBanco}
            onAlternarAtivo={alternarAtivo}
          />
        ))}
      </ul>

      {bancos?.length === 0 && (
        <p className="text-sm text-zinc-500">Nenhum banco encontrado.</p>
      )}
    </div>
  );
}

function BancoItem({
  banco,
  onAtualizar,
  onAlternarAtivo,
}: {
  banco: Banco;
  onAtualizar: (
    id: string,
    input: { nome?: string; tipo?: TipoBanco },
  ) => Promise<void>;
  onAlternarAtivo: (banco: Banco) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(banco.nome);
  const [tipo, setTipo] = useState<TipoBanco>(banco.tipo);

  async function salvar() {
    await onAtualizar(banco.id, { nome, tipo });
    setEditando(false);
  }

  return (
    <li
      className={`flex flex-wrap items-center gap-2 rounded border border-zinc-200 p-3 dark:border-zinc-800 ${
        banco.ativo ? "" : "opacity-60"
      }`}
    >
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
            onChange={(e) => setTipo(e.target.value as TipoBanco)}
          >
            {TIPOS_BANCO.map((t) => (
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
          <h2 className="text-base font-semibold">{banco.nome}</h2>
          <span className="text-sm text-zinc-500">{labelTipo(banco.tipo)}</span>
          {!banco.ativo && (
            <span className="rounded bg-zinc-200 px-2 py-0.5 text-xs dark:bg-zinc-800">
              inativo
            </span>
          )}
          <button
            className="text-sm font-medium text-blue-700"
            onClick={() => setEditando(true)}
          >
            Editar
          </button>
          <button
            className="text-sm font-medium text-amber-700"
            onClick={() => onAlternarAtivo(banco)}
          >
            {banco.ativo ? "Inativar" : "Reativar"}
          </button>
        </>
      )}
    </li>
  );
}
