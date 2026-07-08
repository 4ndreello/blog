CREATE TABLE IF NOT EXISTS views (
  slug  TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS view_events (
  slug    TEXT NOT NULL,
  visitor TEXT NOT NULL,
  PRIMARY KEY (slug, visitor)
);
