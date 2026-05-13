import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type * as ReactRouter from "react-router-dom";
import { SessionProvider, useSession } from "@/context/SessionContext";
import { InputForm } from "@/features/input/InputForm";
import type { JSX } from "react";
import type { SpendingProfile } from "@/types";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof ReactRouter>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

const ProfileProbe = ({
  onProfile,
}: {
  onProfile: (p: SpendingProfile | null) => void;
}): JSX.Element => {
  const { profile } = useSession();
  onProfile(profile);
  return <span data-testid="probe">{profile === null ? "empty" : "set"}</span>;
};

const renderForm = (onProfile: (p: SpendingProfile | null) => void): void => {
  render(
    <MemoryRouter>
      <SessionProvider>
        <InputForm />
        <ProfileProbe onProfile={onProfile} />
      </SessionProvider>
    </MemoryRouter>,
  );
};

const mockCardsResponse = (): void => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          cards: [{ id: "sample-card", name: "Sample Card", bank: "other" }],
        }),
    }),
  );
};

const settleEffects = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe("InputForm", () => {
  beforeEach(() => {
    navigateMock.mockClear();
    mockCardsResponse();
    window.localStorage.clear();
  });

  it("renders spending, income and preference controls", async () => {
    renderForm(() => undefined);
    await settleEffects();

    expect(screen.getByLabelText(/Gasto mensal \(R\$\)/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Gasto mensal em viagens/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Renda mensal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Investimentos/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Forma de resgate/i)).toBeInTheDocument();
    expect(screen.getByText(/Cartões atuais/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Buscar por nome/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /análise/i })).toBeInTheDocument();
  });

  it("selects a card via combobox and renders it as a chip", async () => {
    renderForm(() => undefined);

    await userEvent.click(screen.getByPlaceholderText(/Buscar por nome/i));
    const option = await screen.findByRole("option", { name: /Sample Card/i });
    await userEvent.click(option);

    expect(screen.getByLabelText(/Remover Sample Card/i)).toBeInTheDocument();
  });

  it("submits profile and navigates to /results", async () => {
    let latest: SpendingProfile | null = null;
    renderForm((p) => {
      latest = p;
    });

    const brl = screen.getByLabelText(/Gasto mensal \(R\$\)/i);
    const redemption = screen.getByLabelText(/Forma de resgate/i);

    await userEvent.clear(brl);
    await userEvent.type(brl, "8000");
    await userEvent.selectOptions(redemption, "miles:smiles");

    await userEvent.click(screen.getByRole("button", { name: /análise/i }));

    expect(latest).toEqual({
      monthlyDomesticBrl: 8000,
      monthlyInternationalUsd: 0,
      redemption: { kind: "miles", program: "smiles" },
    });
    expect(navigateMock).toHaveBeenCalledWith("/results");
  });

  it("includes monthlyIncomeBrl when optional income is provided", async () => {
    let latest: SpendingProfile | null = null;
    renderForm((p) => {
      latest = p;
    });

    const income = screen.getByLabelText(/Renda mensal/i);
    await userEvent.clear(income);
    await userEvent.type(income, "12000");
    await userEvent.click(screen.getByRole("button", { name: /análise/i }));

    expect(latest).toEqual({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 0,
      monthlyIncomeBrl: 12000,
      redemption: { kind: "any" },
    });
  });

  it("includes availableToInvestBrl when optional investment is provided", async () => {
    let latest: SpendingProfile | null = null;
    renderForm((p) => {
      latest = p;
    });

    const availableToInvest = screen.getByLabelText(/Investimentos/i);
    await userEvent.clear(availableToInvest);
    await userEvent.type(availableToInvest, "50000");
    await userEvent.click(screen.getByRole("button", { name: /análise/i }));

    expect(latest).toEqual({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 0,
      availableToInvestBrl: 50000,
      redemption: { kind: "any" },
    });
  });

  it("rejects negative values via zod", async () => {
    renderForm(() => undefined);

    const brl = screen.getByLabelText(/Gasto mensal \(R\$\)/i);
    await userEvent.clear(brl);
    await userEvent.type(brl, "-1");
    await userEvent.click(screen.getByRole("button", { name: /análise/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/negativo/i);
    expect(navigateMock).not.toHaveBeenCalledWith("/results");
  });

  it("hydrates fields from a profile saved in localStorage", async () => {
    window.localStorage.setItem(
      "stackr.profile.v1",
      JSON.stringify({
        profile: {
          monthlyDomesticBrl: 7000,
          monthlyInternationalUsd: 350,
          redemption: { kind: "miles", program: "smiles" },
          tripsPerYear: 5,
        },
        savedAt: new Date().toISOString(),
      }),
    );

    renderForm(() => undefined);

    expect(await screen.findByLabelText(/Gasto mensal \(R\$\)/i)).toHaveValue(7000);
    expect(screen.queryByLabelText(/Gasto mensal em viagens/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Forma de resgate/i)).toHaveValue("miles:smiles");
    expect(screen.getByLabelText(/Quantas viagens/i)).toHaveValue(5);
    expect(screen.getByText(/Última edição/i)).toBeInTheDocument();
  });

  it("clears the saved profile when Limpar is clicked", async () => {
    window.localStorage.setItem(
      "stackr.profile.v1",
      JSON.stringify({
        profile: {
          monthlyDomesticBrl: 9999,
          monthlyInternationalUsd: 999,
          redemption: { kind: "cashback" },
        },
        savedAt: new Date().toISOString(),
      }),
    );

    renderForm(() => undefined);

    expect(await screen.findByText(/Última edição/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Limpar/i }));

    expect(window.localStorage.getItem("stackr.profile.v1")).toBeNull();
    expect(screen.queryByText(/Última edição/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Gasto mensal \(R\$\)/i)).toHaveValue(5000);
  });
});
