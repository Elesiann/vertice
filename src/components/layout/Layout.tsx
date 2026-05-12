import type { JSX } from "react";
import { Outlet } from "react-router-dom";

export const Layout = (): JSX.Element => {
  return (
    <>
      <Outlet />
    </>
  );
};
