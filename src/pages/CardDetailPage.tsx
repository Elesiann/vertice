import type { JSX } from "react";
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchCardDetail } from "@/lib/api";
import { CardDetailHero } from "@/features/card-detail/CardDetailHero";
import { CardDetailSections } from "@/features/card-detail/CardDetailSections";
import { Panel } from "@/components/ui/Panel";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ROUTES } from "@/routes";
import type { PublicCardDetail, SolverError } from "@/types";
import type { Result } from "@/lib/result";

type State =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "ok"; card: PublicCardDetail };

export const CardDetailPage = (): JSX.Element => {
  const { id } = useParams<{ id: string }>();
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
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8" aria-busy="true">
        <div className="bg-surface-sunken h-40 animate-pulse rounded-xl" />
        <div className="bg-surface-sunken h-64 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (state.status === "not-found") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Panel tone="raised" className="p-8">
          <p className="text-heading text-ink">Cartão não encontrado</p>
          <p className="text-body-sm text-ink-muted mt-2">
            O cartão que você está procurando não existe no catálogo.
          </p>
          <ButtonLink to={ROUTES.CATALOG} className="mt-6 inline-flex">
            Voltar ao catálogo
          </ButtonLink>
        </Panel>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Panel tone="raised" className="p-8">
          <p className="text-body text-ink-muted">{state.message}</p>
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8">
      <nav aria-label="Breadcrumb" className="text-body-sm text-ink-muted">
        <Link to={ROUTES.CATALOG} className="hover:text-accent">
          Catálogo
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{state.card.name}</span>
      </nav>
      <CardDetailHero card={state.card} />
      <CardDetailSections card={state.card} />
    </div>
  );
};
