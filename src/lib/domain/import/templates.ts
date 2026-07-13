// Modelos de coluna para os formatos de CSV exportados pelos bancos mais
// comuns. Como cada banco muda o layout de exportação com o tempo, os
// modelos abaixo cobrem os formatos documentados publicamente por cada
// instituição; o modelo "generico" serve de fallback para qualquer CSV
// simples (data, descrição, valor) e a tela de importação permite
// conferir o preview antes de confirmar.
export type ImportTemplateId =
  | "generico"
  | "generico_simples"
  | "nubank_cartao"
  | "nubank_conta"
  | "itau_extrato"
  | "bradesco_extrato"
  | "bb_extrato";

type ColunaValor =
  // Uma única coluna de valor; despesaPositiva indica se, no arquivo,
  // despesas já vêm como número positivo (ex.: fatura de cartão) ou
  // negativo (ex.: extrato de conta, onde saída é negativa).
  | { modo: "unica"; coluna: string; despesaPositiva: boolean }
  // Colunas separadas de crédito e débito (comum em extratos de conta).
  | { modo: "creditoDebito"; colunaCredito: string; colunaDebito: string }
  // Uma coluna de valor sem sinal + uma coluna indicadora do tipo de
  // lançamento (ex.: Banco do Brasil: "Valor" + "Tipo Lançamento").
  | {
      modo: "comIndicador";
      colunaValor: string;
      colunaIndicador: string;
      indicadoresDespesa: string[];
    };

export type ImportTemplate = {
  id: ImportTemplateId;
  nomeExibicao: string;
  descricao: string;
  delimitador: string;
  colunaData: string;
  colunaDescricao: string;
  formatoData: "ISO" | "BR";
  separadorDecimalVirgula: boolean;
  valor: ColunaValor;
  // Nome da coluna que já traz o banco/cartão da linha (ex.: fatura
  // consolidada com lançamentos de mais de uma conta, ou uma planilha
  // própria). Quando presente, o texto lido é casado com os cadastros do
  // household — o usuário só precisa escolher um valor padrão para as
  // linhas em que o arquivo não indicar nada.
  colunaBanco?: string;
  // As colunas abaixo seguem o mesmo princípio do colunaBanco, mas para
  // descrição própria, desconto, categoria, subcategoria e divisão/pagador
  // — úteis ao migrar de uma planilha própria que já tem essas informações.
  colunaDescricaoPropria?: string;
  colunaDesconto?: string;
  colunaCategoria?: string;
  colunaSubcategoria?: string;
  colunaDivisao?: string;
  colunaPagou?: string;
};

