# Test fixtures

> Per ADR-0001, real statements never leave the user's device. This directory
> holds **only synthetic** parser fixtures by default. Real-PDF-derived
> sanitized text is gitignored unless the contributor explicitly opts it in.
> Raw PDFs and pre-sanitization text never enter git.

## Two kinds of fixture

- **Synthetic** (`synthetic-*.txt` + `synthetic-*.expected.json`): authored
  by hand to mimic a bank's layout. Uses placeholder merchants ("Padaria
  Aleatoria", "Restaurante Y") and arbitrary amounts. Exercises the parser's
  regex against realistic structure without containing anyone's data. **The
  authoritative test fixtures committed to this repo.**
- **Anonymizer-derived** (any other `*.txt` + `*.expected.json` produced by
  `scripts/anonymize-fixture.ts`): defaults to gitignored. Even with
  redaction, sanitized statements may carry regional signal (merchant
  clustering points to a city) or behavioral signal (exact dates × amounts).
  Useful as a local development reference, not for the public repo.

  Contributors who reviewed their derived fixture and are confident it's
  safe to share can opt in by adding a specific `!pattern` line under the
  derived-fixture block in `.gitignore`.

## Layout

```
fixtures/
├── README.md                    # this file
├── nubank/
│   ├── raw/                     # gitignored: real PDFs and *.raw.txt
│   │   └── *.pdf                # never committed
│   ├── 2026-04-statement.txt          # sanitized text extract
│   └── 2026-04-statement.expected.json # expected ParserResult
├── itau/
│   └── ...
└── bradesco/
    └── ...
```

The `raw/` subdirectory and any `*.raw.txt` file is matched by `.gitignore`.
Confirm with `git check-ignore` before committing if you're uncertain.

## Workflow for adding a fixture

1. **Get a real PDF locally.** Drop it into `src/lib/__tests__/fixtures/<bank>/raw/`.
   Don't rename the file in a way that would carry PII (e.g. avoid the
   account holder's name).
2. **Run the anonymizer.** From the repo root:
   ```sh
   pnpm tsx scripts/anonymize-fixture.ts \
     src/lib/__tests__/fixtures/<bank>/raw/<file>.pdf \
     <bank> \
     <name>
   ```
   The script extracts the PDF text via pdfjs-dist, applies regex-based
   redaction (CPF, full card numbers, emails, phones), prompts you to confirm
   each detected name token, and writes:
   - `<bank>/<name>.txt` — sanitized text input for the parser
   - `<bank>/<name>.expected.json` — your authored expected `ParserResult`
     (the script bootstraps a skeleton you fill in)
3. **Inspect the output.** `git diff` should only show the two sanitized files.
   Any line you can't justify as non-identifying (merchant patterns,
   amounts at low-resolution, dates) — redact further by hand.
4. **Commit.** The parser snapshot tests pick up the fixture automatically.

## What the anonymizer redacts

- **CPF**: `\d{3}\.\d{3}\.\d{3}-\d{2}` → `[REDACTED-CPF]`
- **CNPJ**: `\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}` → `[REDACTED-CNPJ]`
- **Full card numbers**: `\d{4} \d{4} \d{4} \d{4}` → `[REDACTED-CARD]`.
  4-digit card suffixes (`•••• 3858`) are preserved — they're useful for
  multi-card detection and aren't sufficient to identify anyone.
- **Email**: standard email regex → `[REDACTED-EMAIL]`
- **Phone**: BR phone formats → `[REDACTED-PHONE]`
- **Names**: interactive prompt per detected ALL-CAPS or capitalized token
  block longer than 8 characters. Decline to redact if the token is a
  merchant name (e.g. "AMAZON", "MERCADO LIVRE").

## What the anonymizer does NOT touch

- Merchant names in transaction descriptions. Most are public business
  identifiers; sanitizing them would defeat the parser test (the parser
  needs to see realistic merchant strings to validate its categorization).
- Transaction amounts and dates. These reveal spending pattern but not
  identity. If you're uncomfortable with a particular amount, edit it
  manually after the script runs.
- The card brand and bank header text. These are the markers our `detect.ts`
  uses; redacting them would invalidate the test.

## What goes in `<name>.expected.json`

The full `ParserResult` shape (see `src/types.ts` and `src/lib/parser.ts`):

```jsonc
{
  "bank": "nubank",
  "fileName": "2026-04-statement.txt",
  "transactions": [
    {
      "id": "...",
      "date": "2026-04-15",
      "description": "...",
      "amountBrl": 100.5,
      "category": "domestic",
      "sourceFile": "2026-04-statement.txt",
      "bank": "nubank",
    },
  ],
  "detectedPeriod": { "start": "...", "end": "..." },
  "warnings": [],
  "checksum": 1234.56,
  "layoutFingerprint": "...",
  "layerUsed": "bank-specific",
}
```

The anonymizer scaffolds an empty shell; you fill in `transactions` by
inspecting the sanitized text against the parser's expected output.

## If you suspect a leak

1. Stop. Don't commit.
2. `git status` and `git diff --cached` — confirm what would be staged.
3. Delete the offending file from the working tree, redact, re-run.
4. If you accidentally committed: `git reset HEAD~` and re-do (don't push
   in between).
