# meu jardim digital

Este repositório é o meu blog pessoal — um "digital garden" em português (pt-BR) onde publico notas sobre desenvolvimento, tecnologia e outras coisas que estou explorando.

Ele é um monorepo simples gerenciado com `pnpm`, com duas aplicações independentes que conversam entre si:

- **`apps/web`**: o site em si, feito com [Astro](https://astro.build/) e gerado como site estático.
- **`apps/api`**: uma API pequena em [Bun](https://bun.sh/) + [Hono](https://hono.dev/) que conta visualizações de cada nota.

## Estrutura

```
.
├── apps/
│   ├── web/          # site estático (Astro)
│   │   ├── src/
│   │   │   ├── content/garden/   # notas em markdown
│   │   │   ├── pages/            # rotas do Astro
│   │   │   ├── layouts/          # layout compartilhado
│   │   │   └── components/       # componentes Astro
│   │   └── public/               # assets estáticos
│   └── api/          # contador de views (Bun + Hono + Turso)
│       ├── src/
│       ├── schema.sql
│       └── Dockerfile
├── docs/
│   └── DEPLOY.md     # instruções completas de deploy
├── deploy-web.sh     # script que sobe o site para o Cloudflare R2
├── package.json      # scripts do workspace
└── pnpm-workspace.yaml
```

## Como funciona a separação

O site é 100% estático. Quando alguém abre uma nota, o componente `ViewCount` faz uma requisição do navegador para a API (`POST /views/:slug`) e exibe o número de visualizações. A API armazena o total no Turso (libSQL) e evita contar o mesmo visitante mais de uma vez por dia.

A API roda em Cloud Run e o site fica hospedado no Cloudflare R2. O `ALLOWED_ORIGIN` da API precisa bater exatamente com a origem pública do site, senão o browser bloqueia por CORS.

## Comandos

Instala as dependências de tudo:

```bash
pnpm install
```

Rodar localmente:

```bash
# site Astro em http://localhost:4321
pnpm run dev:web

# API Bun com hot reload em http://localhost:3000
pnpm run dev:api
```

Build e testes:

```bash
pnpm run build:web        # gera apps/web/dist/
pnpm run test:api         # roda os testes da API com bun test
```

## Variáveis de ambiente

As credenciais ficam no `.env` na raiz (já está no `.gitignore`). O arquivo `.env.example` lista todas as variáveis esperadas sem valores reais. Nunca commita secrets.

As principais:

- `PUBLIC_API_URL`: URL pública da API que o site chama no cliente.
- `TURSO_URL` / `TURSO_TOKEN`: conexão com o banco libSQL da Turso.
- `ALLOWED_ORIGIN`: origem do site, usada no CORS da API.
- `R2_*`: credenciais do Cloudflare R2 para o deploy do site.

## Deploy

Para deploy em produção, veja [`docs/DEPLOY.md`](docs/DEPLOY.md). Em resumo:

- Site: `./deploy-web.sh` builda e sincroniza `apps/web/dist` com o bucket R2.
- API: `gcloud run deploy` a partir de `apps/api`, usando o `Dockerfile`.
- Banco: schema em `apps/api/schema.sql`, aplicado manualmente quando muda.
