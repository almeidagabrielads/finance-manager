import { dataDaParcela, dividirParcelas } from "./parcelamentos";
import type { ModoParcelamento } from "./parcelamentos";

function centavosParaReais(valor: number): string {
  return (valor / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export type ParcelamentoParaComprometido = {
  modo: ModoParcelamento;
  quitadoEm: Date | null;
  valorTotalCentavos: number;
  quantidadeParcelas: number;
  dataPrimeiraParcela: Date;
  numerosParcelaLancados: (number | null)[];
};

export type SaldoComprometido = {
  totalComprometidoCentavos: number;
  // chave "YYYY-MM"
  porMes: Map<string, number>;
};

function chaveMes(data: Date): string {
  const ano = data.getUTCFullYear();
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}`;
}

// Saldo comprometido em parcelas futuras: só considera parcelamentos em modo
// GRADUAL ainda abertos (AVISTA não deixa pendência; PREVISAO já materializa
// as parcelas futuras como Lancamento reais, contados no planejado-vs-real
// existente — contá-los aqui de novo duplicaria o valor).
export function calcularSaldoComprometido(
  parcelamentos: ParcelamentoParaComprometido[],
): SaldoComprometido {
  const porMes = new Map<string, number>();
  let totalComprometidoCentavos = 0;

  for (const p of parcelamentos) {
    if (p.modo !== "GRADUAL" || p.quitadoEm !== null) continue;

    const valoresParcelas = dividirParcelas(
      p.valorTotalCentavos,
      p.quantidadeParcelas,
    );
    const numerosLancados = new Set(
      p.numerosParcelaLancados.filter((n): n is number => n !== null),
    );

    for (let i = 0; i < p.quantidadeParcelas; i++) {
      const numeroParcela = i + 1;
      if (numerosLancados.has(numeroParcela)) continue;

      const valor = valoresParcelas[i];
      totalComprometidoCentavos += valor;
      const chave = chaveMes(dataDaParcela(p.dataPrimeiraParcela, i));
      porMes.set(chave, (porMes.get(chave) ?? 0) + valor);
    }
  }

  return { totalComprometidoCentavos, porMes };
}

export function gerarInsightComprometido(
  totalComprometidoCentavos: number,
): string | null {
  if (totalComprometidoCentavos <= 0) return null;
  return `Vocês têm ${centavosParaReais(totalComprometidoCentavos)} comprometidos em parcelas futuras (modo gradual).`;
}
