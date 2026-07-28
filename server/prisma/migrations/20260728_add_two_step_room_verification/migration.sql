CREATE TABLE "RoomVerificationSession" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "RoomVerificationSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RoomVerificationSession_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RoomVerificationSession_tokenHash_key" ON "RoomVerificationSession"("tokenHash");
CREATE INDEX "RoomVerificationSession_roomId_expiresAt_idx" ON "RoomVerificationSession"("roomId", "expiresAt");
