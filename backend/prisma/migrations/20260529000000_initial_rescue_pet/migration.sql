BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(1000) NOT NULL,
    [fullName] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [passwordHash] NVARCHAR(1000) NOT NULL,
    [phone] NVARCHAR(1000),
    [photoUrl] NVARCHAR(1000),
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [User_role_df] DEFAULT 'ADOPTER',
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [User_status_df] DEFAULT 'ACTIVE',
    [emailVerifiedAt] DATETIME2,
    [lastLoginAt] DATETIME2,
    [failedLoginCount] INT NOT NULL CONSTRAINT [User_failedLoginCount_df] DEFAULT 0,
    [lockedUntil] DATETIME2,
    [activationToken] NVARCHAR(1000),
    [resetToken] NVARCHAR(1000),
    [resetTokenExpiresAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- Filtered unique indexes on nullable unique columns (SQL Server only allows 1 NULL in UNIQUE CONSTRAINT)
CREATE UNIQUE NONCLUSTERED INDEX [User_activationToken_key] ON [dbo].[User]([activationToken]) WHERE [activationToken] IS NOT NULL;
CREATE UNIQUE NONCLUSTERED INDEX [User_resetToken_key] ON [dbo].[User]([resetToken]) WHERE [resetToken] IS NOT NULL;

-- CreateTable
CREATE TABLE [dbo].[Animal] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [species] NVARCHAR(1000) NOT NULL,
    [estimatedBreed] NVARCHAR(1000),
    [estimatedAge] INT,
    [size] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Animal_status_df] DEFAULT 'QUARANTINE',
    [mainPhotoUrl] NVARCHAR(1000),
    [rescueLocationText] NVARCHAR(1000),
    [rescueLatitude] FLOAT,
    [rescueLongitude] FLOAT,
    [publicProfileUrl] NVARCHAR(1000),
    [qrUrl] NVARCHAR(MAX),
    [energyLevel] NVARCHAR(1000),
    [spaceNeed] NVARCHAR(1000),
    [goodWithChildren] BIT NOT NULL CONSTRAINT [Animal_goodWithChildren_df] DEFAULT 0,
    [goodWithPets] BIT NOT NULL CONSTRAINT [Animal_goodWithPets_df] DEFAULT 0,
    [createdByUserId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Animal_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Animal_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AnimalGallery] (
    [id] NVARCHAR(1000) NOT NULL,
    [animalId] NVARCHAR(1000) NOT NULL,
    [fileUrl] NVARCHAR(1000) NOT NULL,
    [fileType] NVARCHAR(1000) NOT NULL,
    [isMain] BIT NOT NULL CONSTRAINT [AnimalGallery_isMain_df] DEFAULT 0,
    [uploadedByUserId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AnimalGallery_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AnimalGallery_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AnimalStatusHistory] (
    [id] NVARCHAR(1000) NOT NULL,
    [animalId] NVARCHAR(1000) NOT NULL,
    [previousStatus] NVARCHAR(1000) NOT NULL,
    [newStatus] NVARCHAR(1000) NOT NULL,
    [changedByUserId] NVARCHAR(1000) NOT NULL,
    [reason] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AnimalStatusHistory_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AnimalStatusHistory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ClinicalRecord] (
    [id] NVARCHAR(1000) NOT NULL,
    [animalId] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ClinicalRecord_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ClinicalRecord_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ClinicalRecord_animalId_key] UNIQUE NONCLUSTERED ([animalId])
);

