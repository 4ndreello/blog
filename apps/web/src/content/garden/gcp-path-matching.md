---
title: 'GCP Path Matching'
pubDate: 2026-07-01
updatedDate: 2026-07-05
tags: ['gcp', 'load-balancer', 'regex']
related:
  - title: 'URL Maps'
    url: 'https://cloud.google.com/load-balancing/docs/url-maps'
  - title: 'Cloud Armor'
    url: 'https://cloud.google.com/armor/docs'
  - title: 'Routing'
    url: 'https://cloud.google.com/load-balancing/docs/routing'
---

# GCP Path Matching

Google Cloud Load Balancers use **URL maps** to route incoming requests based on host, path, or query parameters. Understanding how path matching works is essential to designing reliable ingress rules.

## Exact vs. Prefix matching

When you define a path rule, you can choose between:

- `exact` — the request path must match character-for-character.
- `prefix` — the request path must start with the given string.

Prefix matching is the most common choice for API versioning:

```
/v1/*  → backend-v1
/v2/*  → backend-v2
```

## Regex-based routing

For more complex scenarios, you can use **regular expressions** inside URL map path matchers. This is useful when you need to capture segments, enforce patterns, or reject malformed IDs.

Example: route any path that contains a valid UUID in the second segment:

```regex
^/api/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.*$
```

## Priority and ordering

Rules are evaluated in the order they appear in the URL map. The first match wins. Place the most specific rules at the top and fallback rules at the bottom.

## Common pitfalls

1. **Trailing slashes** — `/users` and `/users/` are different paths unless you normalize them in your application.
2. **Case sensitivity** — path matching is case-sensitive by default.
3. **Query strings** — path matchers do not consider query parameters; use header-based rules if you need to route by query.

## Takeaway

Start with prefix matching, move to exact matching for critical endpoints, and reserve regex for dynamic segments that you cannot express otherwise.
