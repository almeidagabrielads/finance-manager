import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("renderiza o conteúdo dentro do painel centralizado", () => {
    render(
      <Modal>
        <h2>Título do modal</h2>
      </Modal>,
    );
    const titulo = screen.getByText("Título do modal");
    const painel = titulo.parentElement!;
    expect(painel.className).toContain("rounded-2xl");
    expect(painel.className).toContain("max-w-[32rem]");
    const overlay = painel.parentElement!;
    expect(overlay.className).toContain("fixed inset-0");
    expect(overlay.className).toContain("z-[100]");
  });

  it("aceita largura máxima e z-index customizados", () => {
    render(
      <Modal maxWidthClass="max-w-[36rem]" zIndexClass="z-[110]">
        <p>Conteúdo</p>
      </Modal>,
    );
    const painel = screen.getByText("Conteúdo").parentElement!;
    expect(painel.className).toContain("max-w-[36rem]");
    expect(painel.parentElement!.className).toContain("z-[110]");
  });
});
