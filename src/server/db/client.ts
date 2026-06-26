import { PrismaClient } from "@prisma/client";

// Singleton do PrismaClient — evita esgotar o pool em dev (HMR) e reusa a instância
// no serverless. Só é CONSTRUÍDO quando há DATABASE_URL (ver getRepository), então
// o demo zero-config nunca instancia o cliente.
const globalForPrisma = globalThis as unknown as { __brechaPrisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.__brechaPrisma) {
    globalForPrisma.__brechaPrisma = new PrismaClient();
  }
  return globalForPrisma.__brechaPrisma;
}
