export type ParcelaDetectada = { atual: number; total: number };

// Padrões testados em ordem: primeiro os que têm uma palavra-chave explícita
// ("PARCELA"/"PARC"), depois um fallback de "N/M" solto no fim da descrição
// (mais propenso a falso positivo — ex.: um código de produto ou uma data —
// por isso vem por último e é o mais restrito).
const PADROES_PARCELA: RegExp[] = [
  /PARCELA\s*(\d{1,3})\s*\/\s*(\d{1,3})/i,
  /PARC\.?\s*(\d{1,3})\s*\/\s*(\d{1,3})/i,
  /(?:^|\s)(\d{1,3})\s*\/\s*(\d{1,3})\s*$/,
];

// Detecta "parcela X de Y" numa descrição importada de extrato/fatura (ex.
// "PARCELA 3/12", "PARC 03/12 LOJA X", "AMAZON 1/3"). Retorna null quando
// nada bate com um padrão plausível de parcelamento.
export function detectarParcela(descricao: string): ParcelaDetectada | null {
  const texto = descricao.trim();
  for (const padrao of PADROES_PARCELA) {
    const match = padrao.exec(texto);
    if (!match) continue;

    const atual = Number(match[1]);
    const total = Number(match[2]);
    if (atual >= 1 && total >= atual && total <= 999) {
      return { atual, total };
    }
  }
  return null;
}
