"use client";

import { useEffect, useMemo, useState } from "react";
import { useConfirmDialog } from "../components/ConfirmDialog";
import { useTabela, type ColunaTabela } from "../components/useTabela";
import { GraficoTotalPorPessoaEMes } from "./components/GraficoTotalPorPessoaEMes";
import { infoSubtipo } from "./components/Icones";
import { NovoReceitaModal } from "./components/NovoReceitaModal";
import { ReceitasFiltros } from "./components/ReceitasFiltros";
import { ReceitasPeriodoBar } from "./components/ReceitasPeriodoBar";
import { ReceitasTable } from "./components/ReceitasTable";
import { ReceitasTotaisCards } from "./components/ReceitasTotaisCards";
import {
  MESES_INICIAIS,
  cardClass,
  type ModoVisualizacao,
  type Pessoa,
  type Receita,
  type ReceitaInput,
  type SubtipoReceita,
} from "./components/types";
import { reaisParaCentavos } from "@/lib/domain/formatacao";
import {
  dadosGraficoAnual,
  filtrarReceitas,
  formatarMesAno,
  mesParaInputMonth,
  mesesDistintosOrdenados,
  ordenarReceitasPorMesDesc,
  totalPorAno,
  totalPorMes,
} from "@/lib/domain/receitas";

async function parseErro(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  if (typeof body?.error === "string") return body.error;
  return "Não foi possível completar a operação.";
}

