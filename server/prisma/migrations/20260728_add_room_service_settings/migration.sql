CREATE TABLE "RoomServiceSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "timezone" TEXT NOT NULL DEFAULT 'Europe/Sarajevo',
  "weeklySchedule" JSONB,
  "temporaryClosed" BOOLEAN NOT NULL DEFAULT false,
  "closedMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RoomServiceSettings_pkey" PRIMARY KEY ("id")
);
