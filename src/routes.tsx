import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "@/pages/HomePage";
import { InputPage } from "@/pages/InputPage";
import { ResultsPage } from "@/pages/ResultsPage";
import { CatalogPage } from "@/pages/CatalogPage";
import { CardDetailPage } from "@/pages/CardDetailPage";
import { ComparePage } from "@/pages/ComparePage";

export const ROUTES = {
  HOME: "/",
  INPUT: "/input",
  RESULTS: "/results",
  CATALOG: "/cards",
  CARD_DETAIL: "/cards/:id",
  COMPARE: "/compare",
} as const;

export const router = createBrowserRouter([
  { path: ROUTES.HOME, element: <HomePage /> },
  { path: ROUTES.INPUT, element: <InputPage /> },
  { path: ROUTES.RESULTS, element: <ResultsPage /> },
  { path: ROUTES.CATALOG, element: <CatalogPage /> },
  { path: ROUTES.CARD_DETAIL, element: <CardDetailPage /> },
  { path: ROUTES.COMPARE, element: <ComparePage /> },
]);
