import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function createPrismaClient(url: string) {
  console.log("DATABASE_URL =", process.env.DATABASE_URL);
  console.log("URL recebida =", url);
  
  const pool = new Pool({
    connectionString: url,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  pool
    .query("select now()")
    .then(() => console.log("POOL FUNCIONA"))
    .catch((e) => console.error("POOL FALHOU", e));

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
