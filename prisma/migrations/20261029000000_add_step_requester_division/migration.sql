-- AlterTable
ALTER TABLE `ApprovalFlowStep` ADD COLUMN `requesterDivisionMode` ENUM('ALL', 'ONLY', 'EXCEPT') NOT NULL DEFAULT 'ALL';

-- CreateTable
CREATE TABLE `ApprovalStepRequesterDivision` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stepId` INTEGER NOT NULL,
    `divisionId` INTEGER NOT NULL,

    UNIQUE INDEX `ApprovalStepRequesterDivision_stepId_divisionId_key`(`stepId`, `divisionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ApprovalStepRequesterDivision` ADD CONSTRAINT `ApprovalStepRequesterDivision_stepId_fkey` FOREIGN KEY (`stepId`) REFERENCES `ApprovalFlowStep`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApprovalStepRequesterDivision` ADD CONSTRAINT `ApprovalStepRequesterDivision_divisionId_fkey` FOREIGN KEY (`divisionId`) REFERENCES `Division`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Data: replace the hard-coded Human Capital rule for Man Power Requisition.
-- Requesters in "HUMAN CAPITAL AND ESG" used to skip every step with no
-- division/department/section scope. Those steps now carry that rule as data:
-- "applies to every requester except HUMAN CAPITAL AND ESG".
INSERT INTO `ApprovalStepRequesterDivision` (`stepId`, `divisionId`)
SELECT s.`id`, d.`id`
FROM `ApprovalFlowStep` s
JOIN `FormType` f ON f.`id` = s.`formTypeId`
JOIN `Division` d ON UPPER(TRIM(d.`name`)) = 'HUMAN CAPITAL AND ESG'
WHERE f.`name` = 'Man Power Requisition'
  AND s.`divisionId` IS NULL
  AND s.`departmentId` IS NULL
  AND s.`sectionId` IS NULL;

-- The table was created above, so every row in it came from the insert.
UPDATE `ApprovalFlowStep`
SET `requesterDivisionMode` = 'EXCEPT'
WHERE `id` IN (SELECT `stepId` FROM `ApprovalStepRequesterDivision`);
