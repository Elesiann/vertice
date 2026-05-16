import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState, type JSX } from "react";
import { Dialog } from "@/components/ui/Dialog";

const OpenDialog = ({ onClose }: { onClose: () => void }): JSX.Element => {
  const closeRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button type="button">Abrir</button>
      <Dialog open onClose={onClose} ariaLabel="Menu" initialFocusRef={closeRef}>
        <button ref={closeRef} type="button">
          Fechar
        </button>
        <a href="/cards">Catálogo</a>
      </Dialog>
    </>
  );
};

const StatefulDialog = (): JSX.Element => {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Abrir menu
      </button>
      {open ? (
        <Dialog
          open={open}
          onClose={() => {
            setOpen(false);
          }}
          ariaLabel="Menu"
          initialFocusRef={closeRef}
        >
          <button ref={closeRef} type="button">
            Fechar
          </button>
        </Dialog>
      ) : null}
    </>
  );
};

describe("Dialog", () => {
  it("sets initial focus, traps Tab and closes with Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<OpenDialog onClose={onClose} />);

    const close = screen.getByRole("button", { name: "Fechar" });
    const catalog = screen.getByRole("link", { name: "Catálogo" });

    await waitFor(() => {
      expect(close).toHaveFocus();
    });

    await user.keyboard("{Tab}");
    expect(catalog).toHaveFocus();

    await user.keyboard("{Tab}");
    expect(close).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("restores focus to the trigger when it closes", async () => {
    const user = userEvent.setup();
    render(<StatefulDialog />);

    const trigger = screen.getByRole("button", { name: "Abrir menu" });
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Fechar" })).toHaveFocus();
    });

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });
});