export const IMPORT_TEMPLATES: Record<ImportTemplateId, ImportTemplate> = {
  generico: {
    id: "generico",
    nomeExibicao: "Genérico completo (planilha)",
    descricao:
      'Planilha com colunas "Data, Ano, Mês, Descrição Cartão, Descrição Própria, Divisão, Valor, Desconto, Categoria, Subcategoria, Banco, Quem pagou" — ideal para migrar de uma planilha própria. Ano e Mês são ignorados (a data já vem em "Data"); Divisão, Categoria, Subcategoria, Banco e Quem pagou são casados com os cadastros do household.',
    delimitador: ",",
    colunaData: "Data",
    colunaDescricao: "Descrição Cartão",
    formatoData: "BR",
    separadorDecimalVirgula: true,
    valor: { modo: "unica", coluna: "Valor", despesaPositiva: true },
    colunaBanco: "Banco",
    colunaDescricaoPropria: "Descrição Própria",
    colunaDesconto: "Desconto",
    colunaCategoria: "Categoria",
    colunaSubcategoria: "Subcategoria",
    colunaDivisao: "Divisão",
    colunaPagou: "Quem pagou",
  },
  generico_simples: {
    id: "generico_simples",
    nomeExibicao: "Genérico simplificado (data, descrição, valor)",
    descricao:
      'CSV simples com colunas "data, descricao, valor". Use quando não precisar preencher banco, categoria, divisão etc. por linha — esses valores são definidos no passo de importação.',
    delimitador: ",",
    colunaData: "data",
    colunaDescricao: "descricao",
    formatoData: "ISO",
    separadorDecimalVirgula: false,
    valor: { modo: "unica", coluna: "valor", despesaPositiva: true },
  },
  nubank_cartao: {
    id: "nubank_cartao",
    nomeExibicao: "Nubank — Cartão de crédito (fatura)",
    descricao: 'Exportação "date,title,amount" da fatura do cartão Nubank.',
    delimitador: ",",
    colunaData: "date",
    colunaDescricao: "title",
    formatoData: "ISO",
    separadorDecimalVirgula: false,
    valor: { modo: "unica", coluna: "amount", despesaPositiva: true },
  },
  nubank_conta: {
    id: "nubank_conta",
    nomeExibicao: "Nubank — Conta (NuConta)",
    descricao:
      'Exportação "Data,Valor,Identificador,Descrição" do extrato da NuConta.',
    delimitador: ",",
    colunaData: "Data",
    colunaDescricao: "Descrição",
    formatoData: "BR",
    separadorDecimalVirgula: false,
    valor: { modo: "unica", coluna: "Valor", despesaPositiva: false },
  },
  itau_extrato: {
    id: "itau_extrato",
    nomeExibicao: "Itaú — Extrato conta corrente",
    descricao: 'Exportação "data;lançamento;valor;saldo" do extrato Itaú.',
    delimitador: ";",
    colunaData: "data",
    colunaDescricao: "lançamento",
    formatoData: "BR",
    separadorDecimalVirgula: true,
    valor: { modo: "unica", coluna: "valor", despesaPositiva: false },
  },
  bradesco_extrato: {
    id: "bradesco_extrato",
    nomeExibicao: "Bradesco — Extrato conta corrente",
    descricao:
      'Exportação com colunas "Data,Histórico,Crédito (R$),Débito (R$)" do extrato Bradesco.',
    delimitador: ",",
    colunaData: "Data",
    colunaDescricao: "Histórico",
    formatoData: "BR",
    separadorDecimalVirgula: true,
    valor: {
      modo: "creditoDebito",
      colunaCredito: "Crédito (R$)",
      colunaDebito: "Débito (R$)",
    },
  },
  bb_extrato: {
    id: "bb_extrato",
    nomeExibicao: "Banco do Brasil — Extrato conta corrente",
    descricao:
      'Exportação com colunas "Data,Histórico,Valor,Tipo Lançamento" do extrato BB.',
    delimitador: ",",
    colunaData: "Data",
    colunaDescricao: "Histórico",
    formatoData: "BR",
    separadorDecimalVirgula: true,
    valor: {
      modo: "comIndicador",
      colunaValor: "Valor",
      colunaIndicador: "Tipo Lançamento",
      indicadoresDespesa: ["D", "Débito", "DÉBITO"],
    },
  },
};

export function listarTemplates(): ImportTemplate[] {
  return Object.values(IMPORT_TEMPLATES);
}

export function buscarTemplate(id: string): ImportTemplate | null {
  return (IMPORT_TEMPLATES as Record<string, ImportTemplate>)[id] ?? null;
}

function formatarDataExemplo(
  data: { ano: number; mes: number; dia: number },
  formato: ImportTemplate["formatoData"],
): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return formato === "ISO"
    ? `${data.ano}-${pad(data.mes)}-${pad(data.dia)}`
    : `${pad(data.dia)}/${pad(data.mes)}/${data.ano}`;
}

function formatarValorExemplo(
  valor: number,
  separadorDecimalVirgula: boolean,
): string {
  const sinal = valor < 0 ? "-" : "";
  const abs = Math.abs(valor).toFixed(2);
  return sinal + (separadorDecimalVirgula ? abs.replace(".", ",") : abs);
}

