// URL do repositório usada para abrir issues prefilled. Detectada via
// `git remote get-url origin`; mantemos como constante exportada porque
// é referenciada também pela página de detalhe/comparação no futuro.
export const REPO_URL = "https://github.com/Elesiann/vertice";

interface ErrorReportMetadata {
  stackLabel?: string | undefined;
  scenarioId?: string | undefined;
  scoreLabVersion?: string | undefined;
  ptaxRate?: number | undefined;
  ptaxSource?: string | undefined;
  ptaxFetchedAt?: string | undefined;
}

const formatField = (value: string | number | undefined): string => {
  if (value === undefined) return "(não informado)";
  if (typeof value === "number") return value.toString();
  return value;
};

export const buildErrorReportUrl = (metadata: ErrorReportMetadata = {}): string => {
  const title = "[Vértice] Erro de dados em recomendação";
  const body = [
    "<!-- Descreva o erro encontrado: o que aparece, o que esperava, qualquer print/captura. -->",
    "",
    "## Contexto",
    `- **Stack recomendado:** ${formatField(metadata.stackLabel)}`,
    `- **Cenário:** ${formatField(metadata.scenarioId)}`,
    `- **Versão score-lab:** ${formatField(metadata.scoreLabVersion)}`,
    `- **PTAX:** ${formatField(metadata.ptaxRate)} (${formatField(metadata.ptaxSource)}${
      metadata.ptaxFetchedAt !== undefined ? `, ${metadata.ptaxFetchedAt}` : ""
    })`,
    "",
    "## Descrição",
    "",
    "(escreva aqui)",
  ].join("\n");
  const params = new URLSearchParams({ title, body });
  return `${REPO_URL}/issues/new?${params.toString()}`;
};
