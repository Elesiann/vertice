import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

const DEFAULT_FALLBACK = (
  <div className="mx-auto max-w-2xl p-6">
    <h2 className="text-xl font-semibold text-ink">Algo deu errado.</h2>
    <p className="mt-2 text-ink-muted">
      Recarregue a página para continuar. Nada do que você subiu foi enviado a nenhum servidor —
      tudo acontece localmente no seu navegador.
    </p>
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

  override render(): ReactNode {
    if (this.state.hasError) return this.props.fallback ?? DEFAULT_FALLBACK;
    return this.props.children;
  }
}
