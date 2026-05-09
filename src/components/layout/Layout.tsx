import type { JSX } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { CurrentCardBanner } from "@/components/domain/CurrentCardBanner";
import { ROUTES } from "@/lib/routes-constants";

export const Layout = (): JSX.Element => {
  const { pathname } = useLocation();
  const showBanner = pathname !== ROUTES.INPUT && pathname !== ROUTES.RESULTS;
  return (
    <>
      {showBanner ? <CurrentCardBanner /> : null}
      <Outlet />
    </>
  );
};
