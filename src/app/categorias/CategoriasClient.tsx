"use client";

import { useEffect, useState, type FormEvent } from "react";

type Subcategoria = {
  id: string;
  nome: string;
  categoriaId: string;
  orcamentoCentavos: number | null;
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

function centavosParaReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function reaisParaCentavos(valor: string): number | null {
  const normalizado = valor.trim().replace(",", ".");
  if (normalizado === "") return null;
  const numero = Number(normalizado);
  if (Number.isNaN(numero)) return null;
  return Math.round(numero * 100);
}

function somaOrcamentoCategoria(categoria: Categoria): number {
  return categoria.subcategorias
    .filter((s) => s.ativo)
    .reduce((total, s) => total + (s.orcamentoCentavos ?? 0), 0);
}

type PlanejadoVsRealCategoria = {
  categoriaId: string;
  subcategoriaId: string | null;
  meses: { mes: number; planejadoCentavos: number }[];
};

function IconePasta() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4h6l2 2h8a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
    </svg>
  );
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

function IconeMais() {
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
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
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

  // Mantém o limite exibido aqui sempre igual ao valor vigente no mês
  // corrente do orçamento mensal (Tela de Orçamento), que pode ter sido
  // sobrescrito lá desde a última vez que este limite foi definido.
  useEffect(() => {
    if (!categorias) return;
    let cancelado = false;
    const hoje = new Date();
    const ano = hoje.getUTCFullYear();
    const mes = hoje.getUTCMonth() + 1;

    // pessoaId=null: só o orçamento compartilhado da casa, sem somar
    // orçamentos individuais de cada pessoa ao limite exibido aqui.
    fetch(`/api/relatorios/planejado-vs-real?ano=${ano}&pessoaId=null`)
      .then(async (response) => {
        if (cancelado || !response.ok) return;
        const dados: PlanejadoVsRealCategoria[] = await response.json();
        const valorVigentePorSubcategoria = new Map<string, number>();
        for (const linha of dados) {
          if (!linha.subcategoriaId) continue;
          const doMes = linha.meses.find((m) => m.mes === mes);
          if (doMes) {
            valorVigentePorSubcategoria.set(
              linha.subcategoriaId,
              doMes.planejadoCentavos,
            );
          }
        }

        const desatualizadas = (categorias ?? [])
          .flatMap((c) => c.subcategorias)
          .filter((s) => {
            if (s.orcamentoCentavos === null) return false; // sem limite definido ainda
            const vigente = valorVigentePorSubcategoria.get(s.id);
            return vigente !== undefined && vigente !== s.orcamentoCentavos;
          });
        if (desatualizadas.length === 0 || cancelado) return;

        await Promise.all(
          desatualizadas.map((s) =>
            fetch(`/api/subcategorias/${s.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orcamentoCentavos: valorVigentePorSubcategoria.get(s.id),
              }),
            }),
          ),
        );
        if (!cancelado) carregar();
      })
      .catch(() => {
        // Sincronização best-effort: falha aqui não deve bloquear a tela.
      });

    return () => {
      cancelado = true;
    };
  }, [categorias]);

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

  async function criarSubcategoria(
    categoriaId: string,
    nome: string,
    orcamentoCentavos: number | null,
  ) {
    setErro(null);
    const response = await fetch("/api/subcategorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, categoriaId, orcamentoCentavos }),
    });
    if (!response.ok) {
      setErro(await parseErro(response));
      return;
    }
    carregar();
  }

  async function atualizarSubcategoria(
    id: string,
    input: { nome?: string; orcamentoCentavos?: number | null },
  ) {
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
  onCriarSubcategoria: (
    categoriaId: string,
    nome: string,
    orcamentoCentavos: number | null,
  ) => Promise<void>;
  onAtualizarSubcategoria: (
    id: string,
    input: { nome?: string; orcamentoCentavos?: number | null },
  ) => Promise<void>;
  onAlternarAtivoSubcategoria: (subcategoria: Subcategoria) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(categoria.nome);
  const [novaSubNome, setNovaSubNome] = useState("");
  const [novaSubValor, setNovaSubValor] = useState("");

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
              <span className="text-on-surface text-sm font-semibold">
                Limite: R${" "}
                {centavosParaReais(somaOrcamentoCategoria(categoria))}
              </span>
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
          await onCriarSubcategoria(
            categoria.id,
            novaSubNome,
            reaisParaCentavos(novaSubValor),
          );
          setNovaSubNome("");
          setNovaSubValor("");
        }}
      >
        <input
          className="border-outline-variant bg-surface-container-lowest min-w-0 flex-1 rounded-lg border px-2 py-1 text-sm"
          placeholder="Nova subcategoria"
          value={novaSubNome}
          onChange={(e) => setNovaSubNome(e.target.value)}
          required
        />
        <input
          className="border-outline-variant bg-surface-container-lowest w-28 rounded-lg border px-2 py-1 text-sm"
          placeholder="R$ 0,00"
          inputMode="decimal"
          value={novaSubValor}
          onChange={(e) => setNovaSubValor(e.target.value)}
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
  onAtualizar: (
    id: string,
    input: { nome?: string; orcamentoCentavos?: number | null },
  ) => Promise<void>;
  onAlternarAtivo: (subcategoria: Subcategoria) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(subcategoria.nome);
  const [valor, setValor] = useState(
    subcategoria.orcamentoCentavos != null
      ? centavosParaReais(subcategoria.orcamentoCentavos)
      : "",
  );

  async function salvar() {
    await onAtualizar(subcategoria.id, {
      nome,
      orcamentoCentavos: reaisParaCentavos(valor),
    });
    setEditando(false);
  }

  function cancelar() {
    setNome(subcategoria.nome);
    setValor(
      subcategoria.orcamentoCentavos != null
        ? centavosParaReais(subcategoria.orcamentoCentavos)
        : "",
    );
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
          <input
            className="border-outline-variant bg-surface-container-lowest w-28 rounded-lg border px-2 py-1 text-sm"
            placeholder="R$ 0,00"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
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
          <div className="flex items-center gap-3">
            <span className="text-on-surface-variant text-sm">
              {subcategoria.orcamentoCentavos != null
                ? `R$ ${centavosParaReais(subcategoria.orcamentoCentavos)}`
                : "sem orçamento"}
            </span>
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
          </div>
        </>
      )}
    </div>
  );
}
