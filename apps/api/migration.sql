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
