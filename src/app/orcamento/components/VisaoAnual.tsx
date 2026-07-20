"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { unicosPorChave } from "@/lib/dedupe";
import { reaisParaCentavos } from "@/lib/domain/formatacao";
import { totalAnualCategoria as somarTotalAnualCategoria } from "@/lib/domain/orcamento";
import { LinhaOrcamento } from "./LinhaOrcamento";
import {
  MESES,
  agruparPorSubcategoria,
  chave,
  chaveCategoria,
  parseErro,
  type Categoria,
  type OrcamentoItem,
  type Pessoa,
  type PlanejadoVsRealCategoria,
} from "./types";

type Props = {
  ano: number;
  pessoaFiltro: string;
  editavel: boolean;
  categorias: Categoria[] | null;
  pessoas: Pessoa[];
  setErro: (msg: string | null) => void;
};

export function VisaoAnual({
  ano,
  pessoaFiltro,
  editavel,
  categorias,
  pessoas,
  setErro,
}: Props) {
  const [orcamentos, setOrcamentos] = useState<OrcamentoItem[] | null>(null);
  const [dados, setDados] = useState<PlanejadoVsRealCategoria[] | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  function recarregar() {
    setReloadToken((t) => t + 1);
  }

  useEffect(() => {
    let cancelado = false;
    const pessoaQuery = pessoaFiltro === "" ? "" : `&pessoaId=${pessoaFiltro}`;
    fetch(`/api/orcamentos?ano=${ano}${pessoaQuery}`)
      .then(async (response) => {
        if (cancelado) return;
        if (!response.ok) {
          if (response.status !== 401)
            setErro("Não foi possível carregar o orçamento.");
          return;
        }
        setOrcamentos(await response.json());
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar o orçamento.");
      });
    return () => {
      cancelado = true;
    };
  }, [ano, pessoaFiltro, reloadToken, setErro]);

  useEffect(() => {
    let cancelado = false;
    const pessoaQuery = pessoaFiltro === "" ? "" : `&pessoaId=${pessoaFiltro}`;
    fetch(`/api/relatorios/planejado-vs-real?ano=${ano}${pessoaQuery}`)
      .then(async (response) => {
        if (cancelado) return;
        if (!response.ok) {
          if (response.status !== 401) {
            setErro("Não foi possível carregar o planejado vs. real.");
          }
          return;
        }
        setDados(
          unicosPorChave(await response.json(), (r: PlanejadoVsRealCategoria) =>
            chaveCategoria(r.categoriaId, r.subcategoriaId),
          ),
        );
      })
      .catch(() => {
        if (!cancelado)
          setErro("Não foi possível carregar o planejado vs. real.");
      });
    return () => {
      cancelado = true;
    };
  }, [ano, pessoaFiltro, reloadToken, setErro]);

  const mapaOrcamentos = useMemo(() => {
    const mapa = new Map<string, OrcamentoItem>();
    for (const o of orcamentos ?? []) {
      mapa.set(chave(o.categoriaId, o.subcategoriaId, o.mes), o);
    }
    return mapa;
  }, [orcamentos]);

  const itensPorSubcategoria = useMemo(
    () => agruparPorSubcategoria(orcamentos ?? []),
    [orcamentos],
  );

  const mapaDados = useMemo(() => {
    const mapa = new Map<string, PlanejadoVsRealCategoria>();
    for (const c of dados ?? []) {
      mapa.set(chaveCategoria(c.categoriaId, c.subcategoriaId), c);
    }
    return mapa;
  }, [dados]);

  function totalAnualSubcategoria(
    categoriaId: string,
    subcategoriaId: string | null,
  ): number {
    return (
      mapaDados.get(chaveCategoria(categoriaId, subcategoriaId))?.acumulado
        .planejadoCentavos ?? 0
    );
  }

  function totalAnualCategoria(categoria: Categoria): number {
    return somarTotalAnualCategoria(
      totalAnualSubcategoria(categoria.id, null),
      categoria.subcategorias.map((sub) =>
        totalAnualSubcategoria(categoria.id, sub.id),
      ),
    );
  }

  function valorVigenteMes(
    categoriaId: string,
    subcategoriaId: string | null,
    mes: number,
  ): number {
    return (
      mapaDados
        .get(chaveCategoria(categoriaId, subcategoriaId))
        ?.meses.find((m) => m.mes === mes)?.planejadoCentavos ?? 0
    );
  }

  async function salvarCelula(
    categoriaId: string,
    subcategoriaId: string | null,
    mes: number,
    valorTexto: string,
    divisaoIdSelecionada: string | null,
    tipoGastoSelecionado: string,
    valorVigenteAntes: number,
    divisaoIdAntes: string | null,
    tipoGastoAntes: string,
  ) {
    setErro(null);
    const existente = mapaOrcamentos.get(
      chave(categoriaId, subcategoriaId, mes),
    );
    const valorCentavos =
      valorTexto.trim() === "" ? 0 : reaisParaCentavos(valorTexto);

    // Sem edição real: os três campos só exibiam o que já está vigente (mês
    // anterior ou limite sugerido da subcategoria), nada foi de fato
    // alterado.
    if (
      !existente &&
      valorCentavos === valorVigenteAntes &&
      divisaoIdSelecionada === divisaoIdAntes &&
      tipoGastoSelecionado === tipoGastoAntes
    ) {
      return;
    }

    // Campo de valor limpo (voltar a herdar o vigente): remove a entrada
    // específica deste mês, se houver — divisão/tipo do mês somem junto.
    if (existente && valorTexto.trim() === "") {
      const response = await fetch(`/api/orcamentos/${existente.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setErro(await parseErro(response));
        return;
      }
      recarregar();
      return;
    }

    if (existente) {
      if (
        existente.valorCentavos === valorCentavos &&
        existente.divisaoId === divisaoIdSelecionada &&
        existente.tipoGasto === tipoGastoSelecionado
      ) {
        return;
      }
      const response = await fetch(`/api/orcamentos/${existente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valorCentavos,
          divisaoId: divisaoIdSelecionada,
          tipoGasto: tipoGastoSelecionado,
        }),
      });
      if (!response.ok) {
        setErro(await parseErro(response));
        return;
      }
      recarregar();
      return;
    }

    // Novo valor a partir deste mês, inclusive zero (override explícito que
    // suprime o valor vigente/limite sugerido para este mês em diante).
    const response = await fetch("/api/orcamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pessoaId: pessoaFiltro,
        categoriaId,
        subcategoriaId,
        mes,
        ano,
        valorCentavos,
        divisaoId: divisaoIdSelecionada,
        tipoGasto: tipoGastoSelecionado,
      }),
    });
    if (!response.ok) {
      setErro(await parseErro(response));
      return;
    }
    recarregar();
  }

  return (
    <div className="gap-lg flex flex-col">
      <p className="text-on-surface-variant text-sm">
        O valor definido em um mês vale para ele e para os meses seguintes, até
        você definir um novo valor. A coluna Anual é somente uma visualização do
        total do ano.
      </p>
      <div className="border-outline-variant bg-surface-container-lowest overflow-x-auto rounded-xl border">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-outline-variant text-on-surface-variant border-b text-xs font-semibold tracking-wide uppercase">
              <th className="bg-surface-container-lowest sticky left-0 p-2 text-left">
                Categoria / Subcategoria
              </th>
              {MESES.map((m) => (
                <th key={m} className="p-2 text-right">
                  {m}
                </th>
              ))}
              <th className="p-2 text-right">Anual</th>
            </tr>
          </thead>
          <tbody>
            {categorias?.map((categoria) => (
              <Fragment key={categoria.id}>
                <LinhaOrcamento
                  label={categoria.nome}
                  categoriaId={categoria.id}
                  subcategoriaId={null}
                  mapaOrcamentos={mapaOrcamentos}
                  itensPorSubcategoria={itensPorSubcategoria}
                  valorVigenteMes={valorVigenteMes}
                  totalAnual={totalAnualCategoria(categoria)}
                  onSalvar={salvarCelula}
                  editavel={editavel}
                  pessoas={pessoas}
                  destaque
                />
                {categoria.subcategorias.map((sub) => (
                  <LinhaOrcamento
                    key={sub.id}
                    label={sub.nome}
                    categoriaId={categoria.id}
                    subcategoriaId={sub.id}
                    mapaOrcamentos={mapaOrcamentos}
                    itensPorSubcategoria={itensPorSubcategoria}
                    valorVigenteMes={valorVigenteMes}
                    totalAnual={totalAnualSubcategoria(categoria.id, sub.id)}
                    onSalvar={salvarCelula}
                    editavel={editavel}
                    pessoas={pessoas}
                  />
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {categorias?.length === 0 && (
        <p className="text-on-surface-variant text-sm">
          Nenhuma categoria cadastrada — crie categorias antes de definir o
          orçamento.
        </p>
      )}
    </div>
  );
}
