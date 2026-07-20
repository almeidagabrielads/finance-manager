import type { FormEvent } from "react";
import { formatarReais } from "./formatoAnual";

type SaldoAnoAnterior = {
  origem: "sistema" | "manual";
  saldoCentavos: number;
} | null;

type Props = {
  ano: number;
  saldoAnoAnterior: SaldoAnoAnterior;
  saldoAcumuladoCentavos: number;
  editando: boolean;
  inputValor: string;
  salvando: boolean;
  onEditar: () => void;
  onCancelar: () => void;
  onChangeInput: (valor: string) => void;
  onSubmit: (e: FormEvent) => void;
};

export function SaldoAnoAnteriorForm({
  ano,
  saldoAnoAnterior,
  saldoAcumuladoCentavos,
  editando,
  inputValor,
  salvando,
  onEditar,
  onCancelar,
  onChangeInput,
  onSubmit,
}: Props) {
  return (
    <div className="gap-sm border-outline-variant bg-surface-container-lowest p-lg flex flex-col rounded-xl border shadow-sm">
      <h2 className="text-on-surface text-base font-semibold">
        Saldo do ano anterior ({ano - 1})
      </h2>
      {saldoAnoAnterior && !editando ? (
        <div className="gap-md flex flex-wrap items-end justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <p className="data-tabular text-on-surface text-xl font-bold">
                {formatarReais(saldoAnoAnterior.saldoCentavos)}
              </p>
              <button
                type="button"
                onClick={onEditar}
                title="Editar saldo do ano anterior"
                aria-label="Editar saldo do ano anterior"
                className="text-primary hover:bg-primary/10 rounded-full p-1 transition-colors"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  <path d="m15 5 4 4" />
                </svg>
              </button>
            </div>
            <span className="text-on-surface-variant text-xs">
              {saldoAnoAnterior.origem === "sistema"
                ? "Calculado a partir dos lançamentos registrados"
                : "Informado manualmente"}
            </span>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <p className="text-on-surface-variant text-sm">Saldo acumulado</p>
            <p
              className={`data-tabular text-xl font-bold ${
                saldoAcumuladoCentavos >= 0 ? "text-success" : "text-danger"
              }`}
            >
              {formatarReais(saldoAcumuladoCentavos)}
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="gap-sm flex flex-wrap items-end">
          {!saldoAnoAnterior && (
            <p className="text-on-surface-variant w-full text-sm">
              Nenhum lançamento encontrado para {ano - 1}. Informe o saldo de
              fechamento desse ano para acumular com o saldo de {ano}.
            </p>
          )}
          <div className="flex flex-col gap-1">
            <label
              className="text-on-surface-variant text-xs font-semibold"
              htmlFor="saldo-ano-anterior"
            >
              Saldo de fechamento de {ano - 1} (R$)
            </label>
            <input
              id="saldo-ano-anterior"
              type="number"
              step="0.01"
              className="border-outline-variant bg-surface-container-lowest px-sm w-40 rounded-lg border py-1.5 text-sm"
              value={inputValor}
              onChange={(e) => onChangeInput(e.target.value)}
              required
              autoFocus={editando}
            />
          </div>
          <button
            type="submit"
            disabled={salvando}
            className="bg-primary px-md text-on-primary rounded-full py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
          >
            Salvar
          </button>
          {saldoAnoAnterior && (
            <button
              type="button"
              onClick={onCancelar}
              className="text-on-surface-variant px-md py-1.5 text-xs font-semibold"
            >
              Cancelar
            </button>
          )}
        </form>
      )}
    </div>
  );
}
