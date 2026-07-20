"use client";

import { useMemo, useState } from "react";
import {
  filtroEstaAtivo,
  ordenarLinhas,
  valorPassaFiltro,
  type FiltroColuna,
  type Ordenacao,
  type TipoColunaTabela,
} from "@/lib/domain/tabela";

export type ColunaTabela<T> = {
  chave: string;
  tipo: TipoColunaTabela;
  acessor: (linha: T) => string | number | null;
};

export function useTabela<T>(linhas: T[], colunas: ColunaTabela<T>[]) {
  const [ordenacao, setOrdenacao] = useState<Ordenacao | null>(null);
  const [filtros, setFiltros] = useState<Record<string, FiltroColuna>>({});

  const mapaColunas = useMemo(
    () => new Map(colunas.map((c) => [c.chave, c])),
    [colunas],
  );

  function alternarOrdenacao(chave: string) {
    setOrdenacao((atual) => {
      if (!atual || atual.coluna !== chave)
        return { coluna: chave, direcao: "asc" };
      if (atual.direcao === "asc") return { coluna: chave, direcao: "desc" };
      return null;
    });
  }

  function definirFiltro(chave: string, filtro: FiltroColuna) {
    setFiltros((atual) => ({ ...atual, [chave]: filtro }));
  }

  function limparFiltro(chave: string) {
    setFiltros((atual) => {
      const resto = { ...atual };
      delete resto[chave];
      return resto;
    });
  }

  function limparTodosFiltros() {
    setFiltros({});
  }

  const linhasProcessadas = useMemo(() => {
    let resultado = linhas;
    for (const [chave, filtro] of Object.entries(filtros)) {
      if (!filtroEstaAtivo(filtro)) continue;
      const coluna = mapaColunas.get(chave);
      if (!coluna) continue;
      resultado = resultado.filter((linha) =>
        valorPassaFiltro(coluna.acessor(linha), filtro),
      );
    }
    if (ordenacao) {
      const coluna = mapaColunas.get(ordenacao.coluna);
      if (coluna)
        resultado = ordenarLinhas(resultado, coluna.acessor, ordenacao.direcao);
    }
    return resultado;
  }, [linhas, filtros, ordenacao, mapaColunas]);

  return {
    linhas: linhasProcessadas,
    ordenacao,
    alternarOrdenacao,
    filtros,
    definirFiltro,
    limparFiltro,
    limparTodosFiltros,
  };
}