-- CreateTable
CREATE TABLE [dbo].[ClinicalEntry] (
    [id] NVARCHAR(1000) NOT NULL,
    [clinicalRecordId] NVARCHAR(1000) NOT NULL,
    [animalId] NVARCHAR(1000) NOT NULL,
    [veterinarianId] NVARCHAR(1000) NOT NULL,
    [datetime] DATETIME2 NOT NULL,
    [diagnosis] NVARCHAR(MAX) NOT NULL,
    [treatment] NVARCHAR(MAX) NOT NULL,
    [medicine] NVARCHAR(1000),
    [dose] NVARCHAR(1000),
    [duration] NVARCHAR(1000),
    [observations] NVARCHAR(MAX),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ClinicalEntry_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ClinicalEntry_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Vaccine] (
    [id] NVARCHAR(1000) NOT NULL,
    [animalId] NVARCHAR(1000) NOT NULL,
    [clinicalEntryId] NVARCHAR(1000),
    [vaccineType] NVARCHAR(1000) NOT NULL,
    [appliedAt] DATETIME2 NOT NULL,
    [nextDueAt] DATETIME2,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Vaccine_status_df] DEFAULT 'PENDING',
    [postponedTo] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Vaccine_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Vaccine_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[CompatibilityTest] (
    [id] NVARCHAR(1000) NOT NULL,
    [adopterId] NVARCHAR(1000) NOT NULL,
    [housingType] NVARCHAR(1000) NOT NULL,
    [hasYard] BIT NOT NULL CONSTRAINT [CompatibilityTest_hasYard_df] DEFAULT 0,
    [childrenCount] INT NOT NULL CONSTRAINT [CompatibilityTest_childrenCount_df] DEFAULT 0,
    [hasOtherPets] BIT NOT NULL CONSTRAINT [CompatibilityTest_hasOtherPets_df] DEFAULT 0,
    [dailyAvailableTime] INT NOT NULL,
    [allergies] NVARCHAR(1000),
    [experienceLevel] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [CompatibilityTest_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [CompatibilityTest_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [CompatibilityTest_adopterId_key] UNIQUE NONCLUSTERED ([adopterId])
);

-- CreateTable
CREATE TABLE [dbo].[CompatibilityScore] (
    [id] NVARCHAR(1000) NOT NULL,
    [adopterId] NVARCHAR(1000) NOT NULL,
    [animalId] NVARCHAR(1000) NOT NULL,
    [scorePercentage] FLOAT NOT NULL,
    [explanation] NVARCHAR(MAX),
    [calculatedAt] DATETIME2 NOT NULL CONSTRAINT [CompatibilityScore_calculatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [CompatibilityScore_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [CompatibilityScore_adopterId_animalId_key] UNIQUE NONCLUSTERED ([adopterId], [animalId])
);

-- CreateTable
CREATE TABLE [dbo].[AdoptionRequest] (
    [id] NVARCHAR(1000) NOT NULL,
    [adopterId] NVARCHAR(1000) NOT NULL,
    [animalId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [AdoptionRequest_status_df] DEFAULT 'RECEIVED',
    [rejectionReason] NVARCHAR(MAX),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AdoptionRequest_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [AdoptionRequest_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[InterviewSlot] (
    [id] NVARCHAR(1000) NOT NULL,
    [startsAt] DATETIME2 NOT NULL,
    [endsAt] DATETIME2 NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [InterviewSlot_status_df] DEFAULT 'available',
    [reservedByApplicationId] NVARCHAR(1000),
    [createdByAdminId] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [InterviewSlot_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [InterviewSlot_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [InterviewSlot_reservedByApplicationId_key] UNIQUE NONCLUSTERED ([reservedByApplicationId])
);

-- CreateTable
CREATE TABLE [dbo].[AdopterDocument] (
    [id] NVARCHAR(1000) NOT NULL,
    [adopterId] NVARCHAR(1000) NOT NULL,
    [applicationId] NVARCHAR(1000),
    [documentType] NVARCHAR(1000) NOT NULL,
    [fileUrl] NVARCHAR(1000) NOT NULL,
    [fileName] NVARCHAR(1000) NOT NULL,
    [version] INT NOT NULL CONSTRAINT [AdopterDocument_version_df] DEFAULT 1,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [AdopterDocument_status_df] DEFAULT 'ACTIVE',
    [uploadedAt] DATETIME2 NOT NULL CONSTRAINT [AdopterDocument_uploadedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AdopterDocument_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AdoptionContract] (
    [id] NVARCHAR(1000) NOT NULL,
    [applicationId] NVARCHAR(1000) NOT NULL,
    [animalId] NVARCHAR(1000),
    [adopterId] NVARCHAR(1000),
    [pdfUrl] NVARCHAR(1000),
    [signedPdfUrl] NVARCHAR(1000),
    [signatureImageUrl] NVARCHAR(MAX),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [AdoptionContract_status_df] DEFAULT 'GENERATED',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AdoptionContract_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [signedAt] DATETIME2,
    CONSTRAINT [AdoptionContract_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AdoptionContract_applicationId_key] UNIQUE NONCLUSTERED ([applicationId])
);

-- CreateTable
CREATE TABLE [dbo].[Notification] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [message] NVARCHAR(MAX) NOT NULL,
    [resourceType] NVARCHAR(1000),
    [resourceId] NVARCHAR(1000),
    [readAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Notification_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Notification_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[OperationalTask] (
    [id] NVARCHAR(1000) NOT NULL,
    [animalId] NVARCHAR(1000),
    [type] NVARCHAR(1000) NOT NULL,
    [assignedRole] NVARCHAR(1000) NOT NULL,
    [scheduledAt] DATETIME2 NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [OperationalTask_status_df] DEFAULT 'PENDING',
    [description] NVARCHAR(MAX),
    [completedAt] DATETIME2,
    [completedById] NVARCHAR(1000),
    [comment] NVARCHAR(MAX),
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [OperationalTask_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [OperationalTask_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AuditLog] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [action] NVARCHAR(1000) NOT NULL,
    [entityType] NVARCHAR(1000) NOT NULL,
    [entityId] NVARCHAR(1000) NOT NULL,
    [metadataJson] NVARCHAR(MAX),
    [ipAddress] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Animal] ADD CONSTRAINT [Animal_createdByUserId_fkey]
    FOREIGN KEY ([createdByUserId]) REFERENCES [dbo].[User]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[AnimalGallery] ADD CONSTRAINT [AnimalGallery_animalId_fkey]
    FOREIGN KEY ([animalId]) REFERENCES [dbo].[Animal]([id])
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE [dbo].[AnimalGallery] ADD CONSTRAINT [AnimalGallery_uploadedByUserId_fkey]
    FOREIGN KEY ([uploadedByUserId]) REFERENCES [dbo].[User]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[AnimalStatusHistory] ADD CONSTRAINT [AnimalStatusHistory_animalId_fkey]
    FOREIGN KEY ([animalId]) REFERENCES [dbo].[Animal]([id])
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE [dbo].[AnimalStatusHistory] ADD CONSTRAINT [AnimalStatusHistory_changedByUserId_fkey]
    FOREIGN KEY ([changedByUserId]) REFERENCES [dbo].[User]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[ClinicalRecord] ADD CONSTRAINT [ClinicalRecord_animalId_fkey]
    FOREIGN KEY ([animalId]) REFERENCES [dbo].[Animal]([id])
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE [dbo].[ClinicalEntry] ADD CONSTRAINT [ClinicalEntry_clinicalRecordId_fkey]
    FOREIGN KEY ([clinicalRecordId]) REFERENCES [dbo].[ClinicalRecord]([id])
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE [dbo].[ClinicalEntry] ADD CONSTRAINT [ClinicalEntry_veterinarianId_fkey]
    FOREIGN KEY ([veterinarianId]) REFERENCES [dbo].[User]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[Vaccine] ADD CONSTRAINT [Vaccine_animalId_fkey]
    FOREIGN KEY ([animalId]) REFERENCES [dbo].[Animal]([id])
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE [dbo].[Vaccine] ADD CONSTRAINT [Vaccine_clinicalEntryId_fkey]
    FOREIGN KEY ([clinicalEntryId]) REFERENCES [dbo].[ClinicalEntry]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[CompatibilityTest] ADD CONSTRAINT [CompatibilityTest_adopterId_fkey]
    FOREIGN KEY ([adopterId]) REFERENCES [dbo].[User]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[CompatibilityScore] ADD CONSTRAINT [CompatibilityScore_adopterId_fkey]
    FOREIGN KEY ([adopterId]) REFERENCES [dbo].[User]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[CompatibilityScore] ADD CONSTRAINT [CompatibilityScore_animalId_fkey]
    FOREIGN KEY ([animalId]) REFERENCES [dbo].[Animal]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[AdoptionRequest] ADD CONSTRAINT [AdoptionRequest_adopterId_fkey]
    FOREIGN KEY ([adopterId]) REFERENCES [dbo].[User]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[AdoptionRequest] ADD CONSTRAINT [AdoptionRequest_animalId_fkey]
    FOREIGN KEY ([animalId]) REFERENCES [dbo].[Animal]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[InterviewSlot] ADD CONSTRAINT [InterviewSlot_createdByAdminId_fkey]
    FOREIGN KEY ([createdByAdminId]) REFERENCES [dbo].[User]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[InterviewSlot] ADD CONSTRAINT [InterviewSlot_reservedByApplicationId_fkey]
    FOREIGN KEY ([reservedByApplicationId]) REFERENCES [dbo].[AdoptionRequest]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[AdopterDocument] ADD CONSTRAINT [AdopterDocument_adopterId_fkey]
    FOREIGN KEY ([adopterId]) REFERENCES [dbo].[User]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[AdopterDocument] ADD CONSTRAINT [AdopterDocument_applicationId_fkey]
    FOREIGN KEY ([applicationId]) REFERENCES [dbo].[AdoptionRequest]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[AdoptionContract] ADD CONSTRAINT [AdoptionContract_applicationId_fkey]
    FOREIGN KEY ([applicationId]) REFERENCES [dbo].[AdoptionRequest]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[Notification] ADD CONSTRAINT [Notification_userId_fkey]
    FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[OperationalTask] ADD CONSTRAINT [OperationalTask_animalId_fkey]
    FOREIGN KEY ([animalId]) REFERENCES [dbo].[Animal]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[OperationalTask] ADD CONSTRAINT [OperationalTask_completedById_fkey]
    FOREIGN KEY ([completedById]) REFERENCES [dbo].[User]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[OperationalTask] ADD CONSTRAINT [OperationalTask_createdById_fkey]
    FOREIGN KEY ([createdById]) REFERENCES [dbo].[User]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[AuditLog] ADD CONSTRAINT [AuditLog_userId_fkey]
    FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW;

END CATCH
