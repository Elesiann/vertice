import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type * as ReactRouterDomNS from "react-router-dom";
import * as Sentry from "@sentry/react";

type ReactRouterDom = typeof ReactRouterDomNS;

const routeError = { current: new Error("boom for tests") as unknown };

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<ReactRouterDom>("react-router-dom");
  return {
    ...actual,
    useRouteError: () => routeError.current,
  };
});

vi.mock("@sentry/react", async () => {
  const actual = await vi.importActual<typeof Sentry>("@sentry/react");
  return {
    ...actual,
    captureException: vi.fn(),
    captureMessage: vi.fn(),
  };
});

const renderPage = async (): Promise<void> => {
  const { RouteErrorPage } = await import("@/pages/RouteErrorPage");
  render(
    <MemoryRouter>
      <RouteErrorPage />
    </MemoryRouter>,
  );
};

describe("RouteErrorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeError.current = new Error("boom for tests");
  });

  it("renders the generic error UI for an unknown error and reports to Sentry", async () => {
    await renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /esta página não carregou/i,
    );
    expect(screen.getByRole("button", { name: /tentar de novo/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    });
  });

  it("falls back to the 404 page when the error is a 404 route response", async () => {
    routeError.current = {
      status: 404,
      statusText: "Not Found",
      data: null,
      internal: false,
    };
    await renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/página não encontrada/i);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
