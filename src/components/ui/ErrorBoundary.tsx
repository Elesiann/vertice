import { Component, type ErrorInfo, type ReactNode } from "react";
import * as Sentry from "@sentry/react";
import { Button } from "@/components/ui/Button";
import { log } from "@/lib/log";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((retry: () => void) => ReactNode);
}

interface ErrorBoundaryState {
  hasError: boolean;
}

const clearClientData = (): void => {
  try {
    window.localStorage.clear();
  } catch (error) {
    log.error(error, { surface: "error-boundary-clear-local" });
  }
  try {
    window.sessionStorage.clear();
  } catch (error) {
    log.error(error, { surface: "error-boundary-clear-session" });
  }
  window.location.reload();
};

const DefaultFallback = ({ retry }: { retry: () => void }): ReactNode => (
  <div role="alert" className="mx-auto max-w-2xl p-6">
    <h2 className="text-ink text-xl font-semibold">Algo deu errado.</h2>
    <p className="text-ink-muted mt-2">
      Recarregue a página para continuar. Seu perfil fica salvo no navegador, mas o cálculo de
      recomendação usa a API do Vértice.
    </p>
    <div className="mt-4 flex flex-wrap gap-3">
      <Button onClick={retry}>Tentar novamente</Button>
      <Button variant="ghost" onClick={clearClientData}>
        Limpar dados e recarregar
      </Button>
    </div>
  </div>
);

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error("UI error caught by boundary:", error, info);
    }
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: info.componentStack ?? "",
        },
      },
    });
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      if (typeof this.props.fallback === "function") {
        return (this.props.fallback as (retry: () => void) => ReactNode)(this.handleRetry);
      }
      return this.props.fallback ?? <DefaultFallback retry={this.handleRetry} />;
    }
    return this.props.children;
  }
}
