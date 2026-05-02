import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("renders its children", () => {
    render(<Button>Salvar</Button>);

    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
  });

  it("invokes onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>OK</Button>);

    await userEvent.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not invoke onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        OK
      </Button>,
    );

    await userEvent.click(screen.getByRole("button"));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("uses an aria-label for icon-only buttons", () => {
    render(<Button ariaLabel="Fechar">×</Button>);

    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();
  });
});
