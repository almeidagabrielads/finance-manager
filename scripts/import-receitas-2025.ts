import { config } from "dotenv";
config({ path: ".env.local", override: true });
config({ path: ".env" });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  type SubtipoReceita,
} from "../src/generated/prisma/client";

const APPLY = process.argv.includes("--apply");
const HOUSEHOLD_NOME =
  process.argv
    .find((arg) => arg.startsWith("--household="))
    ?.slice("--household=".length) ?? "Isa & Gabi";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definida");

const pool = new Pool({ connectionString: url });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type ReceitaSeed = {
  pessoa: "Gabi" | "Isa";
  subtipo: SubtipoReceita;
  descricao: string | null;
  valoresReal: number[];
};

// valoresReal: Real-01 (janeiro) .. Real-12 (dezembro) de 2025.
const receitas: ReceitaSeed[] = [
  {
    pessoa: "Gabi",
    subtipo: "SALARIO",
    descricao: null,
    valoresReal: [
      8810.78, 10215.78, 8778.77, 12685.04, 9293.2, 9305.93, 9305.93, 9305.93,
      0, 9643.81, 11810.48, 11229.46,
    ],
  },
  {
    pessoa: "Isa",
    subtipo: "SALARIO",
    descricao: null,
    valoresReal: [
      9509.45, 15341.59, 15187.36, 6828.4, 6828.4, 6841.13, 6841.13, 6849.95,
      6832.31, 6841.13, 11939.78, 9376.59,
    ],
  },
  {
    pessoa: "Isa",
    subtipo: "OUTROS",
    descricao: "Jader",
    valoresReal: [
      1000, 1000, 1018.05, 500, 500, 800, 800, 800, 800, 800, 800, 800,
    ],
  },
  {
    pessoa: "Gabi",
    subtipo: "VOUCHER",
    descricao: null,
    valoresReal: [
      1083, 1140, 912, 1026, 1026, 1197, 1311, 0, 588, 644, 560, 0,
    ],
  },
  {
    pessoa: "Isa",
    subtipo: "VOUCHER",
    descricao: null,
    valoresReal: [0, 0, 882, 882, 882, 882, 882, 882, 882, 882, 882, 1008],
  },
];

function centavos(valor: number): number {
  return Math.round(valor * 100);
}

function mes2025(mes: number): Date {
  return new Date(Date.UTC(2025, mes - 1, 1));
}

async function main() {
  const household = await prisma.household.findUnique({
    where: { nome: HOUSEHOLD_NOME },
  });
  if (!household) throw new Error(`Household não encontrado: ${HOUSEHOLD_NOME}`);

  const pessoas = await prisma.pessoa.findMany({
    where: {
      householdId: household.id,
      nome: { in: ["Gabi", "Isa"] },
    },
    select: { id: true, nome: true },
  });
  const pessoaPorNome = new Map(pessoas.map((p) => [p.nome, p.id]));
  for (const nome of ["Gabi", "Isa"]) {
    if (!pessoaPorNome.has(nome)) {
      throw new Error(`Pessoa não encontrada: ${nome}`);
    }
  }

  const candidatas = receitas.flatMap((receita) =>
    receita.valoresReal.map((valor, indice) => ({
      pessoaId: pessoaPorNome.get(receita.pessoa)!,
      subtipo: receita.subtipo,
      descricao: receita.descricao,
      valorCentavos: centavos(valor),
      mes: mes2025(indice + 1),
      householdId: household.id,
    })),
  ).filter((receita) => receita.valorCentavos > 0);

  const existentes = await prisma.receita.findMany({
    where: {
      householdId: household.id,
      mes: { gte: mes2025(1), lte: mes2025(12) },
    },
    select: {
      pessoaId: true,
      subtipo: true,
      descricao: true,
      valorCentavos: true,
      mes: true,
    },
  });
  const chave = (receita: {
    pessoaId: string;
    subtipo: SubtipoReceita;
    descricao: string | null;
    valorCentavos: number;
    mes: Date;
  }) =>
    [
      receita.pessoaId,
      receita.subtipo,
      receita.descricao ?? "",
      receita.valorCentavos,
      receita.mes.toISOString().slice(0, 10),
    ].join("|");

  const chavesExistentes = new Set(existentes.map(chave));
  const novas = candidatas.filter((receita) => !chavesExistentes.has(chave(receita)));

  console.log(`Household: ${household.nome}`);
  console.log(`Receitas válidas: ${candidatas.length}`);
  console.log(`Receitas novas: ${novas.length}`);
  console.log(`Duplicadas ignoradas: ${candidatas.length - novas.length}`);

  if (!APPLY) {
    console.log("Modo simulação. Rode com --apply para gravar.");
    return;
  }

  if (novas.length === 0) return;

  const resultado = await prisma.receita.createMany({ data: novas });
  console.log(`Receitas criadas: ${resultado.count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
