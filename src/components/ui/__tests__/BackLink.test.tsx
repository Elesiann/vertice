import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { BackLink } from "@/components/ui/BackLink";

const renderLink = (to?: string) =>
  render(
    <MemoryRouter>
      <BackLink {...(to !== undefined ? { to } : {})}>Voltar</BackLink>
    </MemoryRouter>,
  );

describe("BackLink", () => {
  it("renders a Link when to is provided", () => {
    renderLink("/catalog");
    const link = screen.getByRole("link", { name: /Voltar/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/catalog");
  });

  it("renders a button when to is undefined", () => {
    renderLink();
    expect(screen.getByRole("button", { name: /Voltar/i })).toBeInTheDocument();
  });

  it("navigates back when button is clicked", async () => {
    const user = userEvent.setup();
    renderLink();
    await user.click(screen.getByRole("button", { name: /Voltar/i }));
  });
});
