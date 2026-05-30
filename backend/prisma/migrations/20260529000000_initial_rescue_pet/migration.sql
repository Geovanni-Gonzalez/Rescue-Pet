-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VETERINARIAN', 'VOLUNTEER', 'ADOPTER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AnimalStatus" AS ENUM ('QUARANTINE', 'AVAILABLE', 'TREATMENT', 'ADOPTED', 'DECEASED');

-- CreateEnum
CREATE TYPE "AdoptionRequestStatus" AS ENUM ('RECEIVED', 'INTERVIEW', 'VISIT', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('ID_CARD', 'ADDRESS_PROOF');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('GENERATED', 'SIGNED');

-- CreateEnum
CREATE TYPE "VaccineStatus" AS ENUM ('PENDING', 'COMPLETED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('HEALTH', 'MEDICATION', 'CLEANING', 'FEEDING', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "photoUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'ADOPTER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "emailVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "activationToken" TEXT,
    "resetToken" TEXT,
    "resetTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Animal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "estimatedBreed" TEXT,
    "estimatedAge" INTEGER,
    "size" TEXT,
    "status" "AnimalStatus" NOT NULL DEFAULT 'QUARANTINE',
    "mainPhotoUrl" TEXT,
    "rescueLocationText" TEXT,
    "rescueLatitude" DOUBLE PRECISION,
    "rescueLongitude" DOUBLE PRECISION,
    "publicProfileUrl" TEXT,
    "qrUrl" TEXT,
    "energyLevel" TEXT,
    "spaceNeed" TEXT,
    "goodWithChildren" BOOLEAN NOT NULL DEFAULT false,
    "goodWithPets" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Animal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimalGallery" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnimalGallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimalStatusHistory" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "previousStatus" "AnimalStatus" NOT NULL,
    "newStatus" "AnimalStatus" NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnimalStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalRecord" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalEntry" (
    "id" TEXT NOT NULL,
    "clinicalRecordId" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "veterinarianId" TEXT NOT NULL,
    "datetime" TIMESTAMP(3) NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "treatment" TEXT NOT NULL,
    "medicine" TEXT,
    "dose" TEXT,
    "duration" TEXT,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vaccine" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "clinicalEntryId" TEXT,
    "vaccineType" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL,
    "nextDueAt" TIMESTAMP(3),
    "status" "VaccineStatus" NOT NULL DEFAULT 'PENDING',
    "postponedTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vaccine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompatibilityTest" (
    "id" TEXT NOT NULL,
    "adopterId" TEXT NOT NULL,
    "housingType" TEXT NOT NULL,
    "hasYard" BOOLEAN NOT NULL DEFAULT false,
    "childrenCount" INTEGER NOT NULL DEFAULT 0,
    "hasOtherPets" BOOLEAN NOT NULL DEFAULT false,
    "dailyAvailableTime" INTEGER NOT NULL,
    "allergies" TEXT,
    "experienceLevel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompatibilityTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompatibilityScore" (
    "id" TEXT NOT NULL,
    "adopterId" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "scorePercentage" DOUBLE PRECISION NOT NULL,
    "explanation" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompatibilityScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdoptionRequest" (
    "id" TEXT NOT NULL,
    "adopterId" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "status" "AdoptionRequestStatus" NOT NULL DEFAULT 'RECEIVED',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdoptionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewSlot" (
    "id" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "reservedByApplicationId" TEXT,
    "createdByAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdopterDocument" (
    "id" TEXT NOT NULL,
    "adopterId" TEXT NOT NULL,
    "applicationId" TEXT,
    "documentType" "DocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdopterDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdoptionContract" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "animalId" TEXT,
    "adopterId" TEXT,
    "pdfUrl" TEXT,
    "signedPdfUrl" TEXT,
    "signatureImageUrl" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'GENERATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signedAt" TIMESTAMP(3),

    CONSTRAINT "AdoptionContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalTask" (
    "id" TEXT NOT NULL,
    "animalId" TEXT,
    "type" "TaskType" NOT NULL,
    "assignedRole" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "comment" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationalTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadataJson" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_activationToken_key" ON "User"("activationToken");
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");
CREATE UNIQUE INDEX "ClinicalRecord_animalId_key" ON "ClinicalRecord"("animalId");
CREATE UNIQUE INDEX "CompatibilityTest_adopterId_key" ON "CompatibilityTest"("adopterId");
CREATE UNIQUE INDEX "CompatibilityScore_adopterId_animalId_key" ON "CompatibilityScore"("adopterId", "animalId");
CREATE UNIQUE INDEX "InterviewSlot_reservedByApplicationId_key" ON "InterviewSlot"("reservedByApplicationId");
CREATE UNIQUE INDEX "AdoptionContract_applicationId_key" ON "AdoptionContract"("applicationId");

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AnimalGallery" ADD CONSTRAINT "AnimalGallery_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnimalGallery" ADD CONSTRAINT "AnimalGallery_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AnimalStatusHistory" ADD CONSTRAINT "AnimalStatusHistory_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnimalStatusHistory" ADD CONSTRAINT "AnimalStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClinicalRecord" ADD CONSTRAINT "ClinicalRecord_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClinicalEntry" ADD CONSTRAINT "ClinicalEntry_clinicalRecordId_fkey" FOREIGN KEY ("clinicalRecordId") REFERENCES "ClinicalRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicalEntry" ADD CONSTRAINT "ClinicalEntry_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Vaccine" ADD CONSTRAINT "Vaccine_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Vaccine" ADD CONSTRAINT "Vaccine_clinicalEntryId_fkey" FOREIGN KEY ("clinicalEntryId") REFERENCES "ClinicalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CompatibilityTest" ADD CONSTRAINT "CompatibilityTest_adopterId_fkey" FOREIGN KEY ("adopterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CompatibilityScore" ADD CONSTRAINT "CompatibilityScore_adopterId_fkey" FOREIGN KEY ("adopterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CompatibilityScore" ADD CONSTRAINT "CompatibilityScore_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AdoptionRequest" ADD CONSTRAINT "AdoptionRequest_adopterId_fkey" FOREIGN KEY ("adopterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdoptionRequest" ADD CONSTRAINT "AdoptionRequest_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InterviewSlot" ADD CONSTRAINT "InterviewSlot_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InterviewSlot" ADD CONSTRAINT "InterviewSlot_reservedByApplicationId_fkey" FOREIGN KEY ("reservedByApplicationId") REFERENCES "AdoptionRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdopterDocument" ADD CONSTRAINT "AdopterDocument_adopterId_fkey" FOREIGN KEY ("adopterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdopterDocument" ADD CONSTRAINT "AdopterDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "AdoptionRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdoptionContract" ADD CONSTRAINT "AdoptionContract_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "AdoptionRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OperationalTask" ADD CONSTRAINT "OperationalTask_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OperationalTask" ADD CONSTRAINT "OperationalTask_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OperationalTask" ADD CONSTRAINT "OperationalTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
