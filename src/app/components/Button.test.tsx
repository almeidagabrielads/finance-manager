import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Button } from "./Button";

describe("Button", () => {
  it("renderiza com a variante primary por padrão", () => {
    render(<Button>Salvar</Button>);
    const botao = screen.getByRole("button", { name: "Salvar" });
    expect(botao.className).toContain("bg-primary");
    expect(botao.getAttribute("type")).toBe("button");
  });

  it("aplica as classes da variante ghost", () => {
    render(<Button variant="ghost">Cancelar</Button>);
    const botao = screen.getByRole("button", { name: "Cancelar" });
    expect(botao.className).toContain("border-outline-variant");
    expect(botao.className).not.toContain("bg-primary");
  });

  it("aplica as classes da variante danger", () => {
    render(<Button variant="danger">Remover</Button>);
    expect(screen.getByRole("button", { name: "Remover" }).className).toContain(
      "bg-danger",
    );
  });

  it("repassa type, disabled e onClick", () => {
    const onClick = vi.fn();
    render(
      <Button type="submit" onClick={onClick}>
        Enviar
      </Button>,
    );
    const botao = screen.getByRole("button", { name: "Enviar" });
    expect(botao.getAttribute("type")).toBe("submit");
    fireEvent.click(botao);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("não dispara onClick quando disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Enviar
      </Button>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("concatena className extra sem perder a variante", () => {
    render(<Button className="w-full">Ok</Button>);
    const botao = screen.getByRole("button", { name: "Ok" });
    expect(botao.className).toContain("bg-primary");
    expect(botao.className).toContain("w-full");
  });
});
