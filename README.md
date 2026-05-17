# Vértice

Pare de deixar dinheiro na mesa.

O Vértice recomenda o cartão de crédito brasileiro que mais rende para o seu perfil de gasto. Você preenche seis campos - gasto mensal, renda, valor investível, programa preferido, viagens internacionais por ano e cartões atuais - e o app devolve o cartão com o maior retorno líquido projetado em 12 meses, decomposto em anuidade, retorno por programa, benefício de viagem e custo de câmbio.

Quando você preenche seus cartões atuais, o app também mostra quanto você está deixando de ganhar em reais por ano. Existe um catálogo navegável com filtros por banco, anuidade, sala VIP, IOF e marca, e um comparador lado a lado para até 4 cartões.

Catálogo independente, sem comissão de afiliado. O resultado é decomposto. Você vê de onde vem cada real do líquido.

## Por que existe

Comparadores de cartão brasileiros agrupam cartões por faixa de renda. Você diz que ganha R$ 10k, eles devolvem uma lista de 50 cartões "compatíveis", e a escolha sobra pra você.

Eu nunca vi um comparador que levasse em conta, ao mesmo tempo e com fidelidade, a renda, o total investido e o gasto mensal no cartão. Esses três entram no cálculo de coisas centrais - isenção de anuidade por spend, isenção por investimento, retorno absoluto do programa, breakeven da anuidade - e nenhum dos que eu testei usava os três para chegar num cartão recomendado. Mostravam o filtro, não a resposta.

O Vértice avalia o catálogo inteiro contra esses três valores e devolve um cartão.

## Como funciona

1. Você preenche seis campos no formulário: gasto mensal, renda (opcional), valor investível (opcional), forma de resgate preferida, viagens internacionais por ano e cartões atuais.
2. O app manda esse perfil para a API.
3. A API avalia o catálogo inteiro contra o seu perfil em sete dimensões: retorno econômico, encaixe das condições, custo, alinhamento com objetivo, eficiência da alocação, confiabilidade do produto e qualidade dos dados.
4. O app mostra o cartão recomendado, a decomposição do líquido em anuidade, retorno por programa, benefício de viagem e câmbio, e - quando você preencheu seus cartões atuais - quanto está deixando de ganhar.

Sem login e sem cookies de rastreamento. O perfil fica em `localStorage` no seu navegador, e a API não armazena nada.

## Instalação e uso

O frontend é um app Vite. Conversa com uma API privada, onde mora o motor de score.

```bash
pnpm install
cp .env.example .env
pnpm dev
```

O app sobe em `http://localhost:5173` e procura a API em `http://localhost:3333` por padrão.

O motor de score, chamado `score-lab`, vive num repositório separado e privado. Este repo é o cliente público. Os dois se comunicam só via HTTP.

Para rodar os checks:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
```

Build para produção:

```bash
pnpm build
pnpm preview
```

## Configuração

Defina em `.env`:

| Variável                                            | O que faz                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `VITE_API_URL`                                      | URL da API de score. Obrigatória em build de produção.                                      |
| `VITE_SENTRY_DSN`                                   | Opcional. O Sentry só inicializa quando o DSN é válido.                                     |
| `VITE_SENTRY_REPLAY`                                | `false` por padrão. Em `true`, o Replay grava sessões com texto, inputs e mídia mascarados. |
| `VITE_SENTRY_TRACES_SAMPLE_RATE`                    | Opcional. Em produção, sem valor explícito, usa `0.05`.                                     |
| `VITE_BUILD_SOURCEMAP`                              | `false` por padrão. Use em `true` quando subir source maps para o Sentry.                   |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Build-time. Usados só para upload de source maps.                                           |

Os headers mínimos que o app espera no host (CSP, Referrer-Policy, etc.) estão em [`DEPLOYMENT.md`](DEPLOYMENT.md).
