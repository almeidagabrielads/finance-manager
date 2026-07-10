import { config } from "dotenv";
config({ path: ".env.local", override: true });
config({ path: ".env" });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  type TipoBanco,
  type TipoInvestimento,
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

type InvestimentoSeed = {
  banco: string;
  tipo: TipoInvestimento;
  produto: string;
  valor: number;
  vencimentoOuLiquidez?: string;
  observacao?: string;
  titular: "Isa" | "Gabi";
};

const investimentos: InvestimentoSeed[] = [
  {
    banco: "BMG",
    tipo: "RENDA_FIXA",
    produto: "Super Poup BMG - 107% CDI",
    valor: 67370.56,
    vencimentoOuLiquidez: "D+0",
    titular: "Isa",
  },
  {
    banco: "XP",
    tipo: "FUNDO",
    produto: "Trend Investback FIC FIRF Simples RL",
    valor: 60.46,
    vencimentoOuLiquidez: "D+0",
    titular: "Isa",
  },
  {
    banco: "XP",
    tipo: "FUNDO",
    produto: "V8 Cash Platinum FIF",
    valor: 49473.43,
    vencimentoOuLiquidez: "D+12",
    observacao: "Já pedi retirada",
    titular: "Isa",
  },
  {
    banco: "Itaú",
    tipo: "FUNDO",
    produto: "Janeiro Infra Incentivado Renda Fixa",
    valor: 87070.69,
    vencimentoOuLiquidez: "D+22",
    titular: "Isa",
  },
  {
    banco: "Itaú",
    tipo: "FUNDO",
    produto: "Janeiro Multimercado",
    valor: 32368,
    vencimentoOuLiquidez: "D+22",
    titular: "Isa",
  },
  {
    banco: "XP",
    tipo: "FUNDO",
    produto: "Real Investor FIC de FIF em Acoes RL",
    valor: 56791.68,
    vencimentoOuLiquidez: "D+27",
    titular: "Isa",
  },
  {
    banco: "XP",
    tipo: "FUNDO",
    produto:
      "Sparta Debentures Incentivadas Inflacao FIC de Fundos Incentivados de Investimento Financeiro",
    valor: 21777.75,
    vencimentoOuLiquidez: "D+32",
    titular: "Isa",
  },
  {
    banco: "XP",
    tipo: "FUNDO",
    produto: "Sparta Debentures Incentivadas 45 FIC de FIF Infra RF RL",
    valor: 42832.51,
    vencimentoOuLiquidez: "D+46",
    titular: "Isa",
  },
  {
    banco: "Itaú",
    tipo: "RENDA_FIXA",
    produto: "LCI-DI",
    valor: 67200.49,
    vencimentoOuLiquidez: "05/07/2027",
    observacao: "SÓ TIRAR NO VENCIMENTO",
    titular: "Isa",
  },
  {
    banco: "XP",
    tipo: "RENDA_FIXA",
    produto: "LCA RABOBANK - SET/2026",
    valor: 1230.13,
    vencimentoOuLiquidez: "28/09/2026",
    titular: "Isa",
  },
  {
    banco: "XP",
    tipo: "RENDA_FIXA",
    produto: "LCA BNDES - DEZ 2026",
    valor: 7380.27,
    vencimentoOuLiquidez: "15/12/2026",
    titular: "Isa",
  },
  {
    banco: "XP",
    tipo: "RENDA_FIXA",
    produto: "CRA Sao Martinho - ABR/2028",
    valor: 20330.56,
    vencimentoOuLiquidez: "12/4/2028",
    titular: "Isa",
  },
  {
    banco: "XP",
    tipo: "RENDA_FIXA",
    produto: "CRA Minerva - SET/2028",
    valor: 19401.62,
    vencimentoOuLiquidez: "15/9/2028",
    titular: "Isa",
  },
  {
    banco: "XP",
    tipo: "RENDA_FIXA",
    produto: "LCD BNDES - JUN/2030",
    valor: 169945.86,
    vencimentoOuLiquidez: "17/06/2030",
    titular: "Isa",
  },
  {
    banco: "XP",
    tipo: "RENDA_FIXA",
    produto: "NTN-B - MAI/2035",
    valor: 25446.73,
    vencimentoOuLiquidez: "15/05/2035",
    observacao: "Pode tirar depois de 1 ano (2026)",
    titular: "Isa",
  },
  {
    banco: "BMG",
    tipo: "RENDA_FIXA",
    produto: "Super Poup BMG (Gabi reserva de emergencia)",
    valor: 15389.11,
    vencimentoOuLiquidez: "D+0",
    titular: "Gabi",
  },
  {
    banco: "Nubank",
    tipo: "RENDA_FIXA",
    produto: "Caixinha Turbo - 120% do CDI (Gabi reserva de emergencia)",
    valor: 9882.37,
    vencimentoOuLiquidez: "D+0",
    titular: "Gabi",
  },
  {
    banco: "FGTS",
    tipo: "FGTS",
    produto: "FGTS Isa",
    valor: 13114.1,
    titular: "Isa",
  },
  {
    banco: "FGTS",
    tipo: "FGTS",
    produto: "FGTS Gabi",
    valor: 45506.84,
    titular: "Gabi",
  },
];

