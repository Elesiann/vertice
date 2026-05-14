import type { JSX } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CompareFloatingBar } from "@/features/compare/CompareFloatingBar";

export const Layout = (): JSX.Element => {
  const location = useLocation();
  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
      <CompareFloatingBar />
    </>
  );
};
