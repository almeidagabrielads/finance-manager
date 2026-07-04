"use client";

import { useEffect, useState } from "react";

type Subcategoria = {
  id: string;
  nome: string;
  categoriaId: string;
  ativo: boolean;
};

type Categoria = {
  id: string;
  nome: string;
  percentualOrcamento: string | null;
  ativo: boolean;
  subcategorias: Subcategoria[];
};

async function parseErro(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  if (typeof body?.error === "string") return body.error;
  return "Não foi possível completar a operação.";
}

export function CategoriasClient() {
  const [categorias, setCategorias] = useState<Categoria[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarInativas, setMostrarInativas] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoPercentual, setNovoPercentual] = useState("");
  const [naoAutenticado, setNaoAutenticado] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  function carregar() {
    setReloadToken((t) => t + 1);
  }

  useEffect(() => {
    let cancelado = false;

    fetch(`/api/categorias${mostrarInativas ? "?incluirInativas=true" : ""}`)
      .then(async (response) => {
        if (cancelado) return;
        if (response.status === 401) {
          setNaoAutenticado(true);
          return;
        }
        setNaoAutenticado(false);
        setCategorias(await response.json());
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar as categorias.");
      });

    return () => {
      cancelado = true;
    };
  }, [mostrarInativas, reloadToken]);

  async function criarCategoria(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const response = await fetch("/api/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: novoNome,
        percentualOrcamento: novoPercentual ? Number(novoPercentual) : null,
      }),
    });
    if (!response.ok) {
      setErro(await parseErro(response));
      return;
    }
    setNovoNome("");
    setNovoPercentual("");
    carregar();
  }

  async function atualizarCategoria(
    id: string,
    input: { nome?: string; percentualOrcamento?: number | null },
  ) {
    setErro(null);
    const response = await fetch(`/api/categorias/${id}`, {
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

  async function alternarAtivo(categoria: Categoria) {
    setErro(null);
    const acao = categoria.ativo ? "inativar" : "reativar";
    const response = await fetch(`/api/categorias/${categoria.id}/${acao}`, {
      method: "POST",
    });
    if (!response.ok) {
      setErro(await parseErro(response));
      return;
    }
    carregar();
  }

  async function criarSubcategoria(categoriaId: string, nome: string) {
    setErro(null);
    const response = await fetch("/api/subcategorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, categoriaId }),
    });
    if (!response.ok) {
      setErro(await parseErro(response));
      return;
    }
    carregar();
  }

  async function atualizarSubcategoria(id: string, nome: string) {
    setErro(null);
    const response = await fetch(`/api/subcategorias/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });
    if (!response.ok) {
      setErro(await parseErro(response));
      return;
    }
    carregar();
  }

  async function alternarAtivoSubcategoria(subcategoria: Subcategoria) {
    setErro(null);
    const acao = subcategoria.ativo ? "inativar" : "reativar";
    const response = await fetch(
      `/api/subcategorias/${subcategoria.id}/${acao}`,
      { method: "POST" },
    );
    if (!response.ok) {
      setErro(await parseErro(response));
      return;
    }
    carregar();
  }

  if (naoAutenticado) {
    return (
      <p className="text-on-surface-variant">
        Não autenticado — faça login para gerenciar categorias.
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
        onSubmit={criarCategoria}
        className="flex flex-wrap items-end gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-lg"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant" htmlFor="novo-nome">
            Nova categoria
          </label>
          <input
            id="novo-nome"
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant" htmlFor="novo-percentual">
            % orçamento
          </label>
          <input
            id="novo-percentual"
            type="number"
            min={0}
            max={100}
            step="0.01"
            className="w-24 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1"
            value={novoPercentual}
            onChange={(e) => setNovoPercentual(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-primary px-md py-1.5 text-xs font-semibold text-on-primary hover:opacity-90"
        >
          Adicionar
        </button>
      </form>

      <label className="flex items-center gap-2 text-sm text-on-surface-variant">
        <input
          type="checkbox"
          checked={mostrarInativas}
          onChange={(e) => setMostrarInativas(e.target.checked)}
        />
        Mostrar categorias inativas
      </label>

      <ul className="flex flex-col gap-4">
        {categorias?.map((categoria) => (
          <CategoriaItem
            key={categoria.id}
            categoria={categoria}
            onAtualizar={atualizarCategoria}
            onAlternarAtivo={alternarAtivo}
            onCriarSubcategoria={criarSubcategoria}
            onAtualizarSubcategoria={atualizarSubcategoria}
            onAlternarAtivoSubcategoria={alternarAtivoSubcategoria}
          />
        ))}
      </ul>

      {categorias?.length === 0 && (
        <p className="text-sm text-on-surface-variant">Nenhuma categoria encontrada.</p>
      )}
    </div>
  );
}

function CategoriaItem({
  categoria,
  onAtualizar,
  onAlternarAtivo,
  onCriarSubcategoria,
  onAtualizarSubcategoria,
  onAlternarAtivoSubcategoria,
}: {
  categoria: Categoria;
  onAtualizar: (
    id: string,
    input: { nome?: string; percentualOrcamento?: number | null },
  ) => Promise<void>;
  onAlternarAtivo: (categoria: Categoria) => Promise<void>;
  onCriarSubcategoria: (categoriaId: string, nome: string) => Promise<void>;
  onAtualizarSubcategoria: (id: string, nome: string) => Promise<void>;
  onAlternarAtivoSubcategoria: (subcategoria: Subcategoria) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(categoria.nome);
  const [percentual, setPercentual] = useState(
    categoria.percentualOrcamento ?? "",
  );
  const [novaSubcategoria, setNovaSubcategoria] = useState("");

  async function salvar() {
    await onAtualizar(categoria.id, {
      nome,
      percentualOrcamento: percentual === "" ? null : Number(percentual),
    });
    setEditando(false);
  }

  return (
    <li
      className={`rounded-xl border border-outline-variant bg-surface-container-lowest p-lg ${
        categoria.ativo ? "" : "opacity-60"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {editando ? (
          <>
            <input
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              className="w-24 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1"
              value={percentual}
              onChange={(e) => setPercentual(e.target.value)}
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
            <h2 className="text-lg font-semibold text-on-surface">{categoria.nome}</h2>
            <span className="text-sm text-on-surface-variant">
              {categoria.percentualOrcamento
                ? `${Number(categoria.percentualOrcamento)}% do orçamento`
                : "sem % definido"}
            </span>
            {!categoria.ativo && (
              <span className="rounded-full bg-surface-container px-2 py-0.5 text-xs text-on-surface-variant">
                inativa
              </span>
            )}
            <button
              className="text-sm font-medium text-primary"
              onClick={() => setEditando(true)}
            >
              Editar
            </button>
            <button
              className="text-sm font-medium text-tertiary-container"
              onClick={() => onAlternarAtivo(categoria)}
            >
              {categoria.ativo ? "Inativar" : "Reativar"}
            </button>
          </>
        )}
      </div>

      <ul className="mt-3 flex flex-col gap-1 pl-4">
        {categoria.subcategorias.map((subcategoria) => (
          <SubcategoriaItem
            key={subcategoria.id}
            subcategoria={subcategoria}
            onAtualizar={onAtualizarSubcategoria}
            onAlternarAtivo={onAlternarAtivoSubcategoria}
          />
        ))}
      </ul>

      <form
        className="mt-2 flex items-center gap-2 pl-4"
        onSubmit={async (e) => {
          e.preventDefault();
          await onCriarSubcategoria(categoria.id, novaSubcategoria);
          setNovaSubcategoria("");
        }}
      >
        <input
          className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1 text-sm"
          placeholder="Nova subcategoria"
          value={novaSubcategoria}
          onChange={(e) => setNovaSubcategoria(e.target.value)}
          required
        />
        <button type="submit" className="text-sm font-medium text-on-surface-variant">
          Adicionar subcategoria
        </button>
      </form>
    </li>
  );
}

function SubcategoriaItem({
  subcategoria,
  onAtualizar,
  onAlternarAtivo,
}: {
  subcategoria: Subcategoria;
  onAtualizar: (id: string, nome: string) => Promise<void>;
  onAlternarAtivo: (subcategoria: Subcategoria) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(subcategoria.nome);

  return (
    <li
      className={`flex items-center gap-2 text-sm ${
        subcategoria.ativo ? "" : "opacity-60"
      }`}
    >
      {editando ? (
        <>
          <input
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-0.5"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <button
            className="font-semibold text-success"
            onClick={async () => {
              await onAtualizar(subcategoria.id, nome);
              setEditando(false);
            }}
          >
            Salvar
          </button>
          <button className="text-on-surface-variant" onClick={() => setEditando(false)}>
            Cancelar
          </button>
        </>
      ) : (
        <>
          <span className="text-on-surface">{subcategoria.nome}</span>
          {!subcategoria.ativo && (
            <span className="rounded-full bg-surface-container px-1.5 py-0.5 text-xs text-on-surface-variant">
              inativa
            </span>
          )}
          <button
            className="font-medium text-primary"
            onClick={() => setEditando(true)}
          >
            Editar
          </button>
          <button
            className="font-medium text-tertiary-container"
            onClick={() => onAlternarAtivo(subcategoria)}
          >
            {subcategoria.ativo ? "Inativar" : "Reativar"}
          </button>
        </>
      )}
    </li>
  );
}
