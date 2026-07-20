import { corPessoaSvg } from "@/app/components/PessoaBadge";
import { formatarMoeda, formatarMoedaCompacta } from "@/lib/domain/formatacao";
import type { DadosGraficoMes } from "@/lib/domain/receitas";
import { NOMES_MES_ABREV, type Pessoa } from "./types";

type Props = {
  dados: DadosGraficoMes[];
  pessoas: Pessoa[];
  nomePessoa: (id: string) => string;
};

export function GraficoTotalPorPessoaEMes({
  dados,
  pessoas,
  nomePessoa,
}: Props) {
  const largura = 760;
  const alturaBarras = 200;
  const margemLabel = 24;
  const margemTopo = 34;
  const altura = margemTopo + alturaBarras + margemLabel;
  const padding = 8;
  const maxValor = Math.max(
    1,
    ...dados.flatMap((d) => pessoas.map((p) => d.porPessoa[p.id] ?? 0)),
  );

  const larguraCluster = (largura - 2 * padding) / dados.length;
  const larguraBarra =
    pessoas.length > 0
      ? (larguraCluster * 0.7) / pessoas.length
      : larguraCluster * 0.7;
  const gapCluster = larguraCluster * 0.3;
  const baseline = margemTopo + alturaBarras - padding;

  return (
    <div className="gap-sm flex flex-col">
      <svg
        viewBox={`0 0 ${largura} ${altura}`}
        className="w-full"
        preserveAspectRatio="none"
      >
        <line
          x1={padding}
          y1={baseline}
          x2={largura - padding}
          y2={baseline}
          stroke="var(--color-outline-variant)"
          strokeWidth={1}
        />
        {dados.map((d, iMes) => {
          const xCluster = padding + iMes * larguraCluster + gapCluster / 2;
          return (
            <g key={d.mes}>
              {pessoas.map((p, iPessoa) => {
                const valor = d.porPessoa[p.id] ?? 0;
                const alturaBarra =
                  (valor / maxValor) * (alturaBarras - 2 * padding - 16);
                const x = xCluster + iPessoa * larguraBarra;
                const y = baseline - alturaBarra;
                return (
                  <g key={p.id}>
                    <rect
                      x={x}
                      y={y}
                      width={Math.max(larguraBarra - 2, 1)}
                      height={alturaBarra}
                      fill={corPessoaSvg(p.id)}
                      rx={2}
                    >
                      <title>
                        {`${nomePessoa(p.id)} — ${NOMES_MES_ABREV[d.mes - 1]}: ${formatarMoeda(valor)}`}
                      </title>
                    </rect>
                    {valor > 0 && (
                      <text
                        x={x + Math.max(larguraBarra - 2, 1) / 2}
                        y={y - 3}
                        textAnchor="start"
                        fontSize={8}
                        fill="var(--color-on-surface)"
                        fontWeight={600}
                        transform={`rotate(-55, ${x + Math.max(larguraBarra - 2, 1) / 2}, ${y - 3})`}
                      >
                        {formatarMoedaCompacta(valor)}
                      </text>
                    )}
                  </g>
                );
              })}
              <text
                x={xCluster + (larguraCluster - gapCluster) / 2}
                y={baseline + 16}
                textAnchor="middle"
                fontSize={11}
                fill="var(--color-on-surface-variant)"
              >
                {NOMES_MES_ABREV[d.mes - 1]}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="gap-md flex flex-wrap">
        {pessoas.map((p) => (
          <div key={p.id} className="flex items-center gap-1.5 text-xs">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: corPessoaSvg(p.id) }}
            />
            <span className="text-on-surface-variant">{p.nome}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
