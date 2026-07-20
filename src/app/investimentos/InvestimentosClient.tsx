"use client";

import { useEffect, useMemo, useState } from "react";
import { RelatorioInvestimentos } from "./components/RelatorioInvestimentos";
import { FinalizarInvestimentoModal } from "./components/FinalizarInvestimentoModal";
import { EditarInvestimentoModal } from "./components/EditarInvestimentoModal";
import { NovoInvestimentoModal } from "./components/NovoInvestimentoModal";
import { InvestimentosTabs } from "./components/InvestimentosTabs";
import { CarteiraToolbar } from "./components/CarteiraToolbar";
import { CarteiraTable } from "./components/CarteiraTable";
import { useConfirmDialog } from "../components/ConfirmDialog";
import { useTabela, type ColunaTabela } from "../components/useTabela";
import { filtroEstaAtivo } from "@/lib/domain/tabela";
import { diasAteResgate, diasParaFaixa } from "@/lib/domain/investimentos";

export const TIPOS_INVESTIMENTO = [
  { value: "RENDA_FIXA", label: "Renda Fixa" },
  { value: "FUNDO", label: "Fundo de Investimento" },
  { value: "FGTS", label: "FGTS" },
  { value: "OUTRO", label: "Outro" },
] as const;

export type TipoInvestimento = (typeof TIPOS_INVESTIMENTO)[number]["value"];

export function labelTipo(tipo: string): string {
  return TIPOS_INVESTIMENTO.find((t) => t.value === tipo)?.label ?? tipo;
}

export const FAIXAS_LABEL: Record<string, string> = {
  IMEDIATO: "Imediato (D+0)",
  ATE_30_DIAS: "Até 30 dias",
  ATE_90_DIAS: "Até 90 dias",
  ATE_180_DIAS: "Até 180 dias",
  ATE_365_DIAS: "Até 1 ano",
  MAIS_DE_1_ANO: "Mais de 1 ano",
  INDEFINIDO: "Sem prazo definido",
};

export type Banco = { id: string; nome: string; ativo: boolean };
export type Pessoa = { id: string; nome: string; tipo: string };
export type Investimento = {
  id: string;
  bancoId: string;
  tipo: TipoInvestimento;
  produto: string;
  valorAtualCentavos: number;
  vencimento: string | null;
  liquidezDias: number | null;
  observacao: string | null;
  pessoaId: string;
  status: "ATIVO" | "FINALIZADO";
};
type FaixaLiquidez = {
  faixa: string;
  totalCentavos: number;
  investimentos: { id: string; produto: string; valorAtualCentavos: number }[];
};
type PosicaoMensal = {
  investimentoId: string;
  mes: string;
  valorCentavos: number;
};

export async function parseErro(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  if (typeof body?.error === "string") return body.error;
  return "Não foi possível completar a operação.";
}

export function reaisParaCentavos(valor: string): number {
  const n = Number(valor.replace(",", "."));
  return Math.round(n * 100);
}

export function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function labelVencimento(inv: Investimento): string {
  if (inv.liquidezDias !== null) return `D+${inv.liquidezDias}`;
  if (inv.vencimento)
    return new Date(inv.vencimento).toLocaleDateString("pt-BR", {
      timeZone: "UTC",
    });
  return "Indefinido";
}

