import type { JSX } from "react";
import { Link } from "react-router-dom";
import { HeroValue } from "@/components/domain/HeroValue";
import { MathAccordion } from "@/components/domain/MathAccordion";
import { ShoutoutLine } from "@/components/domain/ShoutoutLine";
import { StackPair } from "@/components/domain/StackPair";
import { TravelTranslation } from "@/components/domain/TravelTranslation";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { useSession } from "@/context/SessionContext";
import { useRecommendation } from "@/hooks/useRecommendation";
import { ROUTES } from "@/routes";

export const ResultsView = (): JSX.Element => {
  const { profile } = useSession();
  const result = useRecommendation();

  if (profile === null) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6 text-center">
        <h1 className="text-2xl font-semibold text-ink">Nada pra mostrar ainda</h1>
        <p className="text-ink-muted">Preencha seus dados primeiro.</p>
        <div>
          <ButtonLink to={ROUTES.INPUT}>Ir pro formulário →</ButtonLink>
        </div>
      </div>
    );
  }

  if (result === null) {
    return (
      <div className="mx-auto max-w-3xl p-6 text-center">
        <p className="text-ink-muted">Calculando…</p>
      </div>
    );
  }

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6 text-center">
        <h1 className="text-2xl font-semibold text-ink">Não conseguimos recomendar</h1>
        <p className="text-ink-muted">{result.error.message}</p>
        <div>
          <Link to={ROUTES.INPUT} className="text-accent hover:underline">
            ← Voltar e ajustar os dados
          </Link>
        </div>
      </div>
    );
  }

  const recommendation = result.value;
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <HeroValue
        topNetValueBrl={recommendation.topStack.yearOneNetValueBrl}
        {...(recommendation.moneyOnTheTableBrl !== undefined
          ? { moneyOnTheTableBrl: recommendation.moneyOnTheTableBrl }
          : {})}
      />
      <StackPair stack={recommendation.topStack} />
      <TravelTranslation translation={recommendation.travelTranslation} />
      <MathAccordion stack={recommendation.topStack} />
      <ShoutoutLine text={recommendation.shoutout} />
      <div className="flex justify-center">
        <Link to={ROUTES.INPUT} className="text-sm text-ink-subtle hover:text-accent">
          Ajustar dados
        </Link>
      </div>
    </div>
  );
};
