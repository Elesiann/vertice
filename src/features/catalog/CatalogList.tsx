import { type JSX, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Link } from "react-router-dom";
import {
  Armchair,
  Check,
  Globe,
  Lock,
  type LucideIcon,
  Percent,
  PiggyBank,
  Plane,
  Plus,
  Umbrella,
} from "lucide-react";
import { fetchCardCatalog } from "@/lib/api";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { CardImage } from "@/components/domain/CardImage";
import { cn } from "@/lib/cn";
import { formatCashbackRate } from "@/lib/format";
import { formatBankLabel, formatPointsProgram } from "@/lib/labels";
import { useCompareActions } from "@/features/compare/useCompareActions";
import { CatalogCard } from "./CatalogCard";
import type { CatalogSort, CatalogViewMode } from "./CatalogFilters";
import type { CatalogFilters, PublicCatalogCard } from "@/types";

interface CatalogListProps {
  filters: CatalogFilters;
  onClearFilters?: () => void;
  sort?: CatalogSort;
  viewMode?: CatalogViewMode;
  /** Called with the card count after each successful fetch (post client-side search). */
  onResultCount?: (count: number) => void;
}

const SKELETON_COUNT = 8;
const DEFAULT_SORT: CatalogSort = "fee_asc";

const FETCH_DEBOUNCE_MS = 300;
// Renderiza incrementalmente: o catálogo inteiro vem numa requisição (a API
// não pagina), mas só montamos PAGE_SIZE cards por vez e um sentinela no fim
// do grid revela mais conforme o usuário rola.
const PAGE_SIZE = 30;

// Sem sidebar, o grid usa a largura inteira: 4 colunas no desktop largo.
const GRID = "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

const LIST_SKELETON = "border-line bg-surface-sunken h-28 animate-pulse border-b last:border-b-0";

const searchTerms = (search: string | undefined): string[] =>
  (search ?? "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);

const matchesSearchTerms = (card: PublicCatalogCard, terms: string[]): boolean => {
  if (terms.length <= 1) return true;
  const fields = [card.name, card.bank, card.tier, card.brand].map((field) => field.toLowerCase());
  return terms.every((term) => fields.some((field) => field.includes(term)));
};

const emptySuggestion = (filters: CatalogFilters): string => {
  if (filters.maxAnnualFee !== undefined && filters.maxAnnualFee <= 200) {
    return "Tente ampliar a anuidade até R$ 500.";
  }
  if (filters.hasLounge === true) {
    return "Tente sem o filtro de lounge.";
  }
  return "Tente ampliar a busca.";
};

const byName = (a: PublicCatalogCard, b: PublicCatalogCard): number =>
  a.name.localeCompare(b.name, "pt-BR");

const sortCatalogCards = (
  cards: readonly PublicCatalogCard[],
  sort: CatalogSort,
): PublicCatalogCard[] =>
  Array.from(cards).sort((a, b) => {
    if (sort === "fee_desc") return b.annualFeeBrl - a.annualFeeBrl || byName(a, b);
    if (sort === "name_asc") return byName(a, b);
    return a.annualFeeBrl - b.annualFeeBrl || byName(a, b);
  });

const formatBrlShort = (value: number): string => {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    const label = millions === 1 ? "milhão" : "milhões";
    const num = Number.isInteger(millions)
      ? String(millions)
      : millions.toFixed(1).replace(".", ",");
    return `R$ ${num} ${label}`;
  }
  if (value >= 1000 && value % 1000 === 0) return `R$ ${String(value / 1000)} mil`;
  return `R$ ${Math.round(value).toLocaleString("pt-BR")}`;
};

const annualFeeLabel = (card: PublicCatalogCard): string =>
  card.annualFeeBrl === 0 ? "Sem anuidade" : `${formatBrlShort(card.annualFeeBrl)}/ano`;

interface ListDetail {
  Icon: LucideIcon;
  label: string;
}

const listDetails = (card: PublicCatalogCard): ListDetail[] => {
  const details: ListDetail[] = [];
  if (card.hasLoungeAccess) details.push({ Icon: Armchair, label: "Sala VIP" });
  if (card.cashbackRatePercent !== undefined && card.cashbackRatePercent > 0) {
    const rate = formatCashbackRate(card.cashbackRatePercent);
    details.push(
      card.hasInvestback === true
        ? { Icon: PiggyBank, label: `Investback ${rate}` }
        : { Icon: Percent, label: `Cashback ${rate}` },
    );
  }
  if (card.pointsProgram !== "cashback") {
    details.push({ Icon: Plane, label: formatPointsProgram(card.pointsProgram) });
  }
  if (card.hasTravelInsurance) details.push({ Icon: Umbrella, label: "Seguro viagem" });
  if (card.hasZeroIof) details.push({ Icon: Globe, label: "Sem IOF" });

  const invested = card.requiredInvestmentBrl ?? card.minInvestmentBrl;
  if (
    (card.requiresRelationship === "investment" || card.requiresRelationship === "private") &&
    invested !== undefined &&
    invested > 0
  ) {
    details.push({ Icon: Lock, label: `Exige ${formatBrlShort(invested)}` });
  } else if (card.requiresRelationship === "private") {
    details.push({ Icon: Lock, label: "Private banking" });
  }

  return details;
};

