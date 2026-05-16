import { type JSX, useEffect } from "react";
import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom";
import * as Sentry from "@sentry/react";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ROUTES } from "@/lib/routes-constants";
import { NotFoundPage } from "@/pages/NotFoundPage";

const isError = (value: unknown): value is Error => value instanceof Error;

export const RouteErrorPage = (): JSX.Element => {
  const error = useRouteError();
  const navigate = useNavigate();

  useEffect(() => {
    if (isRouteErrorResponse(error) && error.status === 404) return;
    if (isError(error)) {
      Sentry.captureException(error, { tags: { surface: "route-error" } });
    } else {
      Sentry.captureMessage("Route error (non-Error thrown)", {
        level: "error",
        extra: { error: JSON.stringify(error) },
      });
    }
  }, [error]);

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />;
  }

  const devMessage = import.meta.env.DEV && isError(error) ? error.message : null;

  return (
    <main role="alert" className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
      <p className="text-ink-muted text-sm font-medium tracking-wider uppercase">Erro</p>
      <h1 className="text-display-3 text-ink mt-2">Esta página não carregou.</h1>
      <p className="text-body text-ink-muted mt-3">
        O erro foi registrado. Tente de novo; se persistir, volte para o catálogo ou recalcule seu
        perfil.
      </p>
      {devMessage !== null && (
        <pre className="bg-surface-sunken text-ink-muted mt-4 overflow-auto rounded-md p-3 text-xs">
          {devMessage}
        </pre>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          onClick={() => {
            void navigate(0);
          }}
        >
          Tentar de novo
        </Button>
        <ButtonLink to={ROUTES.CATALOG} variant="secondary">
          Ver catálogo
        </ButtonLink>
      </div>
    </main>
  );
};
