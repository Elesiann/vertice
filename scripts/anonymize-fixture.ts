#!/usr/bin/env tsx
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, basename, join, extname } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

interface Redactor {
  name: string;
  pattern: RegExp;
  replacement: string;
}

const REDACTORS: readonly Redactor[] = [
  { name: "CPF", pattern: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, replacement: "[REDACTED-CPF]" },
  {
    name: "CNPJ (formatted)",
    pattern: /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g,
    replacement: "[REDACTED-CNPJ]",
  },
  {
    name: "CNPJ (14 contiguous digits)",
    pattern: /\b\d{14}\b/g,
    replacement: "[REDACTED-CNPJ]",
  },
  {
    name: "Full card number",
    pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    replacement: "[REDACTED-CARD]",
  },
  {
    name: "Email",
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    replacement: "[REDACTED-EMAIL]",
  },
  {
    name: "BR phone",
    pattern: /\(\d{2}\)\s*\d{4,5}-?\d{4}/g,
    replacement: "[REDACTED-PHONE]",
  },
];

const NAME_CANDIDATE_PATTERN = /\b[A-ZÀ-Ý][A-ZÀ-Ý]{2,}(?:\s+[A-ZÀ-Ý][A-ZÀ-Ý]+){1,4}\b/g;

const extractAllText = async (pdfPath: string): Promise<string> => {
  const data = new Uint8Array(await readFile(pdfPath));
  const document = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const fragments: string[] = [];
    for (const item of content.items) {
      if (typeof item !== "object" || !("str" in item)) continue;
      const v = item as { str: unknown; hasEOL?: unknown };
      if (typeof v.str !== "string") continue;
      fragments.push(v.str);
      if (v.hasEOL === true) fragments.push("\n");
    }
    pages.push(fragments.join(""));
  }
  return pages.join("\n");
};

const applyRegexRedaction = (text: string): { text: string; counts: Map<string, number> } => {
  const counts = new Map<string, number>();
  let result = text;
  for (const { name, pattern, replacement } of REDACTORS) {
    const matches = result.match(pattern);
    if (matches) counts.set(name, matches.length);
    result = result.replace(pattern, replacement);
  }
  return { text: result, counts };
};

const redactExactNames = (
  text: string,
  names: readonly string[],
): { text: string; redactedNames: number } => {
  let result = text;
  let redacted = 0;
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const before = result;
    result = result.replace(new RegExp(escaped, "gi"), "[REDACTED-NAME]");
    if (result !== before) redacted += 1;
  }
  return { text: result, redactedNames: redacted };
};

const promptInteractiveNames = async (
  text: string,
): Promise<{ text: string; redactedNames: number }> => {
  const candidates = new Set(text.match(NAME_CANDIDATE_PATTERN) ?? []);
  if (candidates.size === 0) return { text, redactedNames: 0 };

  const rl = createInterface({ input, output });
  let result = text;
  let redacted = 0;
  console.log(`\nFound ${String(candidates.size)} ALL-CAPS name candidates.`);
  console.log("For each, type 'y' to redact, 'n' to keep, or 's' to skip the rest.\n");

  for (const candidate of candidates) {
    const answer = (await rl.question(`Redact "${candidate}"? [y/N/s]: `)).trim().toLowerCase();
    if (answer === "s") break;
    if (answer === "y") {
      const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(new RegExp(escaped, "g"), "[REDACTED-NAME]");
      redacted += 1;
    }
  }
  rl.close();
  return { text: result, redactedNames: redacted };
};

interface CliArgs {
  pdfPath: string;
  bank: string;
  name: string;
  names: string[];
}

const parseArgs = (argv: readonly string[]): CliArgs | null => {
  const positional: string[] = [];
  let names: string[] = [];
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--names") {
      const value = argv[i + 1];
      if (value === undefined) return null;
      names = value
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      i += 1;
    } else if (arg !== undefined) {
      positional.push(arg);
    }
  }
  const [pdfPath, bank, name] = positional;
  if (!pdfPath || !bank || !name) return null;
  return { pdfPath, bank, name, names };
};

const buildExpectedSkeleton = (bank: string, name: string): object => ({
  bank,
  fileName: `${name}.txt`,
  transactions: [],
  detectedPeriod: { start: "TODO-fill-in", end: "TODO-fill-in" },
  warnings: [],
  checksum: 0,
  layoutFingerprint: null,
  layerUsed: "bank-specific",
});

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv);
  if (!args) {
    console.error(
      "usage: pnpm anonymize-fixture <pdf-path> <bank> <fixture-name> [--names 'NAME1,NAME2']",
    );
    console.error("examples:");
    console.error("  pnpm anonymize-fixture ./raw/abr.pdf nubank 2026-04-statement");
    console.error("  pnpm anonymize-fixture ./raw/abr.pdf nubank 2026-04-statement \\");
    console.error("    --names 'JOHN DOE,MARY DOE'");
    process.exitCode = 1;
    return;
  }
  const { pdfPath, bank, name, names } = args;
  if (extname(pdfPath).toLowerCase() !== ".pdf") {
    console.error("Input must be a .pdf file.");
    process.exitCode = 1;
    return;
  }

  console.log(`Extracting text from ${basename(pdfPath)}...`);
  const rawText = await extractAllText(pdfPath);

  console.log("Applying regex redaction...");
  const { text: regexed, counts } = applyRegexRedaction(rawText);
  for (const [redactorName, count] of counts) {
    console.log(`  redacted ${String(count)} ${redactorName}`);
  }

  const nameResult =
    names.length > 0 ? redactExactNames(regexed, names) : await promptInteractiveNames(regexed);
  const { text: anonymized, redactedNames } = nameResult;
  console.log(`  redacted ${String(redactedNames)} name(s)`);

  const fixturesRoot = join(
    dirname(new URL(import.meta.url).pathname),
    "..",
    "src",
    "lib",
    "__tests__",
    "fixtures",
    bank,
  );
  await mkdir(fixturesRoot, { recursive: true });

  const txtPath = join(fixturesRoot, `${name}.txt`);
  const jsonPath = join(fixturesRoot, `${name}.expected.json`);
  await writeFile(txtPath, anonymized, "utf8");
  await writeFile(jsonPath, JSON.stringify(buildExpectedSkeleton(bank, name), null, 2), "utf8");

  console.log(`\nWrote sanitized text:    ${txtPath}`);
  console.log(`Wrote expected skeleton: ${jsonPath}`);
  console.log(
    "\nNext steps: open the .txt, verify nothing identifying remains, " +
      "then fill in the .expected.json transactions array based on the " +
      "actual PDF content.",
  );
};

main().catch((err: unknown) => {
  console.error("anonymize-fixture failed:", err);
  process.exitCode = 1;
});