function escaparCampoCsv(valor: string, delimitador: string): string {
  return valor.includes(delimitador) || valor.includes('"')
    ? `"${valor.replace(/"/g, '""')}"`
    : valor;
}

// Gera um CSV de exemplo com o formato exato esperado por um modelo de
// importação — ajuda o usuário a montar o arquivo certo antes de exportar
// do banco ou de uma planilha própria.
export function gerarExemploCsv(
  template: ImportTemplate,
  opts: {
    bancoNome?: string;
    categoriaNome?: string;
    subcategoriaNome?: string;
    divisaoNome?: string;
    pagouNome?: string;
  } = {},
): string {
  const colunas: string[] = [];
  const linha1: string[] = [];
  const linha2: string[] = [];

  const adicionar = (coluna: string, v1: string, v2: string) => {
    colunas.push(coluna);
    linha1.push(v1);
    linha2.push(v2);
  };

  adicionar(
    template.colunaData,
    formatarDataExemplo({ ano: 2026, mes: 6, dia: 10 }, template.formatoData),
    formatarDataExemplo({ ano: 2026, mes: 6, dia: 11 }, template.formatoData),
  );

  // Ano/Mês só existem no modelo "genérico" (planilha própria) — são
  // colunas informativas, ignoradas pelo parser, mas mantidas no exemplo
  // para casar com a estrutura real da planilha.
  if (template.id === "generico") {
    adicionar("Ano", "2026", "2026");
    adicionar("Mês", "6", "6");
  }

  adicionar(
    template.colunaDescricao,
    "Supermercado Exemplo",
    "Estorno Exemplo",
  );

  if (template.colunaDescricaoPropria) {
    adicionar(template.colunaDescricaoPropria, "Mercado", "Estorno do cartão");
  }

  if (template.colunaDivisao) {
    adicionar(template.colunaDivisao, opts.divisaoNome ?? "", "");
  }

  if (template.valor.modo === "unica") {
    const { coluna, despesaPositiva } = template.valor;
    const sinal = despesaPositiva ? 1 : -1;
    adicionar(
      coluna,
      formatarValorExemplo(150 * sinal, template.separadorDecimalVirgula),
      formatarValorExemplo(-80 * sinal, template.separadorDecimalVirgula),
    );
  } else if (template.valor.modo === "creditoDebito") {
    const { colunaCredito, colunaDebito } = template.valor;
    adicionar(
      colunaCredito,
      "",
      formatarValorExemplo(80, template.separadorDecimalVirgula),
    );
    adicionar(
      colunaDebito,
      formatarValorExemplo(150, template.separadorDecimalVirgula),
      "",
    );
  } else {
    const { colunaValor, colunaIndicador, indicadoresDespesa } = template.valor;
    colunas.push(colunaValor, colunaIndicador);
    linha1.push(
      formatarValorExemplo(150, template.separadorDecimalVirgula),
      indicadoresDespesa[0],
    );
    linha2.push(
      formatarValorExemplo(80, template.separadorDecimalVirgula),
      "C",
    );
  }

  if (template.colunaDesconto) {
    adicionar(template.colunaDesconto, "0", "0");
  }

  if (template.colunaCategoria) {
    adicionar(template.colunaCategoria, opts.categoriaNome ?? "", "");
  }

  if (template.colunaSubcategoria) {
    adicionar(template.colunaSubcategoria, opts.subcategoriaNome ?? "", "");
  }

  if (template.colunaBanco) {
    adicionar(template.colunaBanco, opts.bancoNome ?? "", "");
  }

  if (template.colunaPagou) {
    adicionar(template.colunaPagou, opts.pagouNome ?? "", "");
  }

  return [colunas, linha1, linha2]
    .map((campos) =>
      campos
        .map((campo) => escaparCampoCsv(campo, template.delimitador))
        .join(template.delimitador),
    )
    .join("\n");
}
