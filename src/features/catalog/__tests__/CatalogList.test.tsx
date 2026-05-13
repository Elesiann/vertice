import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SWRConfig } from "swr";
import { CatalogList } from "@/features/catalog/CatalogList";
import { SessionProvider } from "@/context/SessionContext";
import type { CardCatalogResponse, CatalogFilters, PublicCatalogCard } from "@/types";

const fetchCardCatalog = vi.fn<(filters?: CatalogFilters) => Promise<CardCatalogResponse>>();

vi.mock("@/lib/api", () => ({
  fetchCardCatalog: (filters?: CatalogFilters): Promise<CardCatalogResponse> =>
    fetchCardCatalog(filters),
}));

const makeCard = (
  id: string,
  name = `Cartão ${id}`,
  bank: PublicCatalogCard["bank"] = "nubank",
  tier: PublicCatalogCard["tier"] = "gold",
): PublicCatalogCard => ({
  id,
  name,
  bank,
  brand: "mastercard",
  tier,
  pointsProgram: "smiles",
  annualFeeBrl: 1200,
  hasLoungeAccess: false,
  hasTravelInsurance: false,
  hasFreeCheckedBaggage: false,
  hasZeroIof: false,
});

const response = (cards: PublicCatalogCard[]): CardCatalogResponse => ({
  cards,
  catalogVersion: "test",
  count: cards.length,
  filters: {},
});

const emptyResponse: CardCatalogResponse = {
  cards: [],
  catalogVersion: "test",
  count: 0,
  filters: {},
};

const deferred = <T,>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const renderList = (
  filters: CatalogFilters,
  onClearFilters = vi.fn(),
  onResultCount?: (count: number) => void,
): void => {
  render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <MemoryRouter>
        <SessionProvider>
          <CatalogList
            filters={filters}
            onClearFilters={onClearFilters}
            {...(onResultCount ? { onResultCount } : {})}
          />
        </SessionProvider>
      </MemoryRouter>
    </SWRConfig>,
  );
};

describe("CatalogList counts and clear-filters", () => {
  beforeEach(() => {
    fetchCardCatalog.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("reports the result count after a fetch", async () => {
    fetchCardCatalog.mockResolvedValue(response([makeCard("a")]));
    const onResultCount = vi.fn();

    renderList({ search: "alpha" }, vi.fn(), onResultCount);

    await waitFor(() => {
      expect(onResultCount).toHaveBeenLastCalledWith(1);
    });
  });

  it("offers a clear-filters button in the empty state", async () => {
    fetchCardCatalog.mockResolvedValue(emptyResponse);
    const onClearFilters = vi.fn();

    renderList({ hasLounge: true }, onClearFilters);

    await userEvent.click(await screen.findByRole("button", { name: "Limpar filtros" }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("omits clear filters button when filters are empty", async () => {
    fetchCardCatalog.mockResolvedValue(response([makeCard("a")]));

    renderList({});

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Limpar filtros" })).not.toBeInTheDocument();
    });
  });
});

describe("CatalogList search", () => {
  beforeEach(() => {
    fetchCardCatalog.mockResolvedValue(
      response([
        makeCard("itau-platinum", "Itaú Platinum", "itau", "platinum"),
        makeCard("itau-gold", "Itaú Gold", "itau", "gold"),
        makeCard("other-platinum", "Outro Platinum", "other", "platinum"),
      ]),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("matches multi-keyword search across card fields with AND semantics", async () => {
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MemoryRouter>
          <SessionProvider>
            <CatalogList filters={{ search: "itau platinum" }} />
          </SessionProvider>
        </MemoryRouter>
      </SWRConfig>,
    );

    expect(await screen.findByText("Itaú Platinum")).toBeInTheDocument();
    expect(screen.queryByText("Itaú Gold")).not.toBeInTheDocument();
    expect(screen.queryByText("Outro Platinum")).not.toBeInTheDocument();
  });
});

describe("CatalogList refresh", () => {
  beforeEach(() => {
    fetchCardCatalog.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("keeps the current result visible while refreshed filters are loading", async () => {
    const firstFetch = deferred<CardCatalogResponse>();
    const secondFetch = deferred<CardCatalogResponse>();
    fetchCardCatalog
      .mockImplementationOnce(() => firstFetch.promise)
      .mockImplementationOnce(() => secondFetch.promise);

    const view = render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MemoryRouter>
          <SessionProvider>
            <CatalogList filters={{}} />
          </SessionProvider>
        </MemoryRouter>
      </SWRConfig>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
      firstFetch.resolve(response([makeCard("a", "Cartão Atual")]));
      await Promise.resolve();
    });

    expect(screen.getByText("Cartão Atual")).toBeInTheDocument();

    view.rerender(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MemoryRouter>
          <SessionProvider>
            <CatalogList filters={{ hasLounge: true }} />
          </SessionProvider>
        </MemoryRouter>
      </SWRConfig>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
      await Promise.resolve();
    });

    expect(screen.queryByLabelText("Carregando cartões")).not.toBeInTheDocument();
    expect(screen.getByText("Cartão Atual")).toBeInTheDocument();

    await act(async () => {
      secondFetch.resolve(response([makeCard("b", "Cartão Novo")]));
      await Promise.resolve();
    });

    expect(screen.getByText("Cartão Novo")).toBeInTheDocument();
  });
});

describe("CatalogList empty state", () => {
  beforeEach(() => {
    fetchCardCatalog.mockResolvedValue(emptyResponse);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("suggests raising the fee cap when max annual fee is low", async () => {
    renderList({ maxAnnualFee: 100, hasLounge: true });

    expect(await screen.findByText("Nenhum cartão com esses filtros.")).toBeInTheDocument();
    expect(screen.getByText("Tente ampliar a anuidade até R$ 500.")).toBeInTheDocument();
  });

  it("suggests removing lounge filter when lounge is active", async () => {
    renderList({ hasLounge: true });

    expect(await screen.findByText("Tente sem o filtro de lounge.")).toBeInTheDocument();
  });

  it("uses generic suggestion when no specific filter applies", async () => {
    renderList({ search: "xyz" });

    expect(await screen.findByText("Tente ampliar a busca.")).toBeInTheDocument();
  });
});

describe("CatalogList incremental rendering", () => {
  beforeEach(() => {
    fetchCardCatalog.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("mounts only the first page of cards even when the catalog is large", async () => {
    const many = Array.from({ length: 50 }, (_, i) =>
      makeCard(`c${String(i)}`, `Cartão ${String(i)}`),
    );
    fetchCardCatalog.mockResolvedValue(response(many));

    renderList({});

    await screen.findByText("Cartão 0");
    expect(screen.getAllByRole("article")).toHaveLength(30);
  });
});
