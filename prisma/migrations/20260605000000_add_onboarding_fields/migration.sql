-- AlterTable: add richer onboarding fields to Restaurant (all additive / nullable)
ALTER TABLE "Restaurant" ADD COLUMN "city" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN "province" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN "postalCode" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN "timezone" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN "website" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN "approxTables" INTEGER;
ALTER TABLE "Restaurant" ADD COLUMN "planInterest" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN "referralSource" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN "marketingOptIn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Restaurant" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "Restaurant" ADD COLUMN "setupCompletedAt" TIMESTAMP(3);
