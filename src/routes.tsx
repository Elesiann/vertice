import { createBrowserRouter } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { HomePage } from "@/pages/HomePage";
import { InputPage } from "@/pages/InputPage";
import { ResultsPage } from "@/pages/ResultsPage";
import { AlternativesPage } from "@/pages/AlternativesPage";
import { CatalogPage } from "@/pages/CatalogPage";
import { CardDetailPage } from "@/pages/CardDetailPage";
import { ComparePage } from "@/pages/ComparePage";
import { ROUTES } from "@/lib/routes-constants";

export { ROUTES };

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: ROUTES.HOME, element: <HomePage /> },
      { path: ROUTES.INPUT, element: <InputPage /> },
      { path: ROUTES.RESULTS, element: <ResultsPage /> },
      { path: ROUTES.ALTERNATIVES, element: <AlternativesPage /> },
      { path: ROUTES.CATALOG, element: <CatalogPage /> },
      { path: ROUTES.CARD_DETAIL, element: <CardDetailPage /> },
      { path: ROUTES.COMPARE, element: <ComparePage /> },
    ],
  },
]);
