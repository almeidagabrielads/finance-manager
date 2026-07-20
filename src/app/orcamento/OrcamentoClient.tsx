"use client";

import { useEffect, useState } from "react";
import { unicosPorId } from "@/lib/dedupe";
import { Select } from "../components/Select";
import { VisaoAnual } from "./components/VisaoAnual";
import { VisaoMesAtual } from "./components/VisaoMesAtual";
import {
  MESES_LONGOS,
  TOTAL_CASA,
  deslocarMes,
  somenteAtivas,
  type Categoria,
  type Pessoa,
} from "./components/types";

type Aba = "mes" | "anual";

export function OrcamentoClient() {
  const hoje = new Date();
  const anoAtual = hoje.getUTCFullYear();
  const mesAtual = hoje.getUTCMonth() + 1;

  const [aba, setAba] = useState<Aba>("mes");
  const [ano, setAno] = useState(anoAtual);
  const [mes, setMes] = useState(mesAtual);
  const [pessoaFiltro, setPessoaFiltro] = useState<string>(TOTAL_CASA);
  const [categorias, setCategorias] = useState<Categoria[] | null>(null);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [naoAutenticado, setNaoAutenticado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      fetch("/api/categorias").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/pessoas").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([cats, pes]) => {
        if (cancelado) return;
        if (cats === null || pes === null) {
          setNaoAutenticado(true);
          return;
        }
        setNaoAutenticado(false);
        setCategorias(somenteAtivas(unicosPorId(cats)));
        setPessoas(unicosPorId(pes));
      })
      .catch(() => {
        if (!cancelado)
          setErro("Não foi possível carregar categorias/pessoas.");
      });
    return () => {
      cancelado = true;
    };
  }, []);

  if (naoAutenticado) {
    return (
      <p className="text-on-surface-variant">
        Não autenticado — faça login para gerenciar o orçamento.
      </p>
    );
  }

  const pessoaSelecionada = pessoas.find((p) => p.id === pessoaFiltro);
  const editavel =
    pessoaFiltro !== TOTAL_CASA && pessoaSelecionada?.tipo === "INDIVIDUAL";

  const abaClass = (ativo: boolean) =>
    `px-md py-sm text-sm font-semibold border-b-2 transition-colors ${
      ativo
        ? "border-primary text-primary"
        : "border-transparent text-on-surface-variant hover:text-primary"
    }`;

  return (
    <div className="gap-lg flex flex-col">
      {erro && (
        <p className="border-danger/30 bg-danger-container p-sm text-on-danger-container rounded-lg border text-sm">
          {erro}
        </p>
      )}

      {aba !== "mes" && (
        <h1 className="text-on-surface text-2xl font-bold">Orçamento</h1>
      )}

      <div className="border-outline-variant flex gap-1 border-b">
        <button
          className={abaClass(aba === "mes")}
          onClick={() => setAba("mes")}
        >
          Mês Atual
        </button>
        <button
          className={abaClass(aba === "anual")}
          onClick={() => setAba("anual")}
        >
          Visão Anual
        </button>
      </div>

      <div className="gap-md flex flex-wrap items-end justify-between">
        <div className="flex flex-col gap-1">
          <label
            className="text-on-surface-variant text-xs font-semibold"
            htmlFor="pessoa"
          >
            Pessoa/grupo
          </label>
          <Select
            id="pessoa"
            value={pessoaFiltro}
            onChange={setPessoaFiltro}
            options={[
              { value: TOTAL_CASA, label: "Total (casa toda)" },
              ...pessoas.map((p) => ({ value: p.id, label: p.nome })),
            ]}
          />
          {!editavel && (
            <span className="text-on-surface-variant text-xs">
              Somatório dos integrantes — somente leitura. Selecione uma pessoa
              para editar.
            </span>
          )}
        </div>

        {aba === "mes" && (
          <div className="gap-sm flex items-center">
            <button
              aria-label="Mês anterior"
              className="border-outline-variant text-on-surface-variant hover:border-primary flex h-8 w-8 items-center justify-center rounded-full border"
              onClick={() => {
                const d = deslocarMes(ano, mes, -1);
                setAno(d.ano);
                setMes(d.mes);
              }}
            >
              ‹
            </button>
            <div className="border-outline-variant bg-surface-container-lowest flex overflow-hidden rounded-full border p-0.5">
              <span className="bg-primary text-on-primary px-md rounded-full py-1.5 text-sm font-semibold">
                {MESES_LONGOS[mes - 1]} {ano}
              </span>
              <button
                className="text-on-surface-variant hover:text-primary px-md py-1.5 text-sm font-medium"
                onClick={() => {
                  const d = deslocarMes(ano, mes, 1);
                  setAno(d.ano);
                  setMes(d.mes);
                }}
              >
                {(() => {
                  const d = deslocarMes(ano, mes, 1);
                  return `${MESES_LONGOS[d.mes - 1]} ${d.ano}`;
                })()}
              </button>
            </div>
            <button
              aria-label="Próximo mês"
              className="border-outline-variant text-on-surface-variant hover:border-primary flex h-8 w-8 items-center justify-center rounded-full border"
              onClick={() => {
                const d = deslocarMes(ano, mes, 1);
                setAno(d.ano);
                setMes(d.mes);
              }}
            >
              ›
            </button>
          </div>
        )}

        {aba === "anual" && (
          <div className="flex flex-col gap-1">
            <label
              className="text-on-surface-variant text-xs font-semibold"
              htmlFor="ano"
            >
              Ano
            </label>
            <input
              id="ano"
              type="number"
              className="border-outline-variant bg-surface-container-lowest w-24 rounded-lg border px-2 py-1"
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
            />
          </div>
        )}
      </div>

      {aba === "mes" && (
        <VisaoMesAtual
          ano={ano}
          mes={mes}
          pessoaFiltro={pessoaFiltro}
          editavel={!!editavel}
          categorias={categorias}
          pessoas={pessoas}
          setErro={setErro}
        />
      )}
      {aba === "anual" && (
        <VisaoAnual
          ano={ano}
          pessoaFiltro={pessoaFiltro}
          editavel={!!editavel}
          categorias={categorias}
          pessoas={pessoas}
          setErro={setErro}
        />
      )}
    </div>
  );
}
