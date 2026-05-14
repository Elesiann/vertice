# Vertice Frontend

React + Vite frontend for Vertice recommendation flows.

## Requirements

- Node.js 20+
- pnpm 10+
- Vertice API running separately (private repo)

## Setup

```bash
pnpm install
cp .env.example .env
```

By default, the frontend calls `http://localhost:3333`.

To use a different API URL, set:

```bash
VITE_API_URL=https://your-api-host
```

## Development

```bash
pnpm dev
```

## Quality checks

```bash
pnpm typecheck
pnpm test
pnpm lint
```

## Build

```bash
pnpm build
pnpm preview
```
