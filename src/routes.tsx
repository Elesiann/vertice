import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "@/pages/HomePage";
import { ReviewPage } from "@/pages/ReviewPage";
import { UploadPage } from "@/pages/UploadPage";

export const ROUTES = {
  HOME: "/",
  UPLOAD: "/upload",
  REVIEW: "/review",
} as const;

export const router = createBrowserRouter([
  { path: ROUTES.HOME, element: <HomePage /> },
  { path: ROUTES.UPLOAD, element: <UploadPage /> },
  { path: ROUTES.REVIEW, element: <ReviewPage /> },
]);
