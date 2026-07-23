"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Folder, Pencil, Check, X, Power, RotateCcw, Plus } from "lucide-react";

type Subcategoria = {
  id: string;
  nome: string;
  categoriaId: string;
  ativo: boolean;
};

type Categoria = {
  id: string;
  nome: string;
  ativo: boolean;
  subcategorias: Subcategoria[];
};

async function parseErro(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  if (typeof body?.error === "string") return body.error;
  return "Não foi possível completar a operação.";
}

function IconePasta() {
  return <Folder className="h-5 w-5" />;
}

function IconeLapis() {
  return <Pencil className="h-4 w-4" />;
}

function IconeCheck() {
  return <Check className="h-4 w-4" />;
}

function IconeX() {
  return <X className="h-4 w-4" />;
}

function IconeInativar() {
  return <Power className="h-4 w-4" />;
}

function IconeReativar() {
  return <RotateCcw className="h-4 w-4" />;
}

function IconeMais() {
  return <Plus className="h-4 w-4" />;
}

export function CategoriasClient() {
  const [categorias, setCategorias] = useState<Categoria[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarInativas, setMostrarInativas] = useState(false);
  const [novoNome, setNovoNome] = useState("");
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

  async function criarCategoria(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const response = await fetch("/api/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: novoNome }),
    });
    if (!response.ok) {
      setErro(await parseErro(response));
      return;
    }
    setNovoNome("");
    carregar();
  }

  async function atualizarCategoria(id: string, nome: string) {
    setErro(null);
    const response = await fetch(`/api/categorias/${id}`, {
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

  async function atualizarSubcategoria(id: string, input: { nome?: string }) {
    setErro(null);
    const response = await fetch(`/api/subcategorias/${id}`, {
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
    <div className="gap-lg flex flex-col">
      {erro && (
        <p className="border-danger/30 bg-danger-container p-sm text-on-danger-container rounded-lg border text-sm">
          {erro}
        </p>
      )}

      <form
        onSubmit={criarCategoria}
        className="gap-sm border-outline-variant bg-surface-container-lowest p-lg flex flex-wrap items-end rounded-xl border"
      >
        <div className="flex flex-col gap-1">
          <label
            className="text-on-surface-variant text-xs font-semibold"
            htmlFor="novo-nome"
          >
            Nova categoria
          </label>
          <input
            id="novo-nome"
            className="border-outline-variant bg-surface-container-lowest rounded-lg border px-2 py-1"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            required
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
          checked={mostrarInativas}
          onChange={(e) => setMostrarInativas(e.target.checked)}
        />
        Mostrar categorias inativas
      </label>

      <div className="gap-md flex flex-col">
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
      </div>

      {categorias?.length === 0 && (
        <p className="text-on-surface-variant text-sm">
          Nenhuma categoria encontrada.
        </p>
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
  onAtualizar: (id: string, nome: string) => Promise<void>;
  onAlternarAtivo: (categoria: Categoria) => Promise<void>;
  onCriarSubcategoria: (categoriaId: string, nome: string) => Promise<void>;
  onAtualizarSubcategoria: (
    id: string,
    input: { nome?: string },
  ) => Promise<void>;
  onAlternarAtivoSubcategoria: (subcategoria: Subcategoria) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(categoria.nome);
  const [novaSubNome, setNovaSubNome] = useState("");

  async function salvar() {
    await onAtualizar(categoria.id, nome);
    setEditando(false);
  }

  function cancelar() {
    setNome(categoria.nome);
    setEditando(false);
  }

  return (
    <div
      className={`border-outline-variant overflow-hidden rounded-xl border ${
        categoria.ativo ? "" : "opacity-60"
      }`}
    >
      <div className="bg-primary-container/20 p-lg flex items-center justify-between gap-2">
        {editando ? (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="text-on-surface-variant">
                <IconePasta />
              </span>
              <input
                className="border-outline-variant bg-surface-container-lowest min-w-0 flex-1 rounded-lg border px-2 py-1 text-sm"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoFocus
              />
            </div>
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
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-on-surface-variant">
                <IconePasta />
              </span>
              <h3 className="text-on-surface text-base font-semibold">
                {categoria.nome}
              </h3>
              {!categoria.ativo && (
                <span className="bg-surface-container text-on-surface-variant rounded-full px-2 py-0.5 text-xs">
                  inativa
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
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
                  title={categoria.ativo ? "Inativar" : "Reativar"}
                  aria-label={categoria.ativo ? "Inativar" : "Reativar"}
                  onClick={() => onAlternarAtivo(categoria)}
                  className={
                    categoria.ativo
                      ? "text-danger hover:bg-danger-container rounded-full p-1.5 transition-colors"
                      : "text-success hover:bg-success/15 rounded-full p-1.5 transition-colors"
                  }
                >
                  {categoria.ativo ? <IconeInativar /> : <IconeReativar />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col">
        {categoria.subcategorias.map((subcategoria) => (
          <SubcategoriaItem
            key={subcategoria.id}
            subcategoria={subcategoria}
            onAtualizar={onAtualizarSubcategoria}
            onAlternarAtivo={onAlternarAtivoSubcategoria}
          />
        ))}
      </div>

      <form
        className="border-outline-variant p-lg flex flex-wrap items-center gap-2 border-t"
        onSubmit={async (e) => {
          e.preventDefault();
          await onCriarSubcategoria(categoria.id, novaSubNome);
          setNovaSubNome("");
        }}
      >
        <input
          className="border-outline-variant bg-surface-container-lowest min-w-0 flex-1 rounded-lg border px-2 py-1 text-sm"
          placeholder="Nova subcategoria"
          value={novaSubNome}
          onChange={(e) => setNovaSubNome(e.target.value)}
          required
        />
        <button
          type="submit"
          title="Adicionar subcategoria"
          aria-label="Adicionar subcategoria"
          className="text-primary hover:bg-primary/10 rounded-full p-1.5 transition-colors"
        >
          <IconeMais />
        </button>
      </form>
    </div>
  );
}

function SubcategoriaItem({
  subcategoria,
  onAtualizar,
  onAlternarAtivo,
}: {
  subcategoria: Subcategoria;
  onAtualizar: (id: string, input: { nome?: string }) => Promise<void>;
  onAlternarAtivo: (subcategoria: Subcategoria) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(subcategoria.nome);

  async function salvar() {
    await onAtualizar(subcategoria.id, { nome });
    setEditando(false);
  }

  function cancelar() {
    setNome(subcategoria.nome);
    setEditando(false);
  }

  return (
    <div
      className={`border-outline-variant px-lg py-sm flex items-center justify-between gap-2 border-t ${
        subcategoria.ativo ? "" : "opacity-60"
      }`}
    >
      {editando ? (
        <>
          <input
            className="border-outline-variant bg-surface-container-lowest min-w-0 flex-1 rounded-lg border px-2 py-1 text-sm"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoFocus
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
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="text-on-surface text-sm">{subcategoria.nome}</span>
            {!subcategoria.ativo && (
              <span className="bg-surface-container text-on-surface-variant rounded-full px-1.5 py-0.5 text-xs">
                inativa
              </span>
            )}
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
              title={subcategoria.ativo ? "Inativar" : "Reativar"}
              aria-label={subcategoria.ativo ? "Inativar" : "Reativar"}
              onClick={() => onAlternarAtivo(subcategoria)}
              className={
                subcategoria.ativo
                  ? "text-danger hover:bg-danger-container rounded-full p-1.5 transition-colors"
                  : "text-success hover:bg-success/15 rounded-full p-1.5 transition-colors"
              }
            >
              {subcategoria.ativo ? <IconeInativar /> : <IconeReativar />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
