"use client";

import { useEffect, useMemo, useState } from "react";

type Subcategoria = { id: string; nome: string; categoriaId: string };
type Categoria = { id: string; nome: string; subcategorias: Subcategoria[] };
type Banco = { id: string; nome: string };
type Pessoa = { id: string; nome: string };

type Lancamento = {
  id: string;
  data: string;
  descricaoPropria: string | null;
  descricaoOrigem: string | null;
  valorCentavos: number;
  descontoCentavos: number;
  categoriaId: string | null;
  subcategoriaId: string | null;
  bancoId: string;
  pessoaDivisaoId: string;
  pessoaPagouId: string;
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
  if (valor.trim() === "") return 0;
  const n = Number(valor.replace(",", "."));
  return Math.round(n * 100);
}

function dataParaInputDate(data: string): string {
  return data.slice(0, 10);
}

const SEM_CATEGORIA = "";

type FormLancamento = {
  data: string;
  descricaoPropria: string;
  valor: string;
  desconto: string;
  categoriaId: string;
  subcategoriaId: string;
  bancoId: string;
  pessoaDivisaoId: string;
  pessoaPagouId: string;
};

function formVazio(defaults: {
  bancoId?: string;
  pessoaId?: string;
}): FormLancamento {
  return {
    data: new Date().toISOString().slice(0, 10),
    descricaoPropria: "",
    valor: "",
    desconto: "",
    categoriaId: SEM_CATEGORIA,
    subcategoriaId: SEM_CATEGORIA,
    bancoId: defaults.bancoId ?? "",
    pessoaDivisaoId: defaults.pessoaId ?? "",
    pessoaPagouId: defaults.pessoaId ?? "",
  };
}

