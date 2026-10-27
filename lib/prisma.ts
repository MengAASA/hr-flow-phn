import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/client";

declare global {
  var prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaMariaDb({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT) || 3306,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: 20,
    // MySQL 8's caching_sha2_password needs the server's RSA key for the first
    // login after a MySQL restart (its auth cache is empty). Without this, the
    // pool can't open connections until someone logs in another way.
    allowPublicKeyRetrieval: true,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

// Cache in every environment so separately bundled server code in the same
// process shares one connection pool instead of each opening its own.
export const prisma: PrismaClient = global.prisma ?? createPrismaClient();

global.prisma = prisma;
