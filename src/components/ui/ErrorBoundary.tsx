import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((retry: () => void) => ReactNode);
}

interface ErrorBoundaryState {
  hasError: boolean;
}

const DefaultFallback = ({ retry }: { retry: () => void }): ReactNode => (
  <div role="alert" className="mx-auto max-w-2xl p-6">
    <h2 className="text-ink text-xl font-semibold">Algo deu errado.</h2>
    <p className="text-ink-muted mt-2">
      Recarregue a página para continuar. Nada do que você subiu foi enviado a nenhum servidor —
      tudo acontece localmente no seu navegador.
    </p>
    <Button className="mt-4" onClick={retry}>
      Tentar novamente
    </Button>
  </div>
);

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("UI error caught by boundary:", error, info);
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
