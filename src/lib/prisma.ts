import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function createPrismaClient(url: string) {
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

declare global {
  // eslint-disable-next-line no-var
  var __prisma: ReturnType<typeof createPrismaClient> | undefined;
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definida");

// Em dev, reutiliza a instância entre hot-reloads do Next.js
export const prisma =
  process.env.NODE_ENV === "production"
    ? createPrismaClient(url)
    : (globalThis.__prisma ??= createPrismaClient(url));