function centavos(valor: number): number {
  return Math.round(valor * 100);
}

function tipoBanco(nome: string): TipoBanco {
  if (nome === "XP") return "CORRETORA";
  if (nome === "FGTS") return "OUTRO";
  return "CONTA_CORRENTE";
}

function parseVencimentoOuLiquidez(valor?: string): {
  vencimento: Date | null;
  liquidezDias: number | null;
} {
  if (!valor) return { vencimento: null, liquidezDias: null };

  const liquidez = /^D\+(\d+)$/i.exec(valor.trim());
  if (liquidez) {
    return { vencimento: null, liquidezDias: Number(liquidez[1]) };
  }

  const data = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(valor.trim());
  if (!data) {
    throw new Error(`Vencimento/liquidez inválido: ${valor}`);
  }
  const [, dia, mes, ano] = data;
  return {
    vencimento: new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia))),
    liquidezDias: null,
  };
}

async function main() {
  const household = await prisma.household.findUnique({
    where: { nome: HOUSEHOLD_NOME },
  });
  if (!household) throw new Error(`Household não encontrado: ${HOUSEHOLD_NOME}`);

  const pessoas = await prisma.pessoa.findMany({
    where: { householdId: household.id, nome: { in: ["Isa", "Gabi"] } },
    select: { id: true, nome: true },
  });
  const pessoaPorNome = new Map(pessoas.map((p) => [p.nome, p.id]));
  for (const nome of ["Isa", "Gabi"]) {
    if (!pessoaPorNome.has(nome)) {
      throw new Error(`Pessoa não encontrada: ${nome}`);
    }
  }

  const bancos = [...new Set(investimentos.map((i) => i.banco))].sort();
  const bancoPorNome = new Map<string, string>();
  for (const nome of bancos) {
    const banco = await prisma.banco.upsert({
      where: { householdId_nome: { householdId: household.id, nome } },
      update: { ativo: true },
      create: { nome, tipo: tipoBanco(nome), householdId: household.id },
    });
    bancoPorNome.set(nome, banco.id);
  }

  const existentes = await prisma.investimento.findMany({
    where: { householdId: household.id },
    select: {
      bancoId: true,
      pessoaId: true,
      tipo: true,
      produto: true,
      status: true,
    },
  });
  const chave = (investimento: {
    bancoId: string;
    pessoaId: string;
    tipo: TipoInvestimento;
    produto: string;
  }) =>
    [
      investimento.bancoId,
      investimento.pessoaId,
      investimento.tipo,
      investimento.produto.trim().toLowerCase(),
    ].join("|");
  const chavesExistentes = new Set(
    existentes.filter((i) => i.status === "ATIVO").map(chave),
  );

  const novos = investimentos
    .map((investimento) => {
      const { vencimento, liquidezDias } = parseVencimentoOuLiquidez(
        investimento.vencimentoOuLiquidez,
      );
      return {
        bancoId: bancoPorNome.get(investimento.banco)!,
        tipo: investimento.tipo,
        produto: investimento.produto.trim(),
        valorAtualCentavos: centavos(investimento.valor),
        vencimento,
        liquidezDias,
        observacao: investimento.observacao ?? null,
        pessoaId: pessoaPorNome.get(investimento.titular)!,
        householdId: household.id,
      };
    })
    .filter((investimento) => !chavesExistentes.has(chave(investimento)));

  console.log(`Household: ${household.nome}`);
  console.log(`Investimentos informados: ${investimentos.length}`);
  console.log(`Investimentos novos: ${novos.length}`);
  console.log(`Duplicados ignorados: ${investimentos.length - novos.length}`);

  if (!APPLY) {
    console.log("Modo simulação. Rode com --apply para gravar.");
    return;
  }

  if (novos.length === 0) return;

  const resultado = await prisma.investimento.createMany({ data: novos });
  console.log(`Investimentos criados: ${resultado.count}`);
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
