import { lazy, Suspense, type ComponentType, type JSX } from "react";
import { createBrowserRouter } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/Skeleton";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { RouteErrorPage } from "@/pages/RouteErrorPage";
import { ROUTES } from "@/lib/routes-constants";

export { ROUTES };

const HomePage = lazy(() =>
  import("@/pages/HomePage").then((module) => ({ default: module.HomePage })),
);
const InputPage = lazy(() =>
  import("@/pages/InputPage").then((module) => ({ default: module.InputPage })),
);
const ResultsPage = lazy(() =>
  import("@/pages/ResultsPage").then((module) => ({ default: module.ResultsPage })),
);
const AlternativesPage = lazy(() =>
  import("@/pages/AlternativesPage").then((module) => ({ default: module.AlternativesPage })),
);
const CatalogPage = lazy(() =>
  import("@/pages/CatalogPage").then((module) => ({ default: module.CatalogPage })),
);
const CardDetailPage = lazy(() =>
  import("@/pages/CardDetailPage").then((module) => ({ default: module.CardDetailPage })),
);
const ComparePage = lazy(() =>
  import("@/pages/ComparePage").then((module) => ({ default: module.ComparePage })),
);
const AboutPage = lazy(() =>
  import("@/pages/AboutPage").then((module) => ({ default: module.AboutPage })),
);
const PrivacyPage = lazy(() =>
  import("@/pages/PrivacyPage").then((module) => ({ default: module.PrivacyPage })),
);
const TermsPage = lazy(() =>
  import("@/pages/TermsPage").then((module) => ({ default: module.TermsPage })),
);

const RouteFallback = (): JSX.Element => (
  <div className="mx-auto max-w-6xl px-4 py-10" aria-busy="true">
    <Skeleton className="mb-3 block h-8 w-1/3" label="Carregando página" />
    <Skeleton className="mb-2 block h-4 w-2/3" announce={false} />
    <Skeleton className="mb-6 block h-4 w-1/2" announce={false} />
    <div className="grid gap-4 sm:grid-cols-2">
      <Skeleton className="block h-32 w-full" announce={false} />
      <Skeleton className="block h-32 w-full" announce={false} />
    </div>
  </div>
);

const routeElement = (Component: ComponentType): JSX.Element => (
  <Suspense fallback={<RouteFallback />}>
    <Component />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: ROUTES.HOME, element: routeElement(HomePage), errorElement: <RouteErrorPage /> },
      { path: ROUTES.INPUT, element: routeElement(InputPage), errorElement: <RouteErrorPage /> },
      {
        path: ROUTES.RESULTS,
        element: routeElement(ResultsPage),
        errorElement: <RouteErrorPage />,
      },
      {
        path: ROUTES.ALTERNATIVES,
        element: routeElement(AlternativesPage),
        errorElement: <RouteErrorPage />,
      },
      {
        path: ROUTES.CATALOG,
        element: routeElement(CatalogPage),
        errorElement: <RouteErrorPage />,
      },
      {
        path: ROUTES.CARD_DETAIL,
        element: routeElement(CardDetailPage),
        errorElement: <RouteErrorPage />,
      },
      {
        path: ROUTES.COMPARE,
        element: routeElement(ComparePage),
        errorElement: <RouteErrorPage />,
      },
      { path: ROUTES.ABOUT, element: routeElement(AboutPage), errorElement: <RouteErrorPage /> },
      {
        path: ROUTES.PRIVACY,
        element: routeElement(PrivacyPage),
        errorElement: <RouteErrorPage />,
      },
      { path: ROUTES.TERMS, element: routeElement(TermsPage), errorElement: <RouteErrorPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
