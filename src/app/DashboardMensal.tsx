"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { unicosPorId } from "@/lib/dedupe";
import {
  agregarCategoriasDoMes,
  valorAtribuidoPorPessoa,
  type PlanejadoVsRealCategoria,
} from "@/lib/domain/dashboardMensal";
import { Select } from "./components/Select";
import { AcertoContasCard } from "./components/dashboard-mensal/AcertoContasCard";
import { OrcamentoMesCard } from "./components/dashboard-mensal/OrcamentoMesCard";
import { ResumoMesCard } from "./components/dashboard-mensal/ResumoMesCard";
import { TransacoesRecentesCard } from "./components/dashboard-mensal/TransacoesRecentesCard";

type SaldoMensal = {
  mes: number;
  receitaCentavos: number;
  despesaCentavos: number;
  saldoCentavos: number;
};

type SaldoAnual = {
  ano: number;
  receitaCentavos: number;
  despesaCentavos: number;
  saldoCentavos: number;
  porMes: SaldoMensal[];
};

type Transferencia = { deId: string; paraId: string; valorCentavos: number };
type SaldoDivisaoGrupo = {
  participantes: string[];
  transferenciasSugeridas: Transferencia[];
};

type Lancamento = {
  id: string;
  data: string;
  descricaoOrigem: string | null;
  descricaoPropria: string | null;
  valorCentavos: number;
  descontoCentavos: number;
  pessoaDivisaoId: string;
  pessoaPagouId: string;
};

type Pessoa = {
  id: string;
  nome: string;
  tipo: string;
  integrantesDoGrupo: { pessoaId: string; peso: number }[];
};
type Categoria = { id: string; nome: string };

function primeiroEUltimoDiaDoMes(
  ano: number,
  mes: number,
): { inicio: string; fim: string } {
  const inicio = new Date(Date.UTC(ano, mes - 1, 1)).toISOString().slice(0, 10);
  const fim = new Date(Date.UTC(ano, mes, 0)).toISOString().slice(0, 10);
  return { inicio, fim };
}

export function DashboardMensal({ ano, mes }: { ano: number; mes: number }) {
  const [saldo, setSaldo] = useState<SaldoAnual | null>(null);
  const [divisao, setDivisao] = useState<SaldoDivisaoGrupo | null>(null);
  const [divisaoCarregada, setDivisaoCarregada] = useState(false);
  const [orcamento, setOrcamento] = useState<PlanejadoVsRealCategoria[] | null>(
    null,
  );
  const [lancamentos, setLancamentos] = useState<Lancamento[] | null>(null);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [naoAutenticado, setNaoAutenticado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pessoaFiltro, setPessoaFiltro] = useState("");

  useEffect(() => {
    let cancelado = false;
    const { inicio, fim } = primeiroEUltimoDiaDoMes(ano, mes);
    const pessoaQuery = pessoaFiltro ? `&pessoaId=${pessoaFiltro}` : "";

    Promise.all([
      fetch(`/api/relatorios/saldo?ano=${ano}${pessoaQuery}`),
      // Acumulado de todo o período registrado até o fim do mês selecionado
      // (não só o mês em si) — dívidas de meses anteriores continuam
      // aparecendo até serem quitadas.
      fetch(`/api/relatorios/divisao?dataFim=${fim}`),
      fetch(`/api/relatorios/planejado-vs-real?ano=${ano}${pessoaQuery}`),
      fetch(
        `/api/lancamentos?dataInicio=${inicio}&dataFim=${fim}${pessoaQuery}`,
      ),
      fetch("/api/pessoas"),
      fetch("/api/categorias"),
    ])
      .then(async (responses) => {
        if (cancelado) return;
        const [
          saldoRes,
          divisaoRes,
          orcamentoRes,
          lancamentosRes,
          pessoasRes,
          categoriasRes,
        ] = responses;

        if (
          saldoRes.status === 401 ||
          orcamentoRes.status === 401 ||
          lancamentosRes.status === 401 ||
          pessoasRes.status === 401 ||
          categoriasRes.status === 401
        ) {
          setNaoAutenticado(true);
          return;
        }

        setSaldo(saldoRes.ok ? await saldoRes.json() : null);
        setOrcamento(orcamentoRes.ok ? await orcamentoRes.json() : []);
        setLancamentos(
          unicosPorId(lancamentosRes.ok ? await lancamentosRes.json() : []),
        );
        setPessoas(unicosPorId(pessoasRes.ok ? await pessoasRes.json() : []));
        setCategorias(
          unicosPorId(categoriasRes.ok ? await categoriasRes.json() : []),
        );

        setDivisao(divisaoRes.ok ? await divisaoRes.json() : null);
        setDivisaoCarregada(true);
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar a visão geral.");
      });

    return () => {
      cancelado = true;
    };
  }, [ano, mes, pessoaFiltro]);

  if (naoAutenticado) {
    return (
      <p className="text-on-surface-variant">
        Não autenticado —{" "}
        <Link
          href="/login"
          className="text-primary font-medium hover:underline"
        >
          faça login
        </Link>{" "}
        para ver a visão geral.
      </p>
    );
  }

  const nomePessoa = (id: string) =>
    pessoas.find((p) => p.id === id)?.nome ?? "—";
  const nomeCategoria = (id: string | null) =>
    categorias.find((c) => c.id === id)?.nome ?? "Sem categoria";

  const saldoDoMes = saldo?.porMes.find((m) => m.mes === mes) ?? null;

  const {
    categorias: categoriasOrcamento,
    totalPlanejadoCentavos,
    totalRealCentavos,
  } = agregarCategoriasDoMes(orcamento ?? [], mes);

  const transacoesRecentes = (lancamentos ?? []).slice(0, 5);

  return (
    <div className="gap-lg flex flex-col">
      <div className="flex items-center gap-2">
        <label
          htmlFor="pessoaFiltro"
          className="text-on-surface-variant text-xs font-semibold tracking-wide uppercase"
        >
          Visualizando
        </label>
        <Select
          id="pessoaFiltro"
          value={pessoaFiltro}
          onChange={setPessoaFiltro}
          options={[
            { value: "", label: "Geral" },
            ...pessoas.map((p) => ({ value: p.id, label: p.nome })),
          ]}
        />
      </div>

      {erro && (
        <p className="border-danger/30 bg-danger-container p-sm text-on-danger-container rounded-lg border text-sm">
          {erro}
        </p>
      )}

      <div className="gap-md grid grid-cols-1 lg:grid-cols-3">
        <ResumoMesCard
          receitaCentavos={saldoDoMes?.receitaCentavos ?? null}
          despesaCentavos={saldoDoMes?.despesaCentavos ?? null}
          saldoCentavos={saldoDoMes?.saldoCentavos ?? null}
        />
        <AcertoContasCard
          carregada={divisaoCarregada}
          divisao={divisao}
          nomePessoa={nomePessoa}
        />
      </div>

      <div className="gap-md grid grid-cols-1 lg:grid-cols-3">
        <OrcamentoMesCard
          categorias={categoriasOrcamento}
          totalPlanejadoCentavos={totalPlanejadoCentavos}
          totalRealCentavos={totalRealCentavos}
          nomeCategoria={nomeCategoria}
        />
        <TransacoesRecentesCard
          lancamentos={transacoesRecentes}
          nomePessoa={nomePessoa}
          valorAtribuido={(l) =>
            valorAtribuidoPorPessoa(l, pessoas, pessoaFiltro)
          }
        />
      </div>
    </div>
  );
}
