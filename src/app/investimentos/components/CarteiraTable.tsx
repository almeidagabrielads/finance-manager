"use client";

import { Fragment } from "react";
import { Check, Pencil, ChevronRight } from "lucide-react";
import { Badge } from "../../components/Badge";
import { ColumnHeader } from "../../components/ColumnHeader";
import type { FiltroColuna, Ordenacao } from "@/lib/domain/tabela";
import { PosicaoMensalInline } from "./PosicaoMensalInline";
import {
  labelTipo,
  formatarReais,
  labelVencimento,
  type Banco,
  type Investimento,
  type Pessoa,
} from "../InvestimentosClient";

function IconeFinalizar() {
  return <Check className="h-4 w-4" />;
}

function IconeEditar() {
  return <Pencil className="h-4 w-4" />;
}

function IconeChevron({ aberto }: { aberto: boolean }) {
  return (
    <ChevronRight
      className={`text-on-surface-variant h-4 w-4 shrink-0 transition-transform ${aberto ? "rotate-90" : ""}`}
    />
  );
}

type PosicaoMensal = {
  investimentoId: string;
  mes: string;
  valorCentavos: number;
};

type Props = {
  investimentos: Investimento[];
  bancos: Banco[];
  pessoas: Pessoa[];
  ordenacao: Ordenacao | null;
  alternarOrdenacao: (chave: string) => void;
  filtros: Record<string, FiltroColuna>;
  definirFiltro: (chave: string, filtro: FiltroColuna) => void;
  limparFiltro: (chave: string) => void;
  opcoesColunas: { banco: string[]; tipo: string[]; titular: string[] };
  investimentoExpandidoId: string | null;
  onToggleExpandir: (id: string | null) => void;
  anoPosicoes: number;
  posicoesMensais: PosicaoMensal[];
  onPosicaoAlterada: () => void;
  onEditar: (inv: Investimento) => void;
  onFinalizar: (inv: Investimento) => void;
};

export function CarteiraTable({
  investimentos,
  bancos,
  pessoas,
  ordenacao,
  alternarOrdenacao,
  filtros,
  definirFiltro,
  limparFiltro,
  opcoesColunas,
  investimentoExpandidoId,
  onToggleExpandir,
  anoPosicoes,
  posicoesMensais,
  onPosicaoAlterada,
  onEditar,
  onFinalizar,
}: Props) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-outline-variant text-on-surface-variant border-y text-xs font-semibold tracking-wide uppercase">
              <th className="p-md text-left"></th>
              <ColumnHeader
                label="Banco"
                chave="banco"
                tipo="opcoes"
                opcoes={opcoesColunas.banco}
                ordenacao={ordenacao}
                onOrdenar={alternarOrdenacao}
                filtro={filtros.banco}
                onFiltrar={definirFiltro}
                onLimparFiltro={limparFiltro}
              />
              <ColumnHeader
                label="Tipo"
                chave="tipo"
                tipo="opcoes"
                opcoes={opcoesColunas.tipo}
                ordenacao={ordenacao}
                onOrdenar={alternarOrdenacao}
                filtro={filtros.tipo}
                onFiltrar={definirFiltro}
                onLimparFiltro={limparFiltro}
              />
              <ColumnHeader
                label="Produto"
                chave="produto"
                tipo="texto"
                ordenacao={ordenacao}
                onOrdenar={alternarOrdenacao}
                filtro={filtros.produto}
                onFiltrar={definirFiltro}
                onLimparFiltro={limparFiltro}
              />
              <ColumnHeader
                label="Titular"
                chave="titular"
                tipo="opcoes"
                opcoes={opcoesColunas.titular}
                ordenacao={ordenacao}
                onOrdenar={alternarOrdenacao}
                filtro={filtros.titular}
                onFiltrar={definirFiltro}
                onLimparFiltro={limparFiltro}
              />
              <ColumnHeader
                label="Vencimento/liquidez"
                chave="vencimento"
                tipo="texto"
                ordenacao={ordenacao}
                onOrdenar={alternarOrdenacao}
                filtro={filtros.vencimento}
                onFiltrar={definirFiltro}
                onLimparFiltro={limparFiltro}
              />
              <ColumnHeader
                label="Valor"
                chave="valor"
                tipo="numero"
                align="right"
                ordenacao={ordenacao}
                onOrdenar={alternarOrdenacao}
                filtro={filtros.valor}
                onFiltrar={definirFiltro}
                onLimparFiltro={limparFiltro}
              />
              <th className="p-md text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {investimentos.map((inv) => {
              const banco = bancos.find((b) => b.id === inv.bancoId);
              const pessoa = pessoas.find((p) => p.id === inv.pessoaId);
              const expandido = investimentoExpandidoId === inv.id;
              return (
                <Fragment key={inv.id}>
                  <tr
                    onClick={() => onToggleExpandir(expandido ? null : inv.id)}
                    aria-expanded={expandido}
                    className="border-outline-variant/60 hover:bg-surface-container-low cursor-pointer border-b"
                  >
                    <td className="p-md">
                      <IconeChevron aberto={expandido} />
                    </td>
                    <td className="p-md text-on-surface-variant">
                      {banco?.nome ?? "—"}
                    </td>
                    <td className="p-md text-on-surface-variant">
                      {labelTipo(inv.tipo)}
                    </td>
                    <td className="p-md">
                      <div className="text-on-surface flex items-center gap-2 font-medium">
                        {inv.produto}
                        {inv.status === "FINALIZADO" && (
                          <Badge
                            variant="neutral-high"
                            size="2xs"
                            className="uppercase"
                          >
                            Finalizado
                          </Badge>
                        )}
                      </div>
                      {inv.observacao && (
                        <div className="text-on-surface-variant text-xs">
                          {inv.observacao}
                        </div>
                      )}
                    </td>
                    <td className="p-md text-on-surface-variant">
                      {pessoa?.nome ?? "—"}
                    </td>
                    <td className="p-md text-on-surface-variant whitespace-nowrap">
                      {labelVencimento(inv)}
                    </td>
                    <td className="data-tabular p-md text-right font-medium">
                      {formatarReais(inv.valorAtualCentavos)}
                    </td>
                    <td className="p-md">
                      <div className="flex justify-end gap-1">
                        <button
                          className="text-on-surface-variant hover:bg-surface-container-high rounded-full p-1.5 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditar(inv);
                          }}
                          title="Editar"
                          aria-label="Editar"
                        >
                          <IconeEditar />
                        </button>
                        {inv.status === "ATIVO" && (
                          <button
                            className="text-primary hover:bg-primary-container rounded-full p-1.5 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              onFinalizar(inv);
                            }}
                            title="Finalizar"
                            aria-label="Finalizar"
                          >
                            <IconeFinalizar />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandido && (
                    <tr className="border-outline-variant/60 bg-surface-container-low border-b">
                      <td colSpan={8} className="p-0">
                        <PosicaoMensalInline
                          investimentoId={inv.id}
                          ano={anoPosicoes}
                          posicoes={posicoesMensais}
                          onAlterado={onPosicaoAlterada}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {investimentos.length === 0 && (
        <p className="p-lg text-on-surface-variant text-sm">
          Nenhum investimento corresponde aos filtros das colunas.
        </p>
      )}
    </>
  );
}
