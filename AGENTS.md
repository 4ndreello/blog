# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal digital garden / blog built with Astro (static output), content in Portuguese (pt-BR). Uses pnpm as package manager.

## Commands

```
pnpm install         # install deps
astro dev --background   # start dev server (see below)
astro dev stop        # stop background dev server
astro dev status       # check background dev server status
astro dev logs        # view background dev server logs
pnpm run build        # build static site to ./dist/
pnpm run preview       # preview production build locally
pnpm run astro check     # type-check .astro files
```

Always start the dev server in background mode (`astro dev --background`), not `pnpm run dev` directly, so it doesn't block the session.

No test suite or linter is configured in this repo.

## Architecture

- **Content collections**: garden notes live as markdown in `src/content/garden/*.md`, loaded via the `glob` loader and validated by a zod schema defined in `src/content.config.ts` (fields: `title`, `pubDate`, `updatedDate?`, `tags[]`, `related[]` with `{title, url}`). Any new note just needs a markdown file with matching frontmatter — no registration elsewhere.
- **Routing**: `src/pages/index.astro` is the landing/hero page. `src/pages/garden/index.astro` lists all garden entries (sorted by `pubDate` desc) via `getCollection('garden')`. `src/pages/garden/[slug].astro` is a dynamic route using `getStaticPaths` (slug = `post.id`) to statically render each note's content with `render(post)`.
- **Layout**: `src/layouts/Layout.astro` is the single shared shell — defines the global CSS custom properties (colors, spacing, radii, shadows) including light/dark theme via `prefers-color-scheme`, plus `.prose` styles used for rendered markdown content. All pages wrap content in this layout.
- **Components** (`src/components/`): `GardenCard` (list item preview), `ReadingTime` (word-count-based estimate, 200 wpm), `TagList`, `RelatedLinks` — all small presentational Astro components consuming collection entry data directly.
- **Output**: static site (`output: 'static'` in `astro.config.mjs`), deployed to GCP (Cloud Storage + Load Balancer + CDN) — see `docs/DEPLOY.md` and `gcp-deploy.sh` for the deploy pipeline.
