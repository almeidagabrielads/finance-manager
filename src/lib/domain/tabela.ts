export type TipoColunaTabela = "texto" | "numero" | "data" | "opcoes";

export type Ordenacao = { coluna: string; direcao: "asc" | "desc" };

export type FiltroColuna =
  | { tipo: "texto"; valor: string }
  | { tipo: "numero"; min: string; max: string }
  | { tipo: "data"; de: string; ate: string }
  | { tipo: "opcoes"; selecionadas: string[] };

export function filtroVazio(tipo: TipoColunaTabela): FiltroColuna {
  switch (tipo) {
    case "texto":
      return { tipo: "texto", valor: "" };
    case "numero":
      return { tipo: "numero", min: "", max: "" };
    case "data":
      return { tipo: "data", de: "", ate: "" };
    case "opcoes":
      return { tipo: "opcoes", selecionadas: [] };
  }
}

export function filtroEstaAtivo(filtro: FiltroColuna): boolean {
  switch (filtro.tipo) {
    case "texto":
      return filtro.valor.trim() !== "";
    case "numero":
      return filtro.min.trim() !== "" || filtro.max.trim() !== "";
    case "data":
      return filtro.de.trim() !== "" || filtro.ate.trim() !== "";
    case "opcoes":
      return filtro.selecionadas.length > 0;
  }
}

function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function valorPassaFiltro(
  valor: string | number | null,
  filtro: FiltroColuna,
): boolean {
  switch (filtro.tipo) {
    case "texto":
      if (filtro.valor.trim() === "") return true;
      return normalizar(String(valor ?? "")).includes(normalizar(filtro.valor));
    case "opcoes":
      if (filtro.selecionadas.length === 0) return true;
      return filtro.selecionadas.includes(String(valor ?? ""));
    case "numero": {
      const n = typeof valor === "number" ? valor : Number(valor);
      if (Number.isNaN(n)) return false;
      if (filtro.min.trim() !== "" && n < Number(filtro.min)) return false;
      if (filtro.max.trim() !== "" && n > Number(filtro.max)) return false;
      return true;
    }
    case "data": {
      const d = String(valor ?? "");
      if (filtro.de.trim() !== "" && d < filtro.de) return false;
      if (filtro.ate.trim() !== "" && d > filtro.ate) return false;
      return true;
    }
  }
}

export function compararValores(
  a: string | number | null,
  b: string | number | null,
): number {
  if (a === b) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "pt-BR");
}

export function ordenarLinhas<T>(
  linhas: T[],
  acessor: (linha: T) => string | number | null,
  direcao: "asc" | "desc",
): T[] {
  const copia = [...linhas];
  copia.sort(
    (a, b) =>
      compararValores(acessor(a), acessor(b)) * (direcao === "asc" ? 1 : -1),
  );
  return copia;
}
