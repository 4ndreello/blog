---
title: 'Astro Content Collections'
pubDate: 2026-06-20
tags: ['astro', 'typescript', 'ssg']
related:
  - title: 'Astro Docs — Content Collections'
    url: 'https://docs.astro.build/en/guides/content-collections/'
  - title: 'Zod Schema Validation'
    url: 'https://zod.dev/'
---

# Astro Content Collections

Astro Content Collections give you a type-safe way to organize Markdown and MDX files. Instead of loose files in `src/pages/`, you define a schema and let Astro generate types for you.

## Defining a collection

Create `src/content/config.ts` and use `defineCollection` with a Zod schema:

```ts
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
```

## Querying content

Use `getCollection` to fetch all entries, or `getEntry` to fetch a single one:

```ts
import { getCollection } from 'astro:content';
const posts = await getCollection('blog');
```

## Rendering entries

Each entry has a `.render()` method that returns the `Content` component:

```astro
---
const { Content } = await post.render();
---
<Content />
```

## Why it matters

- **Type safety** — frontmatter is validated at build time.
- **Organization** — content lives in one place, separate from presentation.
- **Performance** — Astro can optimize collections during the build.

If you are building a blog, documentation site, or digital garden, content collections are the idiomatic Astro way to manage content.
