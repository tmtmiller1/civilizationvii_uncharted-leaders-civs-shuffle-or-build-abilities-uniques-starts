-- Harness self-test: records that this file ran.
CREATE TABLE IF NOT EXISTS HarnessHits (Seq INTEGER PRIMARY KEY, Tag TEXT NOT NULL);
INSERT INTO HarnessHits (Tag) VALUES ('early');
