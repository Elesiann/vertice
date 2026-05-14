import type { JSX } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { SWRConfig } from "swr";
import { CompareFloatingBar } from "@/features/compare/CompareFloatingBar";

export const Layout = (): JSX.Element => {
  const location = useLocation();
  return (
    <LazyMotion features={domAnimation}>
      <SWRConfig value={{ revalidateOnFocus: false, dedupingInterval: 10 * 60 * 1000 }}>
        <m.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.12 }}
        >
          <Outlet />
        </m.div>
        <CompareFloatingBar />
      </SWRConfig>
    </LazyMotion>
  );
};
