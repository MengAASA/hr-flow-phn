import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/client";
import { generateReferenceId } from "../lib/submission-code";

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: 10,
    allowPublicKeyRetrieval: true,
  }),
  log: ["warn", "error"],
});

// Picks a code that doesn't collide with any reference ID already handed out
// in this run (existingCodes is seeded from the DB up front, so this never
// needs to re-query it).
function pickUniqueCode(existingCodes: Set<string>): string {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateReferenceId();
    if (!existingCodes.has(code)) {
      existingCodes.add(code);
      return code;
    }
  }
  throw new Error("Failed to generate a unique reference ID after several attempts");
}

async function main() {
  const submissionsMissingCode = await prisma.formSubmission.findMany({
    where: { referenceId: null },
    select: { id: true },
  });

  console.log(
    `Found ${submissionsMissingCode.length} submission(s) without a reference ID.`,
  );

  if (submissionsMissingCode.length === 0) {
    return;
  }

  const submissionsWithCode = await prisma.formSubmission.findMany({
    where: { referenceId: { not: null } },
    select: { referenceId: true },
  });
  const existingCodes = new Set(
    submissionsWithCode.map((s) => s.referenceId as string),
  );

  let updated = 0;
  for (const submission of submissionsMissingCode) {
    const referenceId = pickUniqueCode(existingCodes);
    await prisma.formSubmission.update({
      where: { id: submission.id },
      data: { referenceId },
    });
    updated++;
  }

  console.log(`Backfilled ${updated} submission(s) with a unique reference ID.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
