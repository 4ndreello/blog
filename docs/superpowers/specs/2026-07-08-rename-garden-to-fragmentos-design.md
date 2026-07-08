# Rename `garden` → `fragmentos`

**Date:** 2026-07-08
**Scope:** rótulo visível + rota (URL). Nomes internos de código ficam `garden`.

## Objetivo

Trocar o nome da seção de notas de "garden" para "fragmentos" — mais pessoal, menos genérico, e a semântica ("pedaço incompleto, não precisa estar pronto") encaixa melhor que o termo genérico "garden".

## Escopo

### Muda — URL / rota
- Renomear dir `apps/web/src/pages/garden/` → `apps/web/src/pages/fragmentos/`.
  - `index.astro` e `[slug].astro` vão junto.
- URL pública passa de `/garden/` para `/fragmentos/`.
- IDs de post (slug) **não mudam** — vêm de `content/garden/`, que não é tocado.

### Não muda — código interno (fica `garden`)
- Content collection `garden` e `getCollection('garden')`.
- Dir de conteúdo `content/garden/`.
- `content.config.ts`.
- Nome do arquivo `GardenCard.astro` e o import dele.

### Muda — texto visível
| Arquivo | De | Para |
|---|---|---|
| `pages/index.astro:5` | `title="Andreello — Digital Garden"` | `title="Andreello — Fragmentos"` |
| `pages/index.astro:21-28` | prose "digital garden" + metáfora de planta | prose reescrita (ver abaixo) |
| `pages/index.astro:32` | `explorar o garden →` + `href="/garden/"` | `explorar os fragmentos →` + `href="/fragmentos/"` |
| `pages/fragmentos/index.astro:10` | `Garden — Notas e Ideias` | `Fragmentos` |
| `pages/fragmentos/index.astro:13` | `<h1>Garden</h1>` | `<h1>Fragmentos</h1>` |
| `pages/fragmentos/[slug].astro:39` | `${title} — Garden` | `${title} — Fragmentos` |

### Prose nova (`index.astro:19-29`)

> Estes são meus **fragmentos**: anotações sobre engenharia, infraestrutura e aprendizado,
> escritas fora de ordem. Alguns são só uma ideia solta; outros, revisitados e lapidados
> com o tempo. Nenhum precisa estar "pronto".
>
> Aqui não há cronologia rígida. Há conexões. Cada fragmento aponta para outros, formando
> uma teia de conhecimento que reflete como realmente aprendemos: de forma associativa, não linear.

(`<em>fragmentos</em>` mantém o itálico do termo, igual `digital garden` era.)

## Deploy

- Sem redirect (garden vazio, zero posts, ninguém linkou `/garden/`).
- `deploy-web.sh` roda `--delete` → objetos antigos de `/garden/` somem do R2. URL antiga passa a 404. Aceito.

## Testes / validação

- `pnpm --filter web astro check` — type-check passa.
- `pnpm run build:web` — build gera `dist/fragmentos/index.html` e `dist/fragmentos/<slug>/`.
- Nenhum `garden` visível remanescente: `grep -rniE "garden" apps/web/src/pages apps/web/src/layouts` só deve bater em nomes de arquivo/import internos, não em texto visível.