export function LancamentosClient() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [naoAutenticado, setNaoAutenticado] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroCategoriaId, setFiltroCategoriaId] = useState("");
  const [filtroBancoId, setFiltroBancoId] = useState("");
  const [filtroPessoaId, setFiltroPessoaId] = useState("");

  const [form, setForm] = useState<FormLancamento>(formVazio({}));

  function carregar() {
    setReloadToken((t) => t + 1);
  }

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      fetch("/api/categorias").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/bancos").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/pessoas").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([cats, bcs, pes]) => {
        if (cancelado) return;
        if (cats === null || bcs === null || pes === null) {
          setNaoAutenticado(true);
          return;
        }
        setNaoAutenticado(false);
        setCategorias(cats);
        setBancos(bcs);
        setPessoas(pes);
        setForm((atual) =>
          atual.bancoId || atual.pessoaDivisaoId
            ? atual
            : formVazio({ bancoId: bcs[0]?.id, pessoaId: pes[0]?.id }),
        );
      })
      .catch(() => {
        if (!cancelado)
          setErro("Não foi possível carregar categorias/bancos/pessoas.");
      });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    const params = new URLSearchParams();
    if (filtroDataInicio) params.set("dataInicio", filtroDataInicio);
    if (filtroDataFim) params.set("dataFim", filtroDataFim);
    if (filtroCategoriaId) params.set("categoriaId", filtroCategoriaId);
    if (filtroBancoId) params.set("bancoId", filtroBancoId);
    if (filtroPessoaId) params.set("pessoaId", filtroPessoaId);

    fetch(`/api/lancamentos?${params.toString()}`)
      .then(async (response) => {
        if (cancelado) return;
        if (response.status === 401) {
          setNaoAutenticado(true);
          return;
        }
        setNaoAutenticado(false);
        setLancamentos(await response.json());
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar os lançamentos.");
      });
    return () => {
      cancelado = true;
    };
  }, [
    filtroDataInicio,
    filtroDataFim,
    filtroCategoriaId,
    filtroBancoId,
    filtroPessoaId,
    reloadToken,
  ]);

  const nome = useMemo(() => {
    const mapaBancos = new Map(bancos.map((b) => [b.id, b.nome]));
    const mapaPessoas = new Map(pessoas.map((p) => [p.id, p.nome]));
    const mapaCategorias = new Map(categorias.map((c) => [c.id, c.nome]));
    const mapaSubcategorias = new Map(
      categorias.flatMap((c) => c.subcategorias.map((s) => [s.id, s.nome])),
    );
    return {
      banco: (id: string) => mapaBancos.get(id) ?? "—",
      pessoa: (id: string) => mapaPessoas.get(id) ?? "—",
      categoria: (id: string | null) =>
        id ? (mapaCategorias.get(id) ?? "—") : "—",
      subcategoria: (id: string | null) =>
        id ? (mapaSubcategorias.get(id) ?? "—") : "—",
    };
  }, [bancos, pessoas, categorias]);

  const subcategoriasDaCategoriaSelecionada = useMemo(() => {
    return (
      categorias.find((c) => c.id === form.categoriaId)?.subcategorias ?? []
    );
  }, [categorias, form.categoriaId]);

  async function criarLancamento(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const response = await fetch("/api/lancamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: form.data,
        descricaoPropria: form.descricaoPropria || null,
        valorCentavos: reaisParaCentavos(form.valor),
        descontoCentavos: reaisParaCentavos(form.desconto),
        categoriaId: form.categoriaId || null,
        subcategoriaId: form.subcategoriaId || null,
        bancoId: form.bancoId,
        pessoaDivisaoId: form.pessoaDivisaoId,
        pessoaPagouId: form.pessoaPagouId,
      }),
    });
    if (!response.ok) {
      setErro(await parseErro(response));
      return;
    }
    setForm((atual) => ({
      ...formVazio({ bancoId: atual.bancoId, pessoaId: atual.pessoaDivisaoId }),
    }));
    carregar();
  }

  async function atualizarLancamento(id: string, input: Partial<Lancamento>) {
    setErro(null);
    const response = await fetch(`/api/lancamentos/${id}`, {
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

  async function removerLancamento(lancamento: Lancamento) {
    if (!confirm("Remover esse lançamento? Essa ação não pode ser desfeita.")) {
      return;
    }
    setErro(null);
    const response = await fetch(`/api/lancamentos/${lancamento.id}`, {
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
        Não autenticado — faça login para gerenciar lançamentos.
      </p>
    );
  }

  const inputClass =
    "rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-1.5 text-sm focus:border-primary focus:outline-none";

  return (
    <div className="flex flex-col gap-lg">
      {erro && (
        <p className="rounded-lg border border-danger/30 bg-danger-container p-sm text-sm text-on-danger-container">
          {erro}
        </p>
      )}

      <form
        onSubmit={criarLancamento}
        className="flex flex-wrap items-end gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-lg"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant" htmlFor="l-data">
            Data
          </label>
          <input
            id="l-data"
            type="date"
            className={inputClass}
            value={form.data}
            onChange={(e) => setForm({ ...form, data: e.target.value })}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant" htmlFor="l-descricao">
            Descrição
          </label>
          <input
            id="l-descricao"
            className={inputClass}
            value={form.descricaoPropria}
            onChange={(e) =>
              setForm({ ...form, descricaoPropria: e.target.value })
            }
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant" htmlFor="l-valor">
            Valor (R$)
          </label>
          <input
            id="l-valor"
            type="number"
            step="0.01"
            title="Use valor negativo para estornos"
            className={`w-28 ${inputClass}`}
            value={form.valor}
            onChange={(e) => setForm({ ...form, valor: e.target.value })}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant" htmlFor="l-desconto">
            Desconto (R$)
          </label>
          <input
            id="l-desconto"
            type="number"
            step="0.01"
            min={0}
            className={`w-24 ${inputClass}`}
            value={form.desconto}
            onChange={(e) => setForm({ ...form, desconto: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant" htmlFor="l-categoria">
            Categoria
          </label>
          <select
            id="l-categoria"
            className={inputClass}
            value={form.categoriaId}
            onChange={(e) =>
              setForm({
                ...form,
                categoriaId: e.target.value,
                subcategoriaId: SEM_CATEGORIA,
              })
            }
          >
            <option value={SEM_CATEGORIA}>Nenhuma</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant" htmlFor="l-subcategoria">
            Subcategoria
          </label>
          <select
            id="l-subcategoria"
            className={inputClass}
            value={form.subcategoriaId}
            onChange={(e) =>
              setForm({ ...form, subcategoriaId: e.target.value })
            }
            disabled={!form.categoriaId}
          >
            <option value={SEM_CATEGORIA}>Nenhuma</option>
            {subcategoriasDaCategoriaSelecionada.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant" htmlFor="l-banco">
            Banco
          </label>
          <select
            id="l-banco"
            className={inputClass}
            value={form.bancoId}
            onChange={(e) => setForm({ ...form, bancoId: e.target.value })}
            required
          >
            {bancos.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant" htmlFor="l-divisao">
            Divisão (dono do gasto)
          </label>
          <select
            id="l-divisao"
            className={inputClass}
            value={form.pessoaDivisaoId}
            onChange={(e) =>
              setForm({ ...form, pessoaDivisaoId: e.target.value })
            }
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
          <label className="text-xs font-semibold text-on-surface-variant" htmlFor="l-pagou">
            Quem pagou
          </label>
          <select
            id="l-pagou"
            className={inputClass}
            value={form.pessoaPagouId}
            onChange={(e) =>
              setForm({ ...form, pessoaPagouId: e.target.value })
            }
            required
          >
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-full bg-primary px-md py-1.5 text-xs font-semibold text-on-primary hover:opacity-90"
        >
          Adicionar
        </button>
      </form>

      <div className="flex flex-wrap items-end gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant" htmlFor="f-inicio">
            De
          </label>
          <input
            id="f-inicio"
            type="date"
            className={inputClass}
            value={filtroDataInicio}
            onChange={(e) => setFiltroDataInicio(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant" htmlFor="f-fim">
            Até
          </label>
          <input
            id="f-fim"
            type="date"
            className={inputClass}
            value={filtroDataFim}
            onChange={(e) => setFiltroDataFim(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant" htmlFor="f-categoria">
            Categoria
          </label>
          <select
            id="f-categoria"
            className={inputClass}
            value={filtroCategoriaId}
            onChange={(e) => setFiltroCategoriaId(e.target.value)}
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant" htmlFor="f-banco">
            Banco
          </label>
          <select
            id="f-banco"
            className={inputClass}
            value={filtroBancoId}
            onChange={(e) => setFiltroBancoId(e.target.value)}
          >
            <option value="">Todos</option>
            {bancos.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-on-surface-variant" htmlFor="f-pessoa">
            Pessoa
          </label>
          <select
            id="f-pessoa"
            className={inputClass}
            value={filtroPessoaId}
            onChange={(e) => setFiltroPessoaId(e.target.value)}
          >
            <option value="">Todas</option>
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-outline-variant text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              <th className="p-2 text-left">Data</th>
              <th className="p-2 text-left">Descrição</th>
              <th className="p-2 text-right">Valor</th>
              <th className="p-2 text-left">Categoria</th>
              <th className="p-2 text-left">Banco</th>
              <th className="p-2 text-left">Divisão</th>
              <th className="p-2 text-left">Pagou</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {lancamentos?.map((lancamento) => (
              <LinhaLancamento
                key={lancamento.id}
                lancamento={lancamento}
                categorias={categorias}
                bancos={bancos}
                pessoas={pessoas}
                nome={nome}
                onAtualizar={atualizarLancamento}
                onRemover={removerLancamento}
              />
            ))}
          </tbody>
        </table>
      </div>

      {lancamentos?.length === 0 && (
        <p className="text-sm text-on-surface-variant">Nenhum lançamento encontrado.</p>
      )}
    </div>
  );
}

function LinhaLancamento({
  lancamento,
  categorias,
  bancos,
  pessoas,
  nome,
  onAtualizar,
  onRemover,
}: {
  lancamento: Lancamento;
  categorias: Categoria[];
  bancos: Banco[];
  pessoas: Pessoa[];
  nome: {
    banco: (id: string) => string;
    pessoa: (id: string) => string;
    categoria: (id: string | null) => string;
    subcategoria: (id: string | null) => string;
  };
  onAtualizar: (id: string, input: Partial<Lancamento>) => Promise<void>;
  onRemover: (lancamento: Lancamento) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [data, setData] = useState(dataParaInputDate(lancamento.data));
  const [descricao, setDescricao] = useState(
    lancamento.descricaoPropria ?? "",
  );
  const [valor, setValor] = useState(
    centavosParaReais(lancamento.valorCentavos),
  );
  const [categoriaId, setCategoriaId] = useState(
    lancamento.categoriaId ?? SEM_CATEGORIA,
  );
  const [subcategoriaId, setSubcategoriaId] = useState(
    lancamento.subcategoriaId ?? SEM_CATEGORIA,
  );
  const [bancoId, setBancoId] = useState(lancamento.bancoId);
  const [pessoaDivisaoId, setPessoaDivisaoId] = useState(
    lancamento.pessoaDivisaoId,
  );
  const [pessoaPagouId, setPessoaPagouId] = useState(lancamento.pessoaPagouId);

  const valorLiquido = lancamento.valorCentavos - lancamento.descontoCentavos;
  const subcategoriasDaCategoria =
    categorias.find((c) => c.id === categoriaId)?.subcategorias ?? [];

  async function salvar() {
    await onAtualizar(lancamento.id, {
      data,
      descricaoPropria: descricao || null,
      valorCentavos: reaisParaCentavos(valor),
      categoriaId: categoriaId || null,
      subcategoriaId: subcategoriaId || null,
      bancoId,
      pessoaDivisaoId,
      pessoaPagouId,
    });
    setEditando(false);
  }

  const inputClass =
    "rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1";

  if (editando) {
    return (
      <tr className="border-b border-outline-variant/60">
        <td className="p-1">
          <input
            type="date"
            className={inputClass}
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </td>
        <td className="p-1">
          <input
            className={inputClass}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </td>
        <td className="p-1">
          <input
            type="number"
            step="0.01"
            className={`w-24 text-right ${inputClass}`}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </td>
        <td className="p-1">
          <select
            className={inputClass}
            value={categoriaId}
            onChange={(e) => {
              setCategoriaId(e.target.value);
              setSubcategoriaId(SEM_CATEGORIA);
            }}
          >
            <option value={SEM_CATEGORIA}>Nenhuma</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <select
            className={`mt-1 ${inputClass}`}
            value={subcategoriaId}
            onChange={(e) => setSubcategoriaId(e.target.value)}
            disabled={!categoriaId}
          >
            <option value={SEM_CATEGORIA}>Nenhuma</option>
            {subcategoriasDaCategoria.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </td>
        <td className="p-1">
          <select
            className={inputClass}
            value={bancoId}
            onChange={(e) => setBancoId(e.target.value)}
          >
            {bancos.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nome}
              </option>
            ))}
          </select>
        </td>
        <td className="p-1">
          <select
            className={inputClass}
            value={pessoaDivisaoId}
            onChange={(e) => setPessoaDivisaoId(e.target.value)}
          >
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </td>
        <td className="p-1">
          <select
            className={inputClass}
            value={pessoaPagouId}
            onChange={(e) => setPessoaPagouId(e.target.value)}
          >
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </td>
        <td className="flex gap-2 p-1">
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
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-outline-variant/60 hover:bg-surface-container-low">
      <td className="p-2">{dataParaInputDate(lancamento.data)}</td>
      <td className="p-2">{lancamento.descricaoPropria || "—"}</td>
      <td className="data-tabular p-2 text-right">R$ {centavosParaReais(valorLiquido)}</td>
      <td className="p-2">
        {nome.categoria(lancamento.categoriaId)}
        {lancamento.subcategoriaId
          ? ` / ${nome.subcategoria(lancamento.subcategoriaId)}`
          : ""}
      </td>
      <td className="p-2">{nome.banco(lancamento.bancoId)}</td>
      <td className="p-2">{nome.pessoa(lancamento.pessoaDivisaoId)}</td>
      <td className="p-2">{nome.pessoa(lancamento.pessoaPagouId)}</td>
      <td className="flex gap-2 p-2">
        <button
          className="text-sm font-medium text-primary"
          onClick={() => setEditando(true)}
        >
          Editar
        </button>
        <button
          className="text-sm font-medium text-danger"
          onClick={() => onRemover(lancamento)}
        >
          Remover
        </button>
      </td>
    </tr>
  );
}
