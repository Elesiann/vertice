import { type JSX, type ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { RevealBlock, RevealMain } from "@/components/ui/Reveal";
import { PageMeta } from "@/components/seo/PageMeta";
import { fetchCardCatalog } from "@/lib/api";
import { cn } from "@/lib/cn";
import { ROUTES } from "@/routes";
import packageJson from "../../package.json";

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
      <PageMeta
        title="Vértice — Ache o melhor cartão de crédito para o seu perfil"
        description="Compare cartões de crédito e descubra qual oferece o maior retorno real para seus gastos. Anuidade, pontos, cashback, salas VIP e benefícios calculados sem viés."
      />
      <div className="bg-surface min-h-screen">
        <RevealMain
          className="mx-auto flex max-w-5xl flex-col gap-16 px-6 pt-14 pb-24 sm:gap-20 sm:pt-20"
          delayChildren={0.03}
        >
          <RevealBlock>
            <Hero catalogSize={catalogSize} />
          </RevealBlock>
          <RevealBlock>
            <Trust catalogSize={catalogSize} />
          </RevealBlock>
          <RevealBlock>
            <HowItWorks />
          </RevealBlock>
          <RevealBlock>
            <Shortcuts />
          </RevealBlock>
        </RevealMain>
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
      {catalogSize !== null
        ? `${String(catalogSize)} cartões · catálogo independente`
        : "Catálogo independente"}
    </Badge>

    <h1 className="text-display-1 text-ink max-w-3xl">
      Pare de deixar
      <br />
      dinheiro na mesa.
    </h1>

    <p className="text-ink-muted max-w-2xl text-lg leading-relaxed sm:text-xl">
      O ponto ótimo entre gasto e retorno. Calcule o cartão que rende mais com seu perfil.
    </p>

    <div className="flex flex-col items-start gap-3">
      <ButtonLink to={ROUTES.INPUT} size="lg">
        Calcular →
      </ButtonLink>
      <Link
        to={ROUTES.CATALOG}
        className="text-ink-muted hover:text-ink text-sm font-medium underline-offset-4 transition hover:underline"
      >
        Explorar catálogo
      </Link>
    </div>
  </section>
);

const HowItWorks = (): JSX.Element => (
  <section className="flex flex-col items-center gap-4 text-center sm:items-start sm:text-left">
    <SectionHeading eyebrow="Como funciona" title="Como o cálculo funciona" />
    <ol className="text-ink-muted flex flex-col items-center gap-1 text-sm sm:flex-row sm:flex-wrap sm:gap-x-2 sm:gap-y-1">
      <li className="inline-flex items-center justify-center gap-2">
        <span className="text-accent-muted tabular font-semibold">1.</span>
        Conte seu gasto
      </li>
      <li aria-hidden className="text-ink-subtle text-xs sm:hidden">
        ↓
      </li>
      <li aria-hidden className="text-ink-subtle hidden text-xs sm:block">
        →
      </li>
      <li className="inline-flex items-center justify-center gap-2">
        <span className="text-accent-muted tabular font-semibold">2.</span>
        Veja o cálculo
      </li>
      <li aria-hidden className="text-ink-subtle text-xs sm:hidden">
        ↓
      </li>
      <li aria-hidden className="text-ink-subtle hidden text-xs sm:block">
        →
      </li>
      <li className="inline-flex items-center justify-center gap-2">
        <span className="text-accent-muted tabular font-semibold">3.</span>
        Compare com o seu
      </li>
    </ol>
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
        O Vértice não vende a recomendação.
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
    <SectionHeading eyebrow="Não quer calcular agora?" />
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
    <div className="text-ink-subtle mx-auto flex max-w-5xl flex-col gap-2 p-6 text-xs sm:flex-row sm:items-center sm:justify-between">
      <p>
        Catálogo curado mas pode conter imprecisões. Verifique com o emissor antes de contratar.
      </p>
      <p>Vértice · v{packageJson.version}</p>
    </div>
  </footer>
);
