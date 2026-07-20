"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { totalPagoGeral } from "@/lib/domain/split";
import { RegistrarRepasseModal } from "./components/RegistrarRepasseModal";
import { ControlePagamentoCard } from "./components/ControlePagamentoCard";
import { SaldoHeroCard } from "./components/SaldoHeroCard";
import { PessoaProgressoCard } from "./components/PessoaProgressoCard";
import { HistoricoAcertosList } from "./components/HistoricoAcertosList";
import { GruposSemComposicaoWarning } from "./components/GruposSemComposicaoWarning";

export type Pessoa = { id: string; nome: string; tipo: string };
type SaldoPessoa = { pessoaId: string; saldoCentavos: number };
type Transferencia = { deId: string; paraId: string; valorCentavos: number };
type TotalPagoPessoa = { pessoaId: string; totalCentavos: number };
type LancamentoDetalhe = {
  id: string;
  data: string;
  descricao: string;
  categoriaNome: string | null;
  valorCentavos: number;
  pessoaDivisaoId: string;
};
type Insight = { categoriaNome: string; pessoaId: string } | null;
type GrupoSemComposicao = { pessoaId: string; nome: string };

type Resumo = {
  participantes: string[];
  saldosPorPessoa: SaldoPessoa[];
  transferenciasSugeridas: Transferencia[];
  totalPagoPorPessoa: TotalPagoPessoa[];
  lancamentos: LancamentoDetalhe[];
  insight: Insight;
  gruposSemComposicao: GrupoSemComposicao[];
};

type Acerto = {
  id: string;
  dataInicio: string;
  dataFim: string;
  valorCentavos: number;
  resolvidoEm: string;
  de: { id: string; nome: string };
  para: { id: string; nome: string };
};

export async function parseErro(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  if (typeof body?.error === "string") return body.error;
  return "Não foi possível completar a operação.";
}

export function reaisParaCentavos(valor: string): number {
  const normalizado = valor.replace(",", ".");
  return Math.round(Number(normalizado || "0") * 100);
}

function IconeChecklist() {
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
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

export function DivisaoClient() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [historico, setHistorico] = useState<Acerto[]>([]);
  const [buscou, setBuscou] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [naoAutenticado, setNaoAutenticado] = useState(false);
  const [modalRepasseAberto, setModalRepasseAberto] = useState(false);
  const [repasseRegistrado, setRepasseRegistrado] = useState(false);
  const [mostrarHistoricoCompleto, setMostrarHistoricoCompleto] =
    useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelado = false;
    fetch("/api/pessoas")
      .then(async (response) => {
        if (cancelado) return;
        if (response.status === 401) {
          setNaoAutenticado(true);
          return;
        }
        setPessoas(await response.json());
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
    fetch("/api/relatorios/divisao")
      .then(async (response) => {
        if (cancelado) return;
        if (response.status === 401) {
          setNaoAutenticado(true);
          return;
        }
        setNaoAutenticado(false);
        if (!response.ok) {
          setErro("Não foi possível calcular o acerto de contas.");
          setResumo(null);
          return;
        }
        setErro(null);
        setResumo(await response.json());
        setBuscou(true);
      })
      .catch(() => {
        if (!cancelado)
          setErro("Não foi possível calcular o acerto de contas.");
      });
    return () => {
      cancelado = true;
    };
  }, [reloadToken]);

  useEffect(() => {
    let cancelado = false;
    fetch("/api/acertos")
      .then(async (response) => {
        if (cancelado || !response.ok) return;
        setHistorico(await response.json());
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [reloadToken]);

  const nomePorId = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const p of pessoas) mapa.set(p.id, p.nome);
    return mapa;
  }, [pessoas]);

  function nome(id: string): string {
    return nomePorId.get(id) ?? id;
  }

  function aoRegistrarRepasse() {
    setModalRepasseAberto(false);
    setRepasseRegistrado(true);
    setReloadToken((t) => t + 1);
  }

  if (naoAutenticado) {
    return (
      <p className="text-on-surface-variant">
        Não autenticado — faça login para ver o acerto de contas.
      </p>
    );
  }

  const totalPago = resumo ? totalPagoGeral(resumo.totalPagoPorPessoa) : 0;

  return (
    <div className="gap-lg flex flex-col">
      {erro && (
        <p className="border-danger/30 bg-danger-container p-sm text-on-danger-container rounded-lg border text-sm">
          {erro}
        </p>
      )}

      <div className="gap-md flex flex-wrap items-end justify-end">
        {resumo && resumo.participantes.length > 0 && (
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={() => {
                setRepasseRegistrado(false);
                setModalRepasseAberto(true);
              }}
              className="bg-primary px-md text-on-primary flex items-center gap-1.5 rounded-full py-1.5 text-xs font-semibold hover:opacity-90"
            >
              <IconeChecklist />
              Registrar repasse
            </button>
            {repasseRegistrado && (
              <span className="text-success text-xs">Repasse registrado.</span>
            )}
          </div>
        )}
      </div>

      {modalRepasseAberto && (
        <RegistrarRepasseModal
          pessoas={pessoas.filter((p) => p.tipo === "INDIVIDUAL")}
          onClose={() => setModalRepasseAberto(false)}
          onRegistrado={aoRegistrarRepasse}
        />
      )}

      {buscou && resumo === null && (
        <p className="border-outline-variant bg-surface-container-lowest p-lg text-on-surface-variant rounded-xl border text-sm">
          É preciso cadastrar pelo menos duas pessoas do tipo Individual em{" "}
          <Link
            href="/pessoas"
            className="text-primary font-medium hover:underline"
          >
            Pessoas
          </Link>{" "}
          para calcular o acerto de contas. Uma casa com uma única pessoa não
          tem o que dividir.
        </p>
      )}

      {resumo && (
        <GruposSemComposicaoWarning grupos={resumo.gruposSemComposicao} />
      )}

      {resumo && (
        <>
          <SaldoHeroCard
            participantes={resumo.participantes}
            transferenciasSugeridas={resumo.transferenciasSugeridas}
            nome={nome}
          />

          <div className="gap-md grid grid-cols-1 sm:grid-cols-2">
            {resumo.participantes.map((id) => {
              const pago =
                resumo.totalPagoPorPessoa.find((t) => t.pessoaId === id)
                  ?.totalCentavos ?? 0;
              const percentual = totalPago > 0 ? (pago / totalPago) * 100 : 0;
              return (
                <PessoaProgressoCard
                  key={id}
                  pessoaId={id}
                  nome={nome(id)}
                  pagoCentavos={pago}
                  percentual={percentual}
                />
              );
            })}
          </div>

          {resumo.insight && (
            <p className="text-on-surface-variant text-sm">
              No acumulado, {nome(resumo.insight.pessoaId)} cobriu a maior parte
              das despesas em {resumo.insight.categoriaNome}.
            </p>
          )}

          <HistoricoAcertosList
            historico={historico}
            mostrarCompleto={mostrarHistoricoCompleto}
            onToggleCompleto={() => setMostrarHistoricoCompleto((v) => !v)}
            onRecarregar={() => setReloadToken((t) => t + 1)}
            nome={nome}
          />

          <ControlePagamentoCard reloadToken={reloadToken} />
        </>
      )}
    </div>
  );
}
