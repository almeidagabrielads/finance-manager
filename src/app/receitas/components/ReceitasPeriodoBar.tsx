import { IconePlusCirculo } from "./Icones";
import { NOMES_MES, type ModoVisualizacao } from "./types";

type Props = {
  modo: ModoVisualizacao;
  mes: number;
  ano: number;
  onModoChange: (modo: ModoVisualizacao) => void;
  onMesAnterior: () => void;
  onProximoMes: () => void;
  onAnoAnterior: () => void;
  onProximoAno: () => void;
  onNovaEntrada: () => void;
};

const botaoSetaClass =
  "flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary";

function botaoToggleClass(ativo: boolean) {
  return `rounded-full px-md py-1.5 text-sm font-semibold transition-colors ${
    ativo
      ? "bg-primary text-on-primary"
      : "text-on-surface-variant hover:text-on-surface"
  }`;
}

export function ReceitasPeriodoBar({
  modo,
  mes,
  ano,
  onModoChange,
  onMesAnterior,
  onProximoMes,
  onAnoAnterior,
  onProximoAno,
  onNovaEntrada,
}: Props) {
  return (
    <div className="gap-md flex flex-wrap items-center justify-between">
      <div className="gap-md flex items-center">
        <h2 className="text-on-surface text-lg font-bold">
          {modo === "mensal" ? `${NOMES_MES[mes - 1]} ${ano}` : `Ano de ${ano}`}
        </h2>
        {modo === "mensal" ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onMesAnterior}
              aria-label="Mês anterior"
              className={botaoSetaClass}
            >
              ‹
            </button>
            <button
              onClick={onProximoMes}
              aria-label="Próximo mês"
              className={botaoSetaClass}
            >
              ›
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onAnoAnterior}
              aria-label="Ano anterior"
              className={botaoSetaClass}
            >
              ‹
            </button>
            <button
              onClick={onProximoAno}
              aria-label="Próximo ano"
              className={botaoSetaClass}
            >
              ›
            </button>
          </div>
        )}
      </div>

      <div className="gap-md flex items-center">
        <div className="border-outline-variant bg-surface-container-lowest flex items-center gap-1 rounded-full border p-1">
          <button
            onClick={() => onModoChange("mensal")}
            className={botaoToggleClass(modo === "mensal")}
          >
            Mensal
          </button>
          <button
            onClick={() => onModoChange("anual")}
            className={botaoToggleClass(modo === "anual")}
          >
            Anual
          </button>
        </div>
        <button
          type="button"
          onClick={onNovaEntrada}
          className="bg-primary px-lg text-on-primary flex items-center gap-2 rounded-full py-2.5 text-sm font-semibold hover:opacity-90"
        >
          <IconePlusCirculo /> Registrar Nova Entrada
        </button>
      </div>
    </div>
  );
}
