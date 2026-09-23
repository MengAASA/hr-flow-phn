import crypto from "crypto";
import { prisma } from "./prisma";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomSegment(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return result;
}

// e.g. "7GQ-K2X-9AB"
export function generateReferenceId(): string {
  return `${randomSegment(3)}-${randomSegment(3)}-${randomSegment(3)}`;
}

export async function generateUniqueReferenceId(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateReferenceId();
    const existing = await prisma.formSubmission.findUnique({
      where: { referenceId: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error("Failed to generate a unique submission reference ID");
}
