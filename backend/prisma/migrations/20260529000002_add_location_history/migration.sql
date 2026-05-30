BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[AnimalRescueLocationHistory] (
    [id] NVARCHAR(1000) NOT NULL,
    [animalId] NVARCHAR(1000) NOT NULL,
    [locationText] NVARCHAR(1000),
    [latitude] FLOAT,
    [longitude] FLOAT,
    [changedByUserId] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AnimalRescueLocationHistory_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AnimalRescueLocationHistory_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[AnimalRescueLocationHistory] ADD CONSTRAINT [AnimalRescueLocationHistory_animalId_fkey]
    FOREIGN KEY ([animalId]) REFERENCES [dbo].[Animal]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE [dbo].[AnimalRescueLocationHistory] ADD CONSTRAINT [AnimalRescueLocationHistory_changedByUserId_fkey]
    FOREIGN KEY ([changedByUserId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
