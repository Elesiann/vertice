import { type JSX, type ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Panel } from "@/components/ui/Panel";
import { fetchCardCatalog } from "@/lib/api";
import { cn } from "@/lib/cn";
import { ROUTES } from "@/routes";

const useCatalogSize = (): number | null => {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchCardCatalog({})
      .then((r) => {
        if (!cancelled) setCount(r.count);
      })
      .catch(() => {
        // soft-fail: heading degrades sem o número
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return count;
};

export const HomePage = (): JSX.Element => {
  const catalogSize = useCatalogSize();
  return (
    <ErrorBoundary>
      <div className="bg-surface min-h-screen">
        <main className="mx-auto flex max-w-5xl flex-col gap-16 px-6 pt-14 pb-24 sm:gap-20 sm:pt-20">
          <Hero catalogSize={catalogSize} />
          <HowItWorks />
          <Trust catalogSize={catalogSize} />
          <Shortcuts />
        </main>
        <SiteFooter />
      </div>
    </ErrorBoundary>
  );
};

interface HeroProps {
  catalogSize: number | null;
}

const Hero = ({ catalogSize }: HeroProps): JSX.Element => (
  <section className="flex flex-col gap-6">
    <Badge tone="neutral" className="self-start">
      <span className="text-accent">●</span>
      {catalogSize !== null
        ? `${String(catalogSize)} cartões brasileiros · catálogo independente`
        : "Catálogo de cartões brasileiros · independente"}
    </Badge>

    <h1 className="text-display-1 text-ink max-w-3xl">
      Pare de deixar
      <br />
      dinheiro na mesa.
    </h1>

    <p className="text-ink-muted max-w-2xl text-lg leading-relaxed sm:text-xl">
      O Stackr avalia o catálogo de cartões e indica a combinação que maximiza seu retorno anual de
      acordo com seus gastos.
    </p>

    <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-3">
      <ButtonLink to={ROUTES.INPUT} size="lg">
        Calcular meu stack →
      </ButtonLink>
      <Link
        to={ROUTES.CATALOG}
        className="text-ink hover:text-accent text-base font-semibold underline-offset-4 transition hover:underline"
      >
        ou explorar o catálogo
      </Link>
    </div>
  </section>
);

interface StepProps {
  index: string;
  title: string;
  description: string;
}

const Step = ({ index, title, description }: StepProps): JSX.Element => (
  <Panel tone="raised" className="flex flex-col gap-3 p-5 sm:p-6">
    <span className="text-num text-ink-subtle text-3xl">{index}</span>
    <h3 className="text-subheading text-ink">{title}</h3>
    <p className="text-ink-muted text-sm leading-relaxed">{description}</p>
  </Panel>
);

const HowItWorks = (): JSX.Element => (
  <section className="flex flex-col gap-6">
    <SectionHeading eyebrow="Como funciona" title="Como o stack é calculado" />
    <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
      <Step
        index="01"
        title="Conte seu gasto"
        description="Você informa quanto gasta por mês no Brasil e em viagens, qual programa de pontos prefere e se já tem cartão hoje."
      />
      <Step
        index="02"
        title="Veja o cálculo"
        description="O Stackr avalia o catálogo inteiro e calcula o retorno anual de cada stack possível, considerando anuidade, pontos, sala VIP, seguro e câmbio."
      />
      <Step
        index="03"
        title="Compare com o seu"
        description="Você marca os cartões que já usa e o Stackr mostra exatamente quanto eles deixam na mesa por ano."
      />
    </div>
  </section>
);

interface DifferentiatorProps {
  title: string;
  body: string;
}

const Differentiator = ({ title, body }: DifferentiatorProps): JSX.Element => (
  <div className="border-line flex flex-col gap-2 border-t pt-5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5">
    <h3 className="text-ink text-base font-semibold">{title}</h3>
    <p className="text-ink-muted text-sm leading-relaxed">{body}</p>
  </div>
);

interface TrustProps {
  catalogSize: number | null;
}

const Trust = ({ catalogSize }: TrustProps): JSX.Element => (
  <section className="flex flex-col gap-6">
    <SectionHeading eyebrow="O método" title="Catálogo independente, score em sete dimensões">
      <p className="text-ink-muted max-w-2xl text-sm leading-relaxed">
        O Stackr não vende a recomendação.
      </p>
    </SectionHeading>
    <div className="grid gap-5 sm:grid-cols-3 sm:gap-x-8 sm:gap-y-0">
      <Differentiator
        title="Catálogo curado"
        body={
          catalogSize !== null
            ? `${String(catalogSize)} cartões verificados linha por linha contra sites dos bancos e regulamentos dos programas.`
            : "Cartões verificados linha por linha contra sites dos bancos e regulamentos dos programas."
        }
      />
      <Differentiator
        title="Score em sete dimensões"
        body="O cálculo combina retorno econômico, encaixe das condições, custo, alinhamento com objetivo, eficiência da alocação, confiabilidade do produto e qualidade dos dados."
      />
      <Differentiator
        title="Decomposição por benefício"
        body="Quando o cálculo inclui benefício de viagem, separamos sala VIP, seguro e bagagem. Você vê de onde vem cada real."
      />
    </div>
  </section>
);

interface ShortcutTileProps {
  to: string;
  label: string;
  detail: string;
}

const ShortcutTile = ({ to, label, detail }: ShortcutTileProps): JSX.Element => (
  <Link
    to={to}
    className={cn(
      "border-line bg-surface-raised group flex items-center justify-between gap-4 rounded-xl border px-5 py-4 transition",
      "hover:border-line-strong hover:bg-surface focus-visible:ring-accent",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    )}
  >
    <div className="flex flex-col gap-0.5">
      <span className="text-ink group-hover:text-accent text-base font-semibold transition-colors">
        {label}
      </span>
      <span className="text-ink-muted text-sm">{detail}</span>
    </div>
    <span aria-hidden className="text-ink-subtle group-hover:text-accent text-xl transition-colors">
      →
    </span>
  </Link>
);

const Shortcuts = (): JSX.Element => (
  <section className="flex flex-col gap-6">
    <SectionHeading eyebrow="Atalhos" />
    <div className="grid gap-3 sm:grid-cols-2">
      <ShortcutTile
        to={ROUTES.CATALOG}
        label="Explorar catálogo"
        detail="Filtros por banco, anuidade, sala VIP, IOF e marca."
      />
      <ShortcutTile
        to={ROUTES.COMPARE}
        label="Comparar lado a lado"
        detail="Até 4 cartões: anuidade, programa, cashback, sala VIP, seguro."
      />
    </div>
  </section>
);

interface SectionHeadingProps {
  eyebrow: string;
  title?: string;
  children?: ReactNode;
}

const SectionHeading = ({ eyebrow, title, children }: SectionHeadingProps): JSX.Element => (
  <div className="flex flex-col gap-2">
    <span className="text-caption text-ink-subtle">{eyebrow}</span>
    {title !== undefined && <h2 className="text-display-3 text-ink max-w-2xl">{title}</h2>}
    {children}
  </div>
);

const SiteFooter = (): JSX.Element => (
  <footer className="border-line border-t">
    <div className="text-ink-subtle mx-auto flex max-w-5xl flex-col gap-2 px-6 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
      <p>
        Catálogo curado mas pode conter imprecisões. Verifique com o emissor antes de contratar.
      </p>
      <p>stackr · v0.1 dev</p>
    </div>
  </footer>
);
