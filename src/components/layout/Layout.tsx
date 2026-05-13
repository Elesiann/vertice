import type { JSX } from "react";
import { Outlet } from "react-router-dom";
import { CompareFloatingBar } from "@/features/compare/CompareFloatingBar";

export const Layout = (): JSX.Element => {
  return (
    <>
      <Outlet />
      <CompareFloatingBar />
    </>
  );
};
