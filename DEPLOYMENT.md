# Deploy

## Variaveis obrigatorias

- `VITE_API_URL`: URL publica da API. Obrigatoria em build de producao.
- `VITE_SENTRY_DSN`: opcional. Sentry so inicializa quando o DSN tem formato valido.
- `VITE_SENTRY_REPLAY`: `false` por padrao. Se virar `true`, Replay roda com texto, inputs e midia mascarados.
- `VITE_SENTRY_TRACES_SAMPLE_RATE`: opcional. Sem valor explicito, producao usa `0.05`.
- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`: usados apenas para upload de sourcemaps.
- `VITE_BUILD_SOURCEMAP`: `false` por padrao. Com upload Sentry, o build gera sourcemap `hidden` e o plugin remove `.map` depois do upload.

## Headers minimos do host

Configure no CDN/host antes de publicar:

- `Content-Security-Policy` restringindo `default-src 'self'`, API em `connect-src`, Sentry em `connect-src` quando ativo, e fontes/imagens conforme o host real.
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`

## Dados do usuario

O perfil financeiro fica em `localStorage` neste navegador. O frontend envia esse perfil para `POST /score-lab/recommendations` para calcular a recomendacao. O cache local de recomendacao pode guardar o ultimo resultado validado por `catalogVersion` e `solverVersion`; ao limpar o perfil, o cache tambem e removido.

## Contrato da API

O frontend valida respostas em runtime antes de renderizar dados vindos da API.
Ao alterar `/cards/options`, `/cards/catalog`, `/cards/:id` ou
`/score-lab/recommendations`, confira tambem o espelho em
`src/lib/api-schemas.ts` e os DTOs do backend em
`/home/gio/stackr-api/src/http/public-dto.ts`.
