import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "@/pages/HomePage";
import { InputPage } from "@/pages/InputPage";
import { ResultsPage } from "@/pages/ResultsPage";

export const ROUTES = {
  HOME: "/",
  INPUT: "/input",
  RESULTS: "/results",
} as const;

export const router = createBrowserRouter([
  { path: ROUTES.HOME, element: <HomePage /> },
  { path: ROUTES.INPUT, element: <InputPage /> },
  { path: ROUTES.RESULTS, element: <ResultsPage /> },
]);
