import { config } from "dotenv";
config({ path: ".env.local", override: true });
config({ path: ".env" });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definida");

const pool = new Pool({ connectionString: url });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const household = await prisma.household.upsert({
    where: { nome: "Isa & Gabi" },
    update: {},
    create: { nome: "Isa & Gabi" },
  });

  const pessoas = [
    { nome: "Isa", email: "isa@example.com", senha: process.env.SEED_SENHA_ISA ?? "isa-senha-provisoria" },
    { nome: "Gabi", email: "gabi@example.com", senha: process.env.SEED_SENHA_GABI ?? "gabi-senha-provisoria" },
  ];

  for (const p of pessoas) {
    await prisma.pessoa.upsert({
      where: { householdId_nome: { householdId: household.id, nome: p.nome } },
      update: {},
      create: { nome: p.nome, tipo: "INDIVIDUAL", householdId: household.id },
    });

    const passwordHash = await hashPassword(p.senha);
    await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        nome: p.nome,
        passwordHash,
        householdId: household.id,
      },
    });
  }

  console.log(`Seed concluído para o household "${household.nome}".`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
