type Variant = "neutral" | "neutral-high" | "success" | "danger" | "none";
type Size = "xs" | "2xs";

const VARIANTES: Record<Variant, string> = {
  neutral: "bg-surface-container text-on-surface-variant",
  "neutral-high": "bg-surface-container-high text-on-surface-variant",
  success: "bg-success/15 text-success",
  danger: "bg-danger-container text-on-danger-container",
  // Para cores dinâmicas (ex.: corPessoa), passadas via className.
  none: "",
};

const TAMANHOS: Record<Size, string> = {
  xs: "px-sm py-0.5 text-xs",
  "2xs": "px-2 py-0.5 text-[10px]",
};

export function Badge({
  variant = "neutral",
  size = "xs",
  className,
  children,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}) {
  const classes = `inline-flex items-center rounded-full font-semibold ${TAMANHOS[size]} ${VARIANTES[variant]}`;
  return (
    <span className={className ? `${classes} ${className}` : classes}>
      {children}
    </span>
  );
}
