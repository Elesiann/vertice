import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "@/pages/HomePage";
import { ReviewPage } from "@/pages/ReviewPage";
import { UploadPage } from "@/pages/UploadPage";

export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/upload", element: <UploadPage /> },
  { path: "/review", element: <ReviewPage /> },
]);
