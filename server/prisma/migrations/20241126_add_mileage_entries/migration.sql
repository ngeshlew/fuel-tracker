-- CreateEnum
CREATE TYPE "MileageEntryType" AS ENUM ('MANUAL', 'FUEL_LINKED');

-- CreateTable
CREATE TABLE "mileage_entries" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "odometer_reading" DECIMAL(65,30) NOT NULL,
    "trip_distance" DECIMAL(65,30),
    "trip_purpose" TEXT,
    "notes" TEXT,
    "linked_fuel_topup_id" TEXT,
    "type" "MileageEntryType" NOT NULL DEFAULT 'MANUAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mileage_entries_pkey" PRIMARY KEY ("id")
);

