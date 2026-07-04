"use client";

import { useEffect, useState } from "react";

const TIPOS_INVESTIMENTO = [
  { value: "RENDA_FIXA", label: "Renda Fixa" },
  { value: "FUNDO", label: "Fundo de Investimento" },
  { value: "FGTS", label: "FGTS" },
  { value: "OUTRO", label: "Outro" },
] as const;

type TipoInvestimento = (typeof TIPOS_INVESTIMENTO)[number]["value"];

function labelTipo(tipo: string): string {
  return TIPOS_INVESTIMENTO.find((t) => t.value === tipo)?.label ?? tipo;
}

const FAIXAS_LABEL: Record<string, string> = {
  IMEDIATO: "Imediato (D+0)",
  ATE_30_DIAS: "Até 30 dias",
  ATE_90_DIAS: "Até 90 dias",
  ATE_180_DIAS: "Até 180 dias",
  ATE_365_DIAS: "Até 1 ano",
  MAIS_DE_1_ANO: "Mais de 1 ano",
  INDEFINIDO: "Sem prazo definido",
};

type Banco = { id: string; nome: string; ativo: boolean };
type Pessoa = { id: string; nome: string; tipo: string };
type Investimento = {
  id: string;
  bancoId: string;
  tipo: TipoInvestimento;
  produto: string;
  valorAtualCentavos: number;
  vencimento: string | null;
  liquidezDias: number | null;
  observacao: string | null;
  pessoaId: string;
};
type FaixaLiquidez = {
  faixa: string;
  totalCentavos: number;
  investimentos: { id: string; produto: string; valorAtualCentavos: number }[];
};

async function parseErro(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  if (typeof body?.error === "string") return body.error;
  return "Não foi possível completar a operação.";
}

function reaisParaCentavos(valor: string): number {
  const n = Number(valor.replace(",", "."));
  return Math.round(n * 100);
}

function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

type FormState = {
  bancoId: string;
  pessoaId: string;
  tipo: TipoInvestimento;
  produto: string;
  valor: string;
  modoLiquidez: "DIAS" | "DATA" | "NENHUM";
  liquidezDias: string;
  vencimento: string;
  observacao: string;
};

function formVazio(bancos: Banco[], pessoas: Pessoa[]): FormState {
  return {
    bancoId: bancos[0]?.id ?? "",
    pessoaId: pessoas[0]?.id ?? "",
    tipo: "RENDA_FIXA",
    produto: "",
    valor: "",
    modoLiquidez: "DIAS",
    liquidezDias: "0",
    vencimento: "",
    observacao: "",
  };
}

