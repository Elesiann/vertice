import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

describe("InputForm", () => {
  beforeEach(() => {
    navigateMock.mockClear();
    mockCardsResponse();
  });

  it("renders spending, income and preference controls", async () => {
    renderForm(() => undefined);

    expect(screen.getByLabelText(/Gasto doméstico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Gasto internacional/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Renda mensal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/disponível para investir/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/prefere resgatar/i)).toBeInTheDocument();
    expect(screen.getByText(/Cartões que você já tem/i)).toBeInTheDocument();
    expect(screen.getByText(/Selecionar cartões/i)).toBeInTheDocument();
    expect(await screen.findByText(/Sample Card/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /análise/i })).toBeInTheDocument();
  });

  it("shows selected cards count in dropdown trigger", async () => {
    renderForm(() => undefined);

    await userEvent.click(screen.getByText(/Selecionar cartões/i));
    const firstCheckbox = await screen.findByRole("checkbox");
    await userEvent.click(firstCheckbox);

    expect(screen.getByText(/1 cartão selecionado/i)).toBeInTheDocument();
  });

  it("submits profile and navigates to /results", async () => {
    let latest: SpendingProfile | null = null;
    renderForm((p) => {
      latest = p;
    });

    const brl = screen.getByLabelText(/Gasto doméstico/i);
    const usd = screen.getByLabelText(/Gasto internacional/i);
    const redemption = screen.getByLabelText(/prefere resgatar/i);

    await userEvent.clear(brl);
    await userEvent.type(brl, "8000");
    await userEvent.clear(usd);
    await userEvent.type(usd, "300");
    await userEvent.selectOptions(redemption, "miles:smiles");

    await userEvent.click(screen.getByRole("button", { name: /análise/i }));

    expect(latest).toEqual({
      monthlyDomesticBrl: 8000,
      monthlyInternationalUsd: 300,
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
      monthlyInternationalUsd: 200,
      monthlyIncomeBrl: 12000,
      redemption: { kind: "any" },
    });
  });

  it("includes availableToInvestBrl when optional investment is provided", async () => {
    let latest: SpendingProfile | null = null;
    renderForm((p) => {
      latest = p;
    });

    const availableToInvest = screen.getByLabelText(/disponível para investir/i);
    await userEvent.clear(availableToInvest);
    await userEvent.type(availableToInvest, "50000");
    await userEvent.click(screen.getByRole("button", { name: /análise/i }));

    expect(latest).toEqual({
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 200,
      availableToInvestBrl: 50000,
      redemption: { kind: "any" },
    });
  });

  it("rejects negative values via zod", async () => {
    renderForm(() => undefined);

    const brl = screen.getByLabelText(/Gasto doméstico/i);
    await userEvent.clear(brl);
    await userEvent.type(brl, "-1");
    await userEvent.click(screen.getByRole("button", { name: /análise/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/negativo/i);
    expect(navigateMock).not.toHaveBeenCalledWith("/results");
  });
});