export function ReceitasClient() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [receitas, setReceitas] = useState<Receita[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [naoAutenticado, setNaoAutenticado] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const { confirmar, dialog: dialogConfirmacao } = useConfirmDialog();

  const [novaPessoaId, setNovaPessoaId] = useState("");
  const [novoSubtipo, setNovoSubtipo] = useState<SubtipoReceita>("SALARIO");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [novoMes, setNovoMes] = useState("");
  const [modalAberto, setModalAberto] = useState(false);

  const [pessoaFiltro, setPessoaFiltro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [mesesVisiveis, setMesesVisiveis] = useState(MESES_INICIAIS);

  const hoje = new Date();
  const [modo, setModo] = useState<ModoVisualizacao>("mensal");
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);

  function irParaMesAnterior() {
    if (mes === 1) {
      setMes(12);
      setAno((a) => a - 1);
    } else {
      setMes((m) => m - 1);
    }
  }

  function irParaProximoMes() {
    if (mes === 12) {
      setMes(1);
      setAno((a) => a + 1);
    } else {
      setMes((m) => m + 1);
    }
  }

  useEffect(() => {
    setMesesVisiveis(MESES_INICIAIS);
  }, [modo, ano]);

  function carregar() {
    setReloadToken((t) => t + 1);
  }

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let cancelado = false;
    fetch("/api/pessoas")
      .then(async (response) => {
        if (cancelado) return;
        if (response.status === 401) {
          setNaoAutenticado(true);
          return;
        }
        const lista: Pessoa[] = await response.json();
        setPessoas(lista);
        setNovaPessoaId((atual) => atual || (lista[0]?.id ?? ""));
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
    fetch("/api/receitas")
      .then(async (response) => {
        if (cancelado) return;
        if (response.status === 401) {
          setNaoAutenticado(true);
          return;
        }
        setNaoAutenticado(false);
        setReceitas(await response.json());
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar as receitas.");
      });
    return () => {
      cancelado = true;
    };
  }, [reloadToken]);

  const nomePessoa = useMemo(() => {
    const mapa = new Map(pessoas.map((p) => [p.id, p.nome]));
    return (id: string) => mapa.get(id) ?? "—";
  }, [pessoas]);

  const mesSelecionadoStr = `${ano}-${String(mes).padStart(2, "0")}`;

  const totalDoMes = useMemo(
    () => (receitas ? totalPorMes(receitas, mesSelecionadoStr) : 0),
    [receitas, mesSelecionadoStr],
  );

  const totalDoAno = useMemo(
    () => (receitas ? totalPorAno(receitas, ano) : 0),
    [receitas, ano],
  );

  const dadosGrafico = useMemo(
    () => (receitas ? dadosGraficoAnual(receitas, ano) : []),
    [receitas, ano],
  );

  const receitasFiltradas = useMemo(() => {
    if (!receitas) return [];
    return filtrarReceitas(
      receitas,
      { modo, ano, mesSelecionadoStr, pessoaFiltro, busca },
      (r) => [
        r.descricao ?? "",
        infoSubtipo(r.subtipo).label,
        nomePessoa(r.pessoaId),
      ],
    );
  }, [receitas, modo, ano, mesSelecionadoStr, pessoaFiltro, busca, nomePessoa]);

  const receitasOrdenadas = useMemo(
    () => ordenarReceitasPorMesDesc(receitasFiltradas),
    [receitasFiltradas],
  );

  const mesesDistintos = useMemo(
    () => mesesDistintosOrdenados(receitasOrdenadas),
    [receitasOrdenadas],
  );

  const mesesExibidos = new Set(mesesDistintos.slice(0, mesesVisiveis));
  const receitasExibidas = receitasOrdenadas.filter((r) =>
    mesesExibidos.has(mesParaInputMonth(r.mes)),
  );
  const haMaisMeses = modo === "anual" && mesesDistintos.length > mesesVisiveis;

  const colunasReceitas = useMemo<ColunaTabela<Receita>[]>(
    () => [
      {
        chave: "responsavel",
        tipo: "opcoes",
        acessor: (r) => nomePessoa(r.pessoaId),
      },
      {
        chave: "categoria",
        tipo: "opcoes",
        acessor: (r) => infoSubtipo(r.subtipo).label,
      },
      { chave: "descricao", tipo: "texto", acessor: (r) => r.descricao ?? "" },
      {
        chave: "mes",
        tipo: "opcoes",
        acessor: (r) => formatarMesAno(mesParaInputMonth(r.mes)),
      },
      { chave: "valor", tipo: "numero", acessor: (r) => r.valorCentavos / 100 },
    ],
    [nomePessoa],
  );

  const {
    linhas: receitasParaExibir,
    ordenacao,
    alternarOrdenacao,
    filtros,
    definirFiltro,
    limparFiltro,
  } = useTabela(receitasExibidas, colunasReceitas);

  const opcoesColunasReceitas = useMemo(() => {
    const unicos = (valores: string[]) =>
      [...new Set(valores)].sort((a, b) => a.localeCompare(b, "pt-BR"));
    return {
      responsavel: unicos(receitasExibidas.map((r) => nomePessoa(r.pessoaId))),
      categoria: unicos(
        receitasExibidas.map((r) => infoSubtipo(r.subtipo).label),
      ),
      mes: unicos(
        receitasExibidas.map((r) => formatarMesAno(mesParaInputMonth(r.mes))),
      ),
    };
  }, [receitasExibidas, nomePessoa]);

  async function criarReceita(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const response = await fetch("/api/receitas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pessoaId: novaPessoaId,
        subtipo: novoSubtipo,
        descricao: novaDescricao.trim() === "" ? null : novaDescricao,
        valorCentavos: reaisParaCentavos(novoValor),
        mes: `${novoMes}-01`,
      }),
    });
    if (!response.ok) {
      setErro(await parseErro(response));
      return;
    }
    setNovoValor("");
    setNovaDescricao("");
    setToast("Receita salva com sucesso!");
    setModalAberto(false);
    carregar();
  }

  async function atualizarReceita(id: string, input: ReceitaInput) {
    setErro(null);
    const response = await fetch(`/api/receitas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      setErro(await parseErro(response));
      return false;
    }
    carregar();
    return true;
  }

  async function removerReceita(receita: Receita) {
    if (
      !(await confirmar(
        "Remover essa receita? Essa ação não pode ser desfeita.",
      ))
    ) {
      return;
    }
    setErro(null);
    const response = await fetch(`/api/receitas/${receita.id}`, {
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
        Não autenticado — faça login para gerenciar receitas.
      </p>
    );
  }

  return (
    <div className="gap-lg flex flex-col">
      {dialogConfirmacao}

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

      <div className="gap-md flex flex-wrap items-start justify-between">
        <div>
          <h1 className="text-on-surface text-2xl font-bold">Receitas</h1>
          <p className="text-on-surface-variant text-sm">
            Salários, vouchers e outras entradas por pessoa e mês. Gestão
            colaborativa para o nosso lar.
          </p>
        </div>
        <ReceitasTotaisCards
          mes={mes}
          ano={ano}
          totalDoMes={totalDoMes}
          totalDoAno={totalDoAno}
        />
      </div>

      <div className={`${cardClass} p-lg`}>
        <h2 className="mb-md text-on-surface text-base font-bold">
          Total por Pessoa e Mês ({ano})
        </h2>
        {pessoas.length > 0 && receitas ? (
          <GraficoTotalPorPessoaEMes
            dados={dadosGrafico}
            pessoas={pessoas}
            nomePessoa={nomePessoa}
          />
        ) : (
          <p className="text-on-surface-variant text-sm">
            Sem dados suficientes para exibir o gráfico.
          </p>
        )}
      </div>

      <ReceitasPeriodoBar
        modo={modo}
        mes={mes}
        ano={ano}
        onModoChange={setModo}
        onMesAnterior={irParaMesAnterior}
        onProximoMes={irParaProximoMes}
        onAnoAnterior={() => setAno((a) => a - 1)}
        onProximoAno={() => setAno((a) => a + 1)}
        onNovaEntrada={() => setModalAberto(true)}
      />

      {modalAberto && (
        <NovoReceitaModal
          pessoas={pessoas}
          pessoaId={novaPessoaId}
          onPessoaIdChange={setNovaPessoaId}
          subtipo={novoSubtipo}
          onSubtipoChange={setNovoSubtipo}
          descricao={novaDescricao}
          onDescricaoChange={setNovaDescricao}
          valor={novoValor}
          onValorChange={setNovoValor}
          mes={novoMes}
          onMesChange={setNovoMes}
          onFechar={() => setModalAberto(false)}
          onSubmit={criarReceita}
        />
      )}

      <div className={cardClass}>
        <ReceitasFiltros
          pessoas={pessoas}
          pessoaFiltro={pessoaFiltro}
          onPessoaFiltroChange={setPessoaFiltro}
          busca={busca}
          onBuscaChange={setBusca}
          quantidadeEncontrada={receitasFiltradas.length}
        />

        <ReceitasTable
          receitas={receitasParaExibir}
          pessoas={pessoas}
          nomePessoa={nomePessoa}
          onAtualizar={atualizarReceita}
          onRemover={removerReceita}
          opcoesColunas={opcoesColunasReceitas}
          ordenacao={ordenacao}
          alternarOrdenacao={alternarOrdenacao}
          filtros={filtros}
          definirFiltro={definirFiltro}
          limparFiltro={limparFiltro}
        />

        {receitasParaExibir.length === 0 && (
          <p className="p-lg text-on-surface-variant text-sm">
            {receitasExibidas.length === 0
              ? "Nenhuma receita encontrada."
              : "Nenhuma receita corresponde aos filtros das colunas."}
          </p>
        )}

        {haMaisMeses && (
          <button
            type="button"
            onClick={() => setMesesVisiveis((v) => v + MESES_INICIAIS)}
            className="border-outline-variant py-md text-primary hover:bg-surface-container-low w-full border-t text-center text-sm font-semibold"
          >
            Carregar meses anteriores
          </button>
        )}
      </div>
    </div>
  );
}