const CatalogListRow = ({
  card,
  inCompare,
  onToggleCompare,
}: {
  card: PublicCatalogCard;
  inCompare: boolean;
  onToggleCompare: (id: string) => void;
}): JSX.Element => {
  const details = listDetails(card);

  return (
    <article className="border-line grid gap-4 border-b py-4 last:border-b-0 sm:grid-cols-[5.5rem_minmax(0,1fr)_9rem] sm:items-center">
      <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 sm:contents">
        <CardImage
          {...(card.imagePath !== undefined ? { imagePath: card.imagePath } : {})}
          name={card.name}
          brand={card.brand}
          tier={card.tier}
          size="sm"
          className="w-full rounded-md"
        />

        <div className="min-w-0">
          <Link
            to={`/cards/${card.id}`}
            className="text-heading text-ink hover:text-accent focus-visible:ring-accent rounded outline-none focus-visible:ring-2"
          >
            {card.name}
          </Link>
          <p className="text-caption text-ink-subtle mt-0.5">
            {formatBankLabel(card.bank, card.id)} · {card.tier} · {card.brand}
          </p>

          {details.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
              {details.map(({ Icon, label }) => (
                <li key={label} className="text-ink-muted flex items-center gap-1.5 text-xs">
                  <Icon size={14} className="text-ink-subtle shrink-0" aria-hidden="true" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
        <div className="sm:text-right">
          <p className="text-caption text-ink-subtle">Anuidade</p>
          <p className="text-num text-ink tabular text-sm font-semibold">{annualFeeLabel(card)}</p>
        </div>
        <button
          type="button"
          aria-pressed={inCompare}
          onClick={() => {
            onToggleCompare(card.id);
          }}
          className={cn(
            "focus-visible:ring-accent inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            inCompare
              ? "border-accent bg-accent text-white"
              : "border-line text-ink bg-surface-raised hover:bg-surface-sunken",
          )}
        >
          {inCompare ? (
            <Check size={15} aria-hidden="true" />
          ) : (
            <Plus size={15} aria-hidden="true" />
          )}
          <span>{inCompare ? "Selecionado" : "Comparar"}</span>
        </button>
      </div>
    </article>
  );
};

export const CatalogList = ({
  filters,
  onClearFilters,
  sort = DEFAULT_SORT,
  viewMode = "grid",
  onResultCount,
}: CatalogListProps): JSX.Element => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { hasCard, toggleCard } = useCompareActions();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const onResultCountRef = useRef(onResultCount);
  useEffect(() => {
    onResultCountRef.current = onResultCount;
  });

  // Debounce os filtros para não disparar fetch a cada tecla na busca.
  // Pula o primeiro render: `debouncedFilters` já é `filters` via useState.
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedFilters(filters);
    }, FETCH_DEBOUNCE_MS);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [filters]);

  const cacheKey = JSON.stringify(debouncedFilters);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const {
    data: cards,
    error,
    isLoading,
    mutate,
  } = useSWR(
    cacheKey,
    async (key: string) => {
      const f = JSON.parse(key) as CatalogFilters;
      const terms = searchTerms(f.search);
      const { search: _search, ...filtersWithoutSearch } = f;
      const requestFilters = terms.length > 1 ? filtersWithoutSearch : f;
      const res = await fetchCardCatalog(requestFilters);
      return res.cards.filter((card) => matchesSearchTerms(card, terms));
    },
    {
      dedupingInterval: 10 * 60 * 1000,
      keepPreviousData: true,
      revalidateOnFocus: false,
    },
  );

  // Reporta contagem de resultados
  useEffect(() => {
    if (cards !== undefined) onResultCountRef.current?.(cards.length);
  }, [cards]);

  // Reinicia paginação quando o resultado muda
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [cards, sort]);

  const visibleCards =
    cards !== undefined ? sortCatalogCards(cards, sort).slice(0, visibleCount) : [];
  const hasMore = cards !== undefined && visibleCount < cards.length;

  useEffect(() => {
    if (!hasMore) return;
    if (typeof IntersectionObserver === "undefined") return;
    const node = sentinelRef.current;
    if (node === null) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => count + PAGE_SIZE);
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [hasMore, visibleCount]);

  if (isLoading && cards === undefined) {
    if (viewMode === "list") {
      return (
        <div className="border-line border-y" aria-busy="true" aria-label="Carregando cartões">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div key={i} className={LIST_SKELETON} />
          ))}
        </div>
      );
    }

    return (
      <div className={GRID} aria-busy="true" aria-label="Carregando cartões">
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <div key={i} className="bg-surface-sunken aspect-[3/4] animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (error !== undefined) {
    return (
      <Panel tone="raised" className="p-6 text-center">
        <p className="text-body text-ink-muted">Não foi possível carregar o catálogo.</p>
        <Button
          className="mt-4"
          onClick={() => {
            void mutate();
          }}
        >
          Tentar de novo
        </Button>
      </Panel>
    );
  }

  if (cards?.length === 0) {
    return (
      <Panel tone="sunken" className="p-6 text-center">
        <p className="text-body text-ink-muted">Nenhum cartão com esses filtros.</p>
        <p className="text-body-sm text-ink-subtle mt-2">{emptySuggestion(filters)}</p>
        {onClearFilters !== undefined && (
          <Button variant="ghost" size="sm" className="mt-4" onClick={onClearFilters}>
            Limpar filtros
          </Button>
        )}
      </Panel>
    );
  }

  return (
    <>
      {viewMode === "list" ? (
        <div className="border-line border-y">
          {visibleCards.map((card) => (
            <CatalogListRow
              key={card.id}
              card={card}
              inCompare={hasCard(card.id)}
              onToggleCompare={toggleCard}
            />
          ))}
        </div>
      ) : (
        <div className={`${GRID} items-start`}>
          {visibleCards.map((card) => (
            <CatalogCard
              key={card.id}
              card={card}
              inCompare={hasCard(card.id)}
              onCompare={toggleCard}
            />
          ))}
        </div>
      )}
      {hasMore ? <div ref={sentinelRef} aria-hidden="true" className="h-1 w-full" /> : null}
    </>
  );
};