export function InvestimentosClient() {
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [investimentos, setInvestimentos] = useState<Investimento[] | null>(
    null,
  );
  const [liquidez, setLiquidez] = useState<FaixaLiquidez[] | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [naoAutenticado, setNaoAutenticado] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  function recarregar() {
    setReloadToken((t) => t + 1);
  }

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      fetch("/api/bancos").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/pessoas").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([bcs, pes]) => {
        if (cancelado) return;
        if (bcs === null || pes === null) {
          setNaoAutenticado(true);
          return;
        }
        setNaoAutenticado(false);
        setBancos(bcs);
        setPessoas(pes);
        setForm((atual) => atual ?? formVazio(bcs, pes));
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar bancos/pessoas.");
      });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      fetch("/api/investimentos").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/investimentos/liquidez").then((r) =>
        r.ok ? r.json() : null,
      ),
    ])
      .then(([invs, liq]) => {
        if (cancelado) return;
        if (invs === null || liq === null) {
          setNaoAutenticado(true);
          return;
        }
        setNaoAutenticado(false);
        setInvestimentos(invs);
        setLiquidez(liq);
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar investimentos.");
      });
    return () => {
      cancelado = true;
    };
  }, [reloadToken]);

  async function criarInvestimento(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setErro(null);

    const response = await fetch("/api/investimentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bancoId: form.bancoId,
        pessoaId: form.pessoaId,
        tipo: form.tipo,
        produto: form.produto,
        valorAtualCentavos: reaisParaCentavos(form.valor || "0"),
        liquidezDias:
          form.modoLiquidez === "DIAS" ? Number(form.liquidezDias) : null,
        vencimento: form.modoLiquidez === "DATA" ? form.vencimento : null,
        observacao: form.observacao.trim() === "" ? null : form.observacao,
      }),
    });
    if (!response.ok) {
      setErro(await parseErro(response));
      return;
    }
    setForm(formVazio(bancos, pessoas));
    recarregar();
  }

  async function removerInvestimento(id: string) {
    setErro(null);
    const response = await fetch(`/api/investimentos/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setErro(await parseErro(response));
      return;
    }
    recarregar();
  }

  if (naoAutenticado) {
    return (
      <p className="text-on-surface-variant">
        Não autenticado — faça login para gerenciar investimentos.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {erro && (
        <p className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      {form && (
        <form
          onSubmit={criarInvestimento}
          className="flex flex-wrap items-end gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface-variant" htmlFor="banco">
              Banco
            </label>
            <select
              id="banco"
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1"
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
            <label className="text-xs font-semibold text-on-surface-variant" htmlFor="titular">
              Titular
            </label>
            <select
              id="titular"
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1"
              value={form.pessoaId}
              onChange={(e) => setForm({ ...form, pessoaId: e.target.value })}
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
            <label className="text-xs font-semibold text-on-surface-variant" htmlFor="tipo">
              Tipo
            </label>
            <select
              id="tipo"
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1"
              value={form.tipo}
              onChange={(e) =>
                setForm({ ...form, tipo: e.target.value as TipoInvestimento })
              }
            >
              {TIPOS_INVESTIMENTO.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface-variant" htmlFor="produto">
              Produto
            </label>
            <input
              id="produto"
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1"
              value={form.produto}
              onChange={(e) => setForm({ ...form, produto: e.target.value })}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface-variant" htmlFor="valor">
              Valor atual (R$)
            </label>
            <input
              id="valor"
              type="number"
              step="0.01"
              className="w-32 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface-variant" htmlFor="modo-liquidez">
              Vencimento/liquidez
            </label>
            <select
              id="modo-liquidez"
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1"
              value={form.modoLiquidez}
              onChange={(e) =>
                setForm({
                  ...form,
                  modoLiquidez: e.target.value as FormState["modoLiquidez"],
                })
              }
            >
              <option value="DIAS">Prazo (D+n)</option>
              <option value="DATA">Data de vencimento</option>
              <option value="NENHUM">Indefinido</option>
            </select>
          </div>

          {form.modoLiquidez === "DIAS" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface-variant" htmlFor="liquidez-dias">
                Dias (D+n)
              </label>
              <input
                id="liquidez-dias"
                type="number"
                min={0}
                className="w-24 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1"
                value={form.liquidezDias}
                onChange={(e) =>
                  setForm({ ...form, liquidezDias: e.target.value })
                }
              />
            </div>
          )}

          {form.modoLiquidez === "DATA" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-on-surface-variant" htmlFor="vencimento">
                Data
              </label>
              <input
                id="vencimento"
                type="date"
                className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1"
                value={form.vencimento}
                onChange={(e) =>
                  setForm({ ...form, vencimento: e.target.value })
                }
                required
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-on-surface-variant" htmlFor="observacao">
              Observação
            </label>
            <input
              id="observacao"
              className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1"
              value={form.observacao}
              onChange={(e) =>
                setForm({ ...form, observacao: e.target.value })
              }
            />
          </div>

          <button
            type="submit"
            className="rounded-full bg-primary px-md py-1.5 text-xs font-semibold text-on-primary hover:opacity-90"
          >
            Adicionar
          </button>
        </form>
      )}

      <section className="flex flex-col gap-sm">
        <h2 className="text-lg font-semibold text-on-surface">Carteira</h2>
        <ul className="flex flex-col gap-2">
          {investimentos?.map((inv) => {
            const banco = bancos.find((b) => b.id === inv.bancoId);
            const pessoa = pessoas.find((p) => p.id === inv.pessoaId);
            return (
              <li
                key={inv.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-sm"
              >
                <span className="rounded-full bg-surface-container px-2 py-0.5 text-xs font-medium text-on-surface-variant">
                  {banco?.nome ?? "—"}
                </span>
                <span className="text-sm text-on-surface-variant">
                  {labelTipo(inv.tipo)}
                </span>
                <span className="font-medium text-on-surface">{inv.produto}</span>
                <span className="text-sm text-on-surface-variant">
                  {pessoa?.nome ?? "—"}
                </span>
                <span className="data-tabular ml-auto font-medium text-on-surface">
                  {formatarReais(inv.valorAtualCentavos)}
                </span>
                <span className="text-sm text-on-surface-variant">
                  {inv.liquidezDias !== null
                    ? `D+${inv.liquidezDias}`
                    : inv.vencimento
                      ? new Date(inv.vencimento).toLocaleDateString("pt-BR", {
                          timeZone: "UTC",
                        })
                      : "Indefinido"}
                </span>
                {inv.observacao && (
                  <span className="w-full text-sm text-on-surface-variant">
                    {inv.observacao}
                  </span>
                )}
                <button
                  className="text-sm font-medium text-danger"
                  onClick={() => removerInvestimento(inv.id)}
                >
                  Remover
                </button>
              </li>
            );
          })}
        </ul>
        {investimentos?.length === 0 && (
          <p className="text-sm text-on-surface-variant">
            Nenhum investimento cadastrado.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-sm">
        <h2 className="text-lg font-semibold text-on-surface">
          Liquidez consolidada (RF15)
        </h2>
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-outline-variant text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              <th className="p-2 text-left">Prazo de resgate</th>
              <th className="p-2 text-right">Total disponível</th>
            </tr>
          </thead>
          <tbody>
            {liquidez?.map((grupo) => (
              <tr
                key={grupo.faixa}
                className="border-b border-outline-variant/60"
              >
                <td className="p-2">{FAIXAS_LABEL[grupo.faixa] ?? grupo.faixa}</td>
                <td className="data-tabular p-2 text-right font-medium">
                  {formatarReais(grupo.totalCentavos)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
