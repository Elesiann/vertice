import type { JSX } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

interface PageMetaProps {
  title: string;
  description: string;
  canonical?: string;
  noindex?: boolean;
  ogImage?: string;
}

const SITE_ORIGIN = "https://vertice.cards";

// jsdom unit tests don't wrap render() in HelmetProvider; rather than touching
// 30+ test files, no-op in test mode. SEO is validated end-to-end by Playwright
// against the built bundle (Fase 4 of the production-grade rollout).
const IS_TEST = import.meta.env.MODE === "test";

export const PageMeta = ({
  title,
  description,
  canonical,
  noindex,
  ogImage,
}: PageMetaProps): JSX.Element | null => {
  const { pathname } = useLocation();
  if (IS_TEST) return null;
  const resolvedCanonical = canonical ?? `${SITE_ORIGIN}${pathname}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={resolvedCanonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={resolvedCanonical} />
      {ogImage !== undefined && <meta property="og:image" content={ogImage} />}
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {ogImage !== undefined && <meta name="twitter:image" content={ogImage} />}
      {noindex === true && <meta name="robots" content="noindex,nofollow" />}
    </Helmet>
  );
};
