"use client";

import { useEffect, useState } from "react";
import { corPessoa } from "../components/PessoaBadge";
import { Select } from "../components/Select";

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

function iniciais(nome: string): string {
  const primeira = nome.trim().split(/\s+/)[0] ?? "";
  return (primeira.length <= 3 ? primeira : primeira.slice(0, 2)).toUpperCase();
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

function IconeLapis() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function IconeCheck() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconeX() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

function IconeInativar() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <path d="M12 2v10" />
    </svg>
  );
}

function IconeReativar() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
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
      <p className="text-on-surface-variant">
        Não autenticado — faça login para gerenciar bancos.
      </p>
    );
  }

  return (
    <div className="gap-lg flex flex-col">
      {erro && (
        <p className="border-danger/30 bg-danger-container p-sm text-on-danger-container rounded-lg border text-sm">
          {erro}
        </p>
      )}

      <form
        onSubmit={criarBanco}
        className="gap-sm border-outline-variant bg-surface-container-lowest p-lg flex flex-wrap items-end rounded-xl border"
      >
        <div className="flex flex-col gap-1">
          <label
            className="text-on-surface-variant text-xs font-semibold"
            htmlFor="novo-nome"
          >
            Novo banco
          </label>
          <input
            id="novo-nome"
            className="border-outline-variant bg-surface-container-lowest rounded-lg border px-2 py-1"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            className="text-on-surface-variant text-xs font-semibold"
            htmlFor="novo-tipo"
          >
            Tipo
          </label>
          <Select
            id="novo-tipo"
            value={novoTipo}
            onChange={(v) => setNovoTipo(v as TipoBanco)}
            options={TIPOS_BANCO.map((t) => ({
              value: t.value,
              label: t.label,
            }))}
          />
        </div>
        <button
          type="submit"
          className="bg-primary px-md text-on-primary rounded-full py-1.5 text-xs font-semibold hover:opacity-90"
        >
          Adicionar
        </button>
      </form>

      <label className="text-on-surface-variant flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={mostrarInativos}
          onChange={(e) => setMostrarInativos(e.target.checked)}
        />
        Mostrar bancos inativos
      </label>

      <div className="gap-sm grid grid-cols-1 sm:grid-cols-2">
        {bancos?.map((banco) => (
          <BancoItem
            key={banco.id}
            banco={banco}
            onAtualizar={atualizarBanco}
            onAlternarAtivo={alternarAtivo}
          />
        ))}
      </div>

      {bancos?.length === 0 && (
        <p className="text-on-surface-variant text-sm">
          Nenhum banco encontrado.
        </p>
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

  function cancelar() {
    setNome(banco.nome);
    setTipo(banco.tipo);
    setEditando(false);
  }

  return (
    <div
      className={`border-outline-variant bg-surface-container-lowest p-lg flex flex-col gap-2 rounded-xl border ${
        banco.ativo ? "" : "opacity-60"
      }`}
    >
      {editando ? (
        <>
          <div className="flex items-center gap-2">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${corPessoa(banco.id)}`}
            >
              {iniciais(nome) || "?"}
            </span>
            <input
              className="border-outline-variant bg-surface-container-lowest min-w-0 flex-1 rounded-lg border px-2 py-1 text-sm"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Select
              value={tipo}
              onChange={(v) => setTipo(v as TipoBanco)}
              options={TIPOS_BANCO.map((t) => ({
                value: t.value,
                label: t.label,
              }))}
            />
            <div className="flex items-center gap-1">
              <button
                title="Salvar"
                aria-label="Salvar"
                onClick={salvar}
                className="text-success hover:bg-success/15 rounded-full p-1.5 transition-colors"
              >
                <IconeCheck />
              </button>
              <button
                title="Cancelar"
                aria-label="Cancelar"
                onClick={cancelar}
                className="text-on-surface-variant hover:bg-surface-container-low rounded-full p-1.5 transition-colors"
              >
                <IconeX />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${corPessoa(banco.id)}`}
            >
              {iniciais(banco.nome)}
            </span>
            <div>
              <h3 className="text-on-surface text-base font-semibold">
                {banco.nome}
              </h3>
              <span className="text-on-surface-variant text-xs font-semibold">
                {labelTipo(banco.tipo)}
                {!banco.ativo && " · Inativo"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              title="Editar"
              aria-label="Editar"
              onClick={() => setEditando(true)}
              className="text-primary hover:bg-primary/10 rounded-full p-1.5 transition-colors"
            >
              <IconeLapis />
            </button>
            <button
              title={banco.ativo ? "Inativar" : "Reativar"}
              aria-label={banco.ativo ? "Inativar" : "Reativar"}
              onClick={() => onAlternarAtivo(banco)}
              className={
                banco.ativo
                  ? "text-danger hover:bg-danger-container rounded-full p-1.5 transition-colors"
                  : "text-success hover:bg-success/15 rounded-full p-1.5 transition-colors"
              }
            >
              {banco.ativo ? <IconeInativar /> : <IconeReativar />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