export function InvestimentosClient() {
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [investimentos, setInvestimentos] = useState<Investimento[] | null>(
    null,
  );
  const [liquidez, setLiquidez] = useState<FaixaLiquidez[] | null>(null);
  const [mostrarNovoInvestimento, setMostrarNovoInvestimento] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [naoAutenticado, setNaoAutenticado] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [aba, setAba] = useState<"CARTEIRA" | "RELATORIOS">("RELATORIOS");
  const [toast, setToast] = useState<string | null>(null);
  const [mostrarFinalizados, setMostrarFinalizados] = useState(false);
  const [investimentoParaFinalizar, setInvestimentoParaFinalizar] =
    useState<Investimento | null>(null);
  const [investimentoParaEditar, setInvestimentoParaEditar] =
    useState<Investimento | null>(null);
  const { dialog: dialogConfirmacao } = useConfirmDialog();

  const anoAtual = new Date().getUTCFullYear();
  const [investimentoExpandidoId, setInvestimentoExpandidoId] = useState<
    string | null
  >(null);
  const [anoPosicoes, setAnoPosicoes] = useState(anoAtual);
  const [posicoesMensais, setPosicoesMensais] = useState<PosicaoMensal[]>([]);
  const [reloadPosicoesToken, setReloadPosicoesToken] = useState(0);

  function recarregar() {
    setReloadToken((t) => t + 1);
  }

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

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
    const query = mostrarFinalizados ? "?incluirFinalizados=true" : "";
    Promise.all([
      fetch(`/api/investimentos${query}`).then((r) => (r.ok ? r.json() : null)),
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
  }, [reloadToken, mostrarFinalizados]);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/investimentos/posicoes?ano=${anoPosicoes}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((dados) => {
        if (!cancelado) setPosicoesMensais(dados);
      })
      .catch(() => {
        if (!cancelado) setPosicoesMensais([]);
      });
    return () => {
      cancelado = true;
    };
  }, [anoPosicoes, reloadPosicoesToken]);

  function onInvestimentoCriado() {
    setMostrarNovoInvestimento(false);
    setToast("Investimento adicionado com sucesso!");
    recarregar();
  }

  function onInvestimentoFinalizado() {
    setInvestimentoParaFinalizar(null);
    setToast("Investimento finalizado com sucesso!");
    recarregar();
  }

  function onInvestimentoEditado() {
    setInvestimentoParaEditar(null);
    setToast("Investimento atualizado com sucesso!");
    recarregar();
  }

  const bancosPorId = useMemo(
    () => new Map(bancos.map((b) => [b.id, b])),
    [bancos],
  );
  const pessoasPorId = useMemo(
    () => new Map(pessoas.map((p) => [p.id, p])),
    [pessoas],
  );

  const colunasInvestimentos = useMemo<ColunaTabela<Investimento>[]>(
    () => [
      {
        chave: "banco",
        tipo: "opcoes",
        acessor: (inv) => bancosPorId.get(inv.bancoId)?.nome ?? "—",
      },
      { chave: "tipo", tipo: "opcoes", acessor: (inv) => labelTipo(inv.tipo) },
      { chave: "produto", tipo: "texto", acessor: (inv) => inv.produto },
      {
        chave: "titular",
        tipo: "opcoes",
        acessor: (inv) => pessoasPorId.get(inv.pessoaId)?.nome ?? "—",
      },
      {
        chave: "vencimento",
        tipo: "texto",
        acessor: (inv) => labelVencimento(inv),
      },
      {
        chave: "valor",
        tipo: "numero",
        acessor: (inv) => inv.valorAtualCentavos / 100,
      },
      // Sem coluna visível na tabela — existe só para permitir filtrar a
      // Carteira a partir de um clique no gráfico de liquidez.
      {
        chave: "faixaLiquidez",
        tipo: "opcoes",
        acessor: (inv) =>
          FAIXAS_LABEL[
            diasParaFaixa(
              diasAteResgate(
                {
                  liquidezDias: inv.liquidezDias,
                  vencimento: inv.vencimento ? new Date(inv.vencimento) : null,
                },
                new Date(),
              ),
            )
          ] ?? "—",
      },
    ],
    [bancosPorId, pessoasPorId],
  );

  const {
    linhas: investimentosParaExibir,
    ordenacao,
    alternarOrdenacao,
    filtros,
    definirFiltro,
    limparFiltro,
    limparTodosFiltros,
  } = useTabela(investimentos ?? [], colunasInvestimentos);

  const algumFiltroAtivo = Object.values(filtros).some(filtroEstaAtivo);

  function irParaCarteiraFiltrada(
    chave: "tipo" | "banco" | "titular" | "faixaLiquidez",
    valores: string[],
  ) {
    setAba("CARTEIRA");
    definirFiltro(chave, { tipo: "opcoes", selecionadas: valores });
  }

  const opcoesColunasInvestimentos = useMemo(() => {
    const base = investimentos ?? [];
    const unicos = (valores: string[]) =>
      [...new Set(valores)].sort((a, b) => a.localeCompare(b, "pt-BR"));
    return {
      banco: unicos(
        base.map((inv) => bancosPorId.get(inv.bancoId)?.nome ?? "—"),
      ),
      tipo: unicos(base.map((inv) => labelTipo(inv.tipo))),
      titular: unicos(
        base.map((inv) => pessoasPorId.get(inv.pessoaId)?.nome ?? "—"),
      ),
    };
  }, [investimentos, bancosPorId, pessoasPorId]);

  if (naoAutenticado) {
    return (
      <p className="text-on-surface-variant">
        Não autenticado — faça login para gerenciar investimentos.
      </p>
    );
  }

  const cardClass =
    "rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm";

  return (
    <div className="gap-lg flex flex-col">
      {dialogConfirmacao}

      {mostrarNovoInvestimento && (
        <NovoInvestimentoModal
          bancos={bancos}
          pessoas={pessoas}
          onClose={() => setMostrarNovoInvestimento(false)}
          onCriado={onInvestimentoCriado}
        />
      )}

      {investimentoParaFinalizar && (
        <FinalizarInvestimentoModal
          investimento={investimentoParaFinalizar}
          bancos={bancos}
          onClose={() => setInvestimentoParaFinalizar(null)}
          onFinalizado={onInvestimentoFinalizado}
        />
      )}

      {investimentoParaEditar && (
        <EditarInvestimentoModal
          investimento={investimentoParaEditar}
          bancos={bancos}
          pessoas={pessoas}
          onClose={() => setInvestimentoParaEditar(null)}
          onEditado={onInvestimentoEditado}
        />
      )}

      {toast && (
        <div className="bottom-lg right-lg bg-primary px-md text-on-primary fixed z-50 flex items-center gap-2 rounded-xl py-2.5 text-sm font-medium shadow-lg">
          <span aria-hidden>✓</span> {toast}
        </div>
      )}

      {erro && (
        <p className="border-danger/30 bg-danger-container p-sm text-on-danger-container rounded-lg border text-sm">
          {erro}
        </p>
      )}

      <InvestimentosTabs aba={aba} onChange={setAba} />

      {aba === "RELATORIOS" && (
        <RelatorioInvestimentos
          investimentos={investimentos ?? []}
          bancos={bancos}
          pessoas={pessoas}
          liquidez={liquidez ?? []}
          onFiltrarCarteira={irParaCarteiraFiltrada}
        />
      )}

      {aba === "CARTEIRA" && (
        <div className={cardClass}>
          <CarteiraToolbar
            totalItens={investimentos?.length ?? 0}
            algumFiltroAtivo={algumFiltroAtivo}
            onLimparFiltros={limparTodosFiltros}
            mostrarFinalizados={mostrarFinalizados}
            onMostrarFinalizadosChange={setMostrarFinalizados}
            anoPosicoes={anoPosicoes}
            anoAtual={anoAtual}
            onAnoPosicoesChange={setAnoPosicoes}
            onNovoInvestimento={() => setMostrarNovoInvestimento(true)}
          />
          <p className="text-on-surface-variant px-lg pb-md text-xs">
            Clique em um investimento para informar a posição mês a mês.
          </p>

          {investimentosParaExibir.length === 0 &&
          investimentos?.length === 0 ? (
            <p className="p-lg text-on-surface-variant text-sm">
              Nenhum investimento cadastrado.
            </p>
          ) : (
            <CarteiraTable
              investimentos={investimentosParaExibir}
              bancos={bancos}
              pessoas={pessoas}
              ordenacao={ordenacao}
              alternarOrdenacao={alternarOrdenacao}
              filtros={filtros}
              definirFiltro={definirFiltro}
              limparFiltro={limparFiltro}
              opcoesColunas={opcoesColunasInvestimentos}
              investimentoExpandidoId={investimentoExpandidoId}
              onToggleExpandir={setInvestimentoExpandidoId}
              anoPosicoes={anoPosicoes}
              posicoesMensais={posicoesMensais}
              onPosicaoAlterada={() => {
                setReloadPosicoesToken((t) => t + 1);
                setReloadToken((t) => t + 1);
              }}
              onEditar={setInvestimentoParaEditar}
              onFinalizar={setInvestimentoParaFinalizar}
            />
          )}
        </div>
      )}
    </div>
  );
}
