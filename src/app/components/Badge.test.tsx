import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renderiza com a variante neutral e tamanho xs por padrão", () => {
    render(<Badge>Casa</Badge>);
    const badge = screen.getByText("Casa");
    expect(badge.className).toContain("bg-surface-container");
    expect(badge.className).toContain("text-xs");
    expect(badge.className).toContain("rounded-full");
  });

  it("aplica as classes da variante success", () => {
    render(<Badge variant="success">Quitado</Badge>);
    expect(screen.getByText("Quitado").className).toContain("bg-success/15");
  });

  it("aplica as classes da variante danger", () => {
    render(<Badge variant="danger">-3%</Badge>);
    expect(screen.getByText("-3%").className).toContain("bg-danger-container");
  });

  it("aplica o tamanho 2xs", () => {
    render(<Badge size="2xs">FIXO</Badge>);
    const badge = screen.getByText("FIXO");
    expect(badge.className).toContain("text-[10px]");
    expect(badge.className).not.toContain("text-xs");
  });

  it("variant none não aplica cor, permitindo cor via className", () => {
    render(
      <Badge variant="none" className="bg-secondary-container">
        Ana
      </Badge>,
    );
    const badge = screen.getByText("Ana");
    expect(badge.className).toContain("bg-secondary-container");
    expect(badge.className).not.toContain("bg-surface-container");
  });
});
