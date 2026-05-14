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

### Observabilidade

Vértice inclui as seguintes ferramentas de observabilidade:

- **Sentry**: Rastreamento de erros e desempenho, com source maps em produção
- **Cloudflare Web Analytics**: Análise de uso leve e sem cookies, integrada ao Cloudflare Pages
- **UptimeRobot**: Monitoramento de disponibilidade (configurar externamente)

Para configurar em ambiente de produção:

1. Crie contas nos serviços respectivos (exceto Cloudflare Web Analytics, que é nativo do Pages)
2. Defina as variáveis de ambiente no Cloudflare Pages:
   - `VITE_API_URL` — URL da API
   - `VITE_SENTRY_DSN` — Chave de acesso do Sentry
   - `SENTRY_ORG` — Organização no Sentry
   - `SENTRY_PROJECT` — Projeto no Sentry
   - `SENTRY_AUTH_TOKEN` — Token de autenticação do Sentry (permissão `project:write`)
3. O UptimeRobot é configurado externamente através de seu painel

### Build

```bash
pnpm build
pnpm preview
```
