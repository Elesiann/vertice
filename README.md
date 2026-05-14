# Vértice

Pare de deixar dinheiro na mesa.

Vértice encontra o melhor cartão de crédito para o seu perfil de gastos — calcula retorno real considerando anuidade, pontos, salas VIP, seguro viagem, câmbio e benefícios. Catálogo independente, score auditável, sem viés de venda.

## Stack

- **React 19** + **React Router 7** (SPA)
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

### Qualidade

```bash
pnpm typecheck
pnpm lint
pnpm test
```

### Build

```bash
pnpm build
pnpm preview
```

### Build

```bash
pnpm build
pnpm preview
```
