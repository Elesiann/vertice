import type { JSX } from "react";
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchCardDetail } from "@/lib/api";
import { CardDetailHero } from "@/features/card-detail/CardDetailHero";
import { CardDetailSections } from "@/features/card-detail/CardDetailSections";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { RevealBlock, RevealGroup } from "@/components/ui/Reveal";
import { useCompareActions } from "@/features/compare/useCompareActions";
import { useSession } from "@/context/SessionContext";
import { categoryLinks } from "@/features/card-detail/detail-model";
import { ROUTES } from "@/routes";
import type { PublicCardDetail, SolverError } from "@/types";
import type { Result } from "@/lib/result";

type State =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "ok"; card: PublicCardDetail };

const CardCompareButton = ({ card }: { card: PublicCardDetail }): JSX.Element => {
  const { hasCard, toggleCard } = useCompareActions();
  const inCompare = hasCard(card.id);

  return (
    <Button
      variant="secondary"
      size="sm"
      className="w-full shrink-0 sm:w-fit"
      onClick={() => {
        toggleCard(card.id);
      }}
    >
      {inCompare ? "Remover da comparação" : "Adicionar à comparação"}
    </Button>
  );
};

const CardCategoryLinks = ({ card }: { card: PublicCardDetail }): JSX.Element => (
  <nav
    aria-label="Categorias relacionadas"
    className="text-body-sm text-ink-muted flex flex-wrap items-baseline gap-x-5 gap-y-2 py-10"
  >
    <span className="text-ink-subtle text-caption">Explorar</span>
    {categoryLinks(card).map((link) => (
      <Link
        key={`${link.param}-${link.value}`}
        to={`${ROUTES.CATALOG}?${link.param}=${encodeURIComponent(link.value)}`}
        className="text-ink hover:text-accent underline decoration-1 underline-offset-4 transition-colors"
      >
        {link.label}
      </Link>
    ))}
  </nav>
);

export const CardDetailPage = (): JSX.Element => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useSession();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    if (id === undefined) return;
    setState({ status: "loading" });
    void fetchCardDetail(id).then((result: Result<PublicCardDetail, SolverError>) => {
      if (!result.ok) {
        setState(
          result.error.code === "CARD_NOT_FOUND"
            ? { status: "not-found" }
            : { status: "error", message: result.error.message },
        );
      } else {
        setState({ status: "ok", card: result.value });
      }
    });
  }, [id]);

  if (state.status === "loading") {
    return (
      <main className="bg-surface text-ink-muted min-h-screen">
        <div
          className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-8 sm:px-6 md:py-12 lg:px-10"
          aria-busy="true"
        >
          <div className="bg-surface-sunken h-56 animate-pulse rounded-lg" />
          <div className="bg-surface-sunken h-64 animate-pulse rounded-lg" />
        </div>
      </main>
    );
  }

  if (state.status === "not-found") {
    return (
      <main className="bg-surface text-ink-muted min-h-screen">
        <RevealGroup className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-6">
          <RevealBlock>
            <Panel tone="raised" className="p-8">
              <p className="text-heading text-ink text-balance">Cartão não encontrado</p>
              <p className="text-body-sm text-ink-muted mt-2 text-pretty">
                O cartão que você está procurando não existe no catálogo.
              </p>
              <ButtonLink to={ROUTES.CATALOG} className="mt-6 inline-flex">
                Voltar ao catálogo
              </ButtonLink>
            </Panel>
          </RevealBlock>
        </RevealGroup>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="bg-surface text-ink-muted min-h-screen">
        <RevealGroup className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-6">
          <RevealBlock>
            <Panel tone="raised" className="p-8">
              <p className="text-body text-ink-muted text-pretty">{state.message}</p>
            </Panel>
          </RevealBlock>
        </RevealGroup>
      </main>
    );
  }

  return (
    <main className="bg-surface text-ink-muted min-h-screen">
      <RevealGroup className="mx-auto max-w-5xl px-5 py-8 sm:px-6 md:py-12 lg:px-10">
        <RevealBlock>
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <nav aria-label="Breadcrumb" className="text-body-sm text-ink-muted">
              <Link to={ROUTES.CATALOG} className="hover:text-accent">
                Catálogo
              </Link>
              <span className="hidden sm:inline">
                <span className="mx-2">/</span>
                <span className="text-ink">{state.card.name}</span>
              </span>
            </nav>
            <CardCompareButton card={state.card} />
          </div>
        </RevealBlock>
        <RevealBlock>
          <CardDetailHero card={state.card} profile={profile} />
        </RevealBlock>
        <RevealBlock>
          <CardDetailSections card={state.card} profile={profile} />
        </RevealBlock>
        <RevealBlock>
          <CardCategoryLinks card={state.card} />
        </RevealBlock>
      </RevealGroup>
    </main>
  );
};
