type Props = {
  percentual: number;
  cor: "success" | "danger";
};

export function AnelProgresso({ percentual, cor }: Props) {
  const raio = 34;
  const circunferencia = 2 * Math.PI * raio;
  const offset = circunferencia * (1 - percentual / 100);
  const corClasse = cor === "success" ? "text-success" : "text-danger";
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
      <circle
        cx="40"
        cy="40"
        r={raio}
        strokeWidth="8"
        fill="none"
        className="text-surface-container"
        stroke="currentColor"
      />
      <circle
        cx="40"
        cy="40"
        r={raio}
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circunferencia}
        strokeDashoffset={offset}
        className={corClasse}
        stroke="currentColor"
      />
      <text
        x="40"
        y="40"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-on-surface rotate-90"
        style={{
          transformOrigin: "40px 40px",
          fontSize: "16px",
          fontWeight: 700,
        }}
      >
        {Math.round(percentual)}%
      </text>
    </svg>
  );
}
