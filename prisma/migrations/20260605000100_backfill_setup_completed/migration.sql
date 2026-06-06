-- Backfill: existing restaurants predate the setup wizard, so mark them complete
-- (only brand-new signups should be routed through onboarding).
UPDATE "Restaurant"
SET "setupCompletedAt" = COALESCE("createdAt", now())
WHERE "setupCompletedAt" IS NULL;
