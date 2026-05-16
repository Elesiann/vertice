import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NotFoundPage } from "@/pages/NotFoundPage";

describe("NotFoundPage", () => {
  it("renders the 404 heading and recovery links", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/página não encontrada/i);
    expect(screen.getByRole("link", { name: /voltar para a home/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /ver catálogo/i })).toHaveAttribute("href", "/cards");
  });
});
