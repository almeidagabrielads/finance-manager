import { IconeBusca } from "./Icones";
import { inputClass, type Pessoa } from "./types";

type Props = {
  pessoas: Pessoa[];
  pessoaFiltro: string | null;
  onPessoaFiltroChange: (pessoaId: string | null) => void;
  busca: string;
  onBuscaChange: (busca: string) => void;
  quantidadeEncontrada: number;
};

export function ReceitasFiltros({
  pessoas,
  pessoaFiltro,
  onPessoaFiltroChange,
  busca,
  onBuscaChange,
  quantidadeEncontrada,
}: Props) {
  return (
    <div className="gap-md p-lg pb-md flex flex-wrap items-center justify-between">
      <div className="flex items-center gap-2">
        <h2 className="text-on-surface text-base font-bold">
          Extrato Detalhado
        </h2>
        <span className="bg-surface-container px-sm text-on-surface-variant rounded-full py-0.5 text-xs font-semibold">
          {quantidadeEncontrada}{" "}
          {quantidadeEncontrada === 1 ? "item encontrado" : "itens encontrados"}
        </span>
      </div>
      <div className="gap-sm flex flex-wrap items-center">
        <div className="border-outline-variant flex rounded-full border p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => onPessoaFiltroChange(null)}
            className={`px-sm rounded-full py-1 transition-colors ${
              pessoaFiltro === null
                ? "bg-surface-container-high text-on-surface"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Todos
          </button>
          {pessoas.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPessoaFiltroChange(p.id)}
              className={`px-sm rounded-full py-1 transition-colors ${
                pessoaFiltro === p.id
                  ? "bg-surface-container-high text-on-surface"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {p.nome}
            </button>
          ))}
        </div>
        <div className="relative">
          <span className="text-on-surface-variant pointer-events-none absolute top-1/2 left-2 -translate-y-1/2">
            <IconeBusca />
          </span>
          <input
            placeholder="Pesquisar descrição..."
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            className={`w-56 pl-8 ${inputClass}`}
          />
        </div>
      </div>
    </div>
  );
}
