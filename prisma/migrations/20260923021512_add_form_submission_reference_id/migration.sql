-- AlterTable
ALTER TABLE `FormSubmission` ADD COLUMN `referenceId` VARCHAR(11) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `FormSubmission_referenceId_key` ON `FormSubmission`(`referenceId`);
