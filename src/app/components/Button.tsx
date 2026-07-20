"use client";

type Variant = "primary" | "ghost" | "danger";

const VARIANTES: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary px-md rounded-full py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-60",
  ghost:
    "border-outline-variant text-on-surface px-md hover:bg-surface-container-low rounded-full border py-1.5 text-xs font-semibold",
  danger:
    "bg-danger text-on-danger px-md rounded-full py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-60",
};

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({
  variant = "primary",
  type = "button",
  className,
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={
        className ? `${VARIANTES[variant]} ${className}` : VARIANTES[variant]
      }
      {...rest}
    />
  );
}
