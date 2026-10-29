-- Man Power Requisition: add the senior Head of Division step (MOHD SHAZALI)
-- as step 3, for requesters from BUSINESS DEVELOPMENT & STRATEGY and
-- DHMSB OPERATIONS only. Current steps 3+ move down by one.
--
-- Before running:
--   1. Migration 20261029000000_add_step_requester_division is applied
--      (`npx prisma migrate deploy`).
--   2. MOHD SHAZALI (M0348) is NOT in either of those two divisions, or step 2
--      will pick him up as a second Head of Division.
--
-- Safe to re-run: it does nothing if the step already exists, or if the form
-- type, user or either division can't be found. Check the result rows at the
-- end before relying on it.

START TRANSACTION;

SET @form    := (SELECT `id` FROM `FormType` WHERE `name` = 'Man Power Requisition');
SET @shazali := (SELECT `id` FROM `User` WHERE `staffid` = 'M0348');
SET @bd      := (SELECT `id` FROM `Division` WHERE `name` = 'BUSINESS DEVELOPMENT & STRATEGY');
SET @dhmsb   := (SELECT `id` FROM `Division` WHERE `name` = 'DHMSB OPERATIONS');
SET @already := (
  SELECT COUNT(*)
  FROM `ApprovalStepApprover` a
  JOIN `ApprovalFlowStep` s ON s.`id` = a.`stepId`
  WHERE s.`formTypeId` = @form AND a.`userId` = @shazali
);
SET @ok := (@form IS NOT NULL AND @shazali IS NOT NULL AND @bd IS NOT NULL
            AND @dhmsb IS NOT NULL AND @already = 0);

-- Make room at position 3
UPDATE `ApprovalFlowStep`
SET `order` = `order` + 1
WHERE @ok AND `formTypeId` = @form AND `order` >= 3;

-- The step itself: manual approver, applies ONLY to the listed divisions
INSERT INTO `ApprovalFlowStep`
  (`formTypeId`, `order`, `role`, `approverSource`, `approvalMode`, `stepType`, `requesterDivisionMode`)
SELECT @form, 3, 'HEAD_OF_DIVISION', 'MANUAL', 'ALL', 'APPROVER', 'ONLY'
FROM DUAL WHERE @ok;

SET @step := IF(@ok, LAST_INSERT_ID(), NULL);

INSERT INTO `ApprovalStepApprover` (`stepId`, `userId`)
SELECT @step, @shazali FROM DUAL WHERE @ok;

INSERT INTO `ApprovalStepRequesterDivision` (`stepId`, `divisionId`)
SELECT @step, @bd FROM DUAL WHERE @ok
UNION ALL
SELECT @step, @dhmsb FROM DUAL WHERE @ok;

COMMIT;

-- Result
SELECT
  CASE
    WHEN @already > 0 THEN 'SKIPPED: step already exists'
    WHEN @ok THEN 'DONE: step added'
    ELSE 'SKIPPED: form type, user or division not found'
  END AS outcome,
  @form AS formTypeId, @shazali AS shazaliUserId, @bd AS bdDivisionId,
  @dhmsb AS dhmsbDivisionId, @step AS newStepId;

SELECT
  s.`order`,
  s.`id` AS stepId,
  s.`approverSource`,
  s.`role`,
  (SELECT GROUP_CONCAT(u.`fullname` SEPARATOR ', ')
     FROM `ApprovalStepApprover` a JOIN `User` u ON u.`id` = a.`userId`
    WHERE a.`stepId` = s.`id`) AS approvers,
  s.`requesterDivisionMode`,
  (SELECT GROUP_CONCAT(d.`name` SEPARATOR ', ')
     FROM `ApprovalStepRequesterDivision` r JOIN `Division` d ON d.`id` = r.`divisionId`
    WHERE r.`stepId` = s.`id`) AS requesterDivisions
FROM `ApprovalFlowStep` s
WHERE s.`formTypeId` = @form
ORDER BY s.`order`;

-- Shazali's division, as a reminder to check prerequisite 2
SELECT u.`fullname`, d.`name` AS division
FROM `User` u LEFT JOIN `Division` d ON d.`id` = u.`divisionId`
WHERE u.`staffid` = 'M0348';
