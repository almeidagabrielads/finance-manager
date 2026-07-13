import { linhasParaObjetos, parseCsv } from "./csv";
import type { ImportTemplate } from "./templates";
import { detectarParcela, type ParcelaDetectada } from "./parcelaDetector";

export type LinhaImportada = {
  numeroLinha: number;
  data: Date;
  descricaoOrigem: string;
  // Positivo = despesa; negativo = estorno/crédito (RF05) — já normalizado
  // conforme a convenção de sinal do template.
  valorCentavos: number;
  descontoCentavos: number;
  descricaoPropria: string | null;
  // Textos brutos lidos do arquivo (quando o template declara a coluna
  // correspondente), ainda não casados com os cadastros do household.
  bancoOrigem: string | null;
  categoriaOrigem: string | null;
  subcategoriaOrigem: string | null;
  divisaoOrigem: string | null;
  pagouOrigem: string | null;
  // "parcela X de Y" detectada no texto da descrição (ex.: "PARCELA 3/12") —
  // null quando nada bate com um padrão plausível (ver parcelaDetector.ts).
  parcelaDetectada: ParcelaDetectada | null;
};

export type ErroImportacao = {
  numeroLinha: number;
  motivo: string;
};

export type ResultadoParse = {
  linhas: LinhaImportada[];
  erros: ErroImportacao[];
};

// Identifica o formato da data pelo próprio texto (em vez de confiar cegamente
// no formatoData do template) e converte para o formato usado no banco —
// arquivos reais às vezes fogem do que o modelo declara (ex.: planilha
// exportada em ISO mesmo com o modelo "genérico completo" esperando BR).
// Ano com 4 dígitos primeiro = ISO (AAAA-MM-DD ou AAAA/MM/DD); dia primeiro
// = BR (DD/MM/AAAA ou DD-MM-AAAA) — a posição do grupo de 4 dígitos
// desambigua os dois formatos independentemente do separador usado.
function parseData(valor: string): Date | null {
  const bruto = valor.trim();

  const iso = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(bruto);
  if (iso) {
    const [, ano, mes, dia] = iso;
    return new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)));
  }

  const br = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/.exec(bruto);
  if (br) {
    const [, dia, mes, ano] = br;
    return new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)));
  }

  return null;
}

function parseValorCentavos(
  valorBruto: string,
  separadorDecimalVirgula: boolean,
): number | null {
  const limpo = valorBruto
    .trim()
    .replace(/^R\$\s*/i, "")
    .replace(/\s/g, "");
  if (limpo === "") return null;

  const normalizado = separadorDecimalVirgula
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo.replace(/,/g, "");

  const numero = Number(normalizado);
  if (Number.isNaN(numero)) return null;

  return Math.round(numero * 100);
}

function extrairValorCentavos(
  campos: Record<string, string>,
  template: ImportTemplate,
): number | null {
  const { valor } = template;

  if (valor.modo === "unica") {
    const centavos = parseValorCentavos(
      campos[valor.coluna] ?? "",
      template.separadorDecimalVirgula,
    );
    if (centavos === null) return null;
    return valor.despesaPositiva ? centavos : -centavos;
  }

  if (valor.modo === "creditoDebito") {
    const credito = campos[valor.colunaCredito]?.trim() ?? "";
    const debito = campos[valor.colunaDebito]?.trim() ?? "";
    if (debito !== "") {
      const centavos = parseValorCentavos(
        debito,
        template.separadorDecimalVirgula,
      );
      return centavos === null ? null : Math.abs(centavos);
    }
    if (credito !== "") {
      const centavos = parseValorCentavos(
        credito,
        template.separadorDecimalVirgula,
      );
      return centavos === null ? null : -Math.abs(centavos);
    }
    return null;
  }

  // modo === "comIndicador"
  const centavos = parseValorCentavos(
    campos[valor.colunaValor] ?? "",
    template.separadorDecimalVirgula,
  );
  if (centavos === null) return null;
  const indicador = (campos[valor.colunaIndicador] ?? "").trim();
  const ehDespesa = valor.indicadoresDespesa.some(
    (i) => i.toLowerCase() === indicador.toLowerCase(),
  );
  return ehDespesa ? Math.abs(centavos) : -Math.abs(centavos);
}

// Lê uma coluna opcional do template (texto bruto, ainda não casado com
// nenhum cadastro do household) — null quando a coluna não está configurada
// no template ou a célula está vazia.
function extrairCampoOpcional(
  campos: Record<string, string>,
  coluna: string | undefined,
): string | null {
  if (!coluna) return null;
  const valor = (campos[coluna] ?? "").trim();
  return valor || null;
}

// Desconto é opcional e, ao contrário do valor principal, não tem sinal —
// null indica erro de parsing (célula preenchida com algo não numérico), 0
// é o padrão quando a coluna não está configurada ou a célula está vazia.
function extrairDescontoCentavos(
  campos: Record<string, string>,
  template: ImportTemplate,
): number | null {
  if (!template.colunaDesconto) return 0;
  const bruto = (campos[template.colunaDesconto] ?? "").trim();
  if (bruto === "") return 0;
  const centavos = parseValorCentavos(bruto, template.separadorDecimalVirgula);
  return centavos === null ? null : Math.abs(centavos);
}

// Faz o parsing de um CSV bruto de acordo com o template selecionado.
// Linhas com data/valor inválidos ou vazias são reportadas em `erros` em vez
// de interromper a importação inteira.
export function parseImportacao(
  csvTexto: string,
  template: ImportTemplate,
): ResultadoParse {
  const linhasCsv = parseCsv(csvTexto, template.delimitador);
  const objetos = linhasParaObjetos(linhasCsv);

  const linhas: LinhaImportada[] = [];
  const erros: ErroImportacao[] = [];

  objetos.forEach((campos, indice) => {
    const numeroLinha = indice + 2; // +1 cabeçalho, +1 índice base 1
    const descricaoOrigem = (campos[template.colunaDescricao] ?? "").trim();
    const dataRaw = campos[template.colunaData] ?? "";

    const data = parseData(dataRaw);
    if (!data) {
      erros.push({ numeroLinha, motivo: `Data inválida: "${dataRaw}"` });
      return;
    }

    const valorCentavos = extrairValorCentavos(campos, template);
    if (valorCentavos === null) {
      erros.push({ numeroLinha, motivo: "Valor inválido ou ausente." });
      return;
    }

    if (!descricaoOrigem) {
      erros.push({ numeroLinha, motivo: "Descrição vazia." });
      return;
    }

    const descontoCentavos = extrairDescontoCentavos(campos, template);
    if (descontoCentavos === null) {
      erros.push({ numeroLinha, motivo: "Desconto inválido." });
      return;
    }

    linhas.push({
      numeroLinha,
      data,
      descricaoOrigem,
      valorCentavos,
      descontoCentavos,
      descricaoPropria: extrairCampoOpcional(
        campos,
        template.colunaDescricaoPropria,
      ),
      bancoOrigem: extrairCampoOpcional(campos, template.colunaBanco),
      categoriaOrigem: extrairCampoOpcional(campos, template.colunaCategoria),
      subcategoriaOrigem: extrairCampoOpcional(
        campos,
        template.colunaSubcategoria,
      ),
      divisaoOrigem: extrairCampoOpcional(campos, template.colunaDivisao),
      pagouOrigem: extrairCampoOpcional(campos, template.colunaPagou),
      parcelaDetectada: detectarParcela(descricaoOrigem),
    });
  });

  return { linhas, erros };
}
