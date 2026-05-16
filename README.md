# Vértice

Pare de deixar dinheiro na mesa.

Vértice encontra o melhor cartão de crédito para o seu perfil de gastos — calcula retorno real considerando anuidade, pontos, salas VIP, seguro viagem, câmbio e benefícios. Catálogo independente, score auditável, sem viés de venda.

## Stack

- **React 18.3.1** + **React Router 7** (SPA)
- **Tailwind CSS 4** com design tokens personalizados
- **Vite** (build + dev server)
- **SWR** (cache de catálogo)
- **TypeScript** strict
- **Vitest** + **Testing Library**
- **pnpm**

## Roteiro

| Rota               | Página                  |
| ------------------ | ----------------------- |
| `/`                | Home                    |
| `/input`           | Perfil de gastos        |
| `/results`         | Recomendação            |
| `/results/cartoes` | Alternativas ranqueadas |
| `/cards`           | Catálogo de cartões     |
| `/cards/:id`       | Detalhe do cartão       |
| `/compare`         | Comparação lado a lado  |

## Desenvolvimento

```bash
pnpm install
cp .env.example .env
pnpm dev
```

A API roda separadamente em `http://localhost:3333` (repositório privado).
Em produção, `VITE_API_URL` é obrigatório; o fallback para localhost existe só em dev/test.

### Qualidade

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:coverage
pnpm build
```

### Variáveis

- `VITE_API_URL`: URL da API usada pelo frontend.
- `VITE_SENTRY_DSN`: opcional; Sentry só inicializa com DSN válido.
- `VITE_SENTRY_REPLAY`: `false` por padrão.
- `VITE_SENTRY_TRACES_SAMPLE_RATE`: opcional; produção usa `0.05` quando vazio.
- `VITE_BUILD_SOURCEMAP`: `false` por padrão; use junto com upload Sentry quando necessário.
- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`: usados só para upload de sourcemaps.

### Build

```bash
pnpm build
pnpm preview
```

### Produção

Checklist de deploy e headers mínimos: [`DEPLOYMENT.md`](DEPLOYMENT.md).
