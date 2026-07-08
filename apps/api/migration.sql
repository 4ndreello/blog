BEGIN IMMEDIATE;

-- legacy view_events rows were keyed by (slug, visitor, day); the same person
-- on different days has different visitor hashes. raw ip/ua logs are not stored,
-- so those hashes are copied as-is. permanent (slug, visitor) deduplication is
-- effective only for new views after this migration runs.

CREATE TABLE view_events_new (
  slug    TEXT NOT NULL,
  visitor TEXT NOT NULL,
  PRIMARY KEY (slug, visitor)
);

INSERT OR IGNORE INTO view_events_new (slug, visitor)
SELECT slug, visitor FROM view_events;

DROP TABLE view_events;

ALTER TABLE view_events_new RENAME TO view_events;

UPDATE views SET count = (
  SELECT COUNT(*) FROM view_events WHERE view_events.slug = views.slug
);

COMMIT;
