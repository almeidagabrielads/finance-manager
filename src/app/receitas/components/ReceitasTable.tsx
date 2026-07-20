import { ColumnHeader } from "@/app/components/ColumnHeader";
import type { Ordenacao, FiltroColuna } from "@/lib/domain/tabela";
import { LinhaReceita } from "./LinhaReceita";
import type { Pessoa, Receita, ReceitaInput } from "./types";

type OpcoesColunas = {
  responsavel: string[];
  categoria: string[];
  mes: string[];
};

type Props = {
  receitas: Receita[];
  pessoas: Pessoa[];
  nomePessoa: (id: string) => string;
  onAtualizar: (
    id: string,
    input: ReceitaInput,
  ) => Promise<boolean | undefined>;
  onRemover: (receita: Receita) => Promise<void>;
  opcoesColunas: OpcoesColunas;
  ordenacao: Ordenacao | null;
  alternarOrdenacao: (chave: string) => void;
  filtros: Record<string, FiltroColuna>;
  definirFiltro: (chave: string, filtro: FiltroColuna) => void;
  limparFiltro: (chave: string) => void;
};

export function ReceitasTable({
  receitas,
  pessoas,
  nomePessoa,
  onAtualizar,
  onRemover,
  opcoesColunas,
  ordenacao,
  alternarOrdenacao,
  filtros,
  definirFiltro,
  limparFiltro,
}: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-outline-variant text-on-surface-variant border-y text-xs font-semibold tracking-wide uppercase">
            <ColumnHeader
              label="Responsável"
              chave="responsavel"
              tipo="opcoes"
              opcoes={opcoesColunas.responsavel}
              ordenacao={ordenacao}
              onOrdenar={alternarOrdenacao}
              filtro={filtros.responsavel}
              onFiltrar={definirFiltro}
              onLimparFiltro={limparFiltro}
            />
            <ColumnHeader
              label="Categoria"
              chave="categoria"
              tipo="opcoes"
              opcoes={opcoesColunas.categoria}
              ordenacao={ordenacao}
              onOrdenar={alternarOrdenacao}
              filtro={filtros.categoria}
              onFiltrar={definirFiltro}
              onLimparFiltro={limparFiltro}
            />
            <ColumnHeader
              label="Descrição"
              chave="descricao"
              tipo="texto"
              ordenacao={ordenacao}
              onOrdenar={alternarOrdenacao}
              filtro={filtros.descricao}
              onFiltrar={definirFiltro}
              onLimparFiltro={limparFiltro}
            />
            <ColumnHeader
              label="Mês"
              chave="mes"
              tipo="opcoes"
              opcoes={opcoesColunas.mes}
              ordenacao={ordenacao}
              onOrdenar={alternarOrdenacao}
              filtro={filtros.mes}
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
          {receitas.map((receita) => (
            <LinhaReceita
              key={receita.id}
              receita={receita}
              pessoas={pessoas}
              nomePessoa={nomePessoa}
              onAtualizar={onAtualizar}
              onRemover={onRemover}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
