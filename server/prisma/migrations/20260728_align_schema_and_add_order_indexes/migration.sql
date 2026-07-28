-- Keep a fresh database compatible with the Prisma schema and application code.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';

ALTER TABLE "MenuItem"
  ADD COLUMN IF NOT EXISTS "name1" TEXT,
  ADD COLUMN IF NOT EXISTS "name2" TEXT,
  ADD COLUMN IF NOT EXISTS "name3" TEXT,
  ADD COLUMN IF NOT EXISTS "name4" TEXT,
  ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "clientRequestId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_clientRequestId_key"
  ON "Order"("clientRequestId");
CREATE INDEX IF NOT EXISTS "Order_status_createdAt_idx"
  ON "Order"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_tableId_createdAt_idx"
  ON "Order"("tableId", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_claimedById_claimedAt_idx"
  ON "Order"("claimedById", "claimedAt");
CREATE INDEX IF NOT EXISTS "Call_status_createdAt_idx"
  ON "Call"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Call_tableId_createdAt_idx"
  ON "Call"("tableId", "createdAt");
