import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "@/pages/HomePage";

export const ROUTES = {
  HOME: "/",
  INPUT: "/input",
  RESULTS: "/results",
} as const;

export const router = createBrowserRouter([{ path: ROUTES.HOME, element: <HomePage /> }]);
