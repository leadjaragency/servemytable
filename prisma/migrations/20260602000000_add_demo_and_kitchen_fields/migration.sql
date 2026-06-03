-- AlterTable: add open-demo flag and no-login kitchen capability token to Restaurant
ALTER TABLE "Restaurant" ADD COLUMN "isPublicDemo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Restaurant" ADD COLUMN "kitchenToken" TEXT;

-- CreateIndex: kitchenToken must be unique (nullable uniques allow multiple NULLs in Postgres)
CREATE UNIQUE INDEX "Restaurant_kitchenToken_key" ON "Restaurant"("kitchenToken");
