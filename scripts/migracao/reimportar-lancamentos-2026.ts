// Ferramenta de USO ÚNICO — substitui TODOS os lançamentos do household
// "Isa & Gabi" pelo conteúdo mais recente da aba "Lançamentos" da planilha,
// exportada como CSV. Não faz parte do produto; remova este arquivo depois
// de rodar a substituição.
//
// Uso:
//   npx tsx scripts/migracao/reimportar-lancamentos-2026.ts --dry-run
//   npx tsx scripts/migracao/reimportar-lancamentos-2026.ts --commit
import { config } from "dotenv";
config({ path: ".env.local", override: true });
config({ path: ".env" });

import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { parseCsv, linhasParaObjetos } from "../../src/lib/domain/import/csv";
import { calcularHashImportacao } from "../../src/lib/domain/import/hash";

const HOUSEHOLD_NOME = "Isa & Gabi";
const CSV_PATH =
  "/Users/gabriela/Downloads/Finanças 2026 - Cópia de Lançamentos.csv";

function normalizar(s: string | undefined): string | null {
  if (s == null) return null;
  const trimmed = s.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function parseValorCentavos(valorBruto: string): number | null {
  const limpo = valorBruto
    .trim()
    .replace(/R\$\s*/i, "")
    .replace(/\s/g, "");
  if (limpo === "") return null;
  const normalizado = limpo.replace(/\./g, "").replace(",", ".");
  const numero = Number(normalizado);
  if (Number.isNaN(numero)) return null;
  return Math.round(numero * 100);
}

function parseDataIso(valor: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor.trim());
  if (!match) return null;
  const [, ano, mes, dia] = match;
  return new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const commit = args.includes("--commit");
  if (dryRun === commit) {
    console.error("Especifique exatamente um modo: --dry-run ou --commit.");
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida");
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const household = await prisma.household.findUnique({
    where: { nome: HOUSEHOLD_NOME },
  });
  if (!household) throw new Error(`Household "${HOUSEHOLD_NOME}" não existe.`);

  const [pessoasDb, categoriasDb, bancosDb, existentesCount] =
    await Promise.all([
      prisma.pessoa.findMany({ where: { householdId: household.id } }),
      prisma.categoria.findMany({
        where: { householdId: household.id },
        include: { subcategorias: true },
      }),
      prisma.banco.findMany({ where: { householdId: household.id } }),
      prisma.lancamento.count({ where: { householdId: household.id } }),
    ]);

  const pessoaPorNome = new Map(pessoasDb.map((p) => [p.nome, p]));
  const categoriaPorNome = new Map(categoriasDb.map((c) => [c.nome, c]));
  const bancoPorNome = new Map(bancosDb.map((b) => [b.nome, b]));

  const csvTexto = readFileSync(CSV_PATH, "utf-8");
  const linhasCsv = parseCsv(csvTexto, ",");
  const objetos = linhasParaObjetos(linhasCsv);

  const paraImportar: {
    data: Date;
    descricaoOrigem: string | null;
    descricaoPropria: string | null;
    valorCentavos: number;
    descontoCentavos: number;
    categoriaId: string | null;
    subcategoriaId: string | null;
    bancoId: string;
    pessoaDivisaoId: string;
    pessoaPagouId: string;
    hashImportacao: string;
    householdId: string;
  }[] = [];
  const ignorados: { linha: number; motivo: string }[] = [];
  const subcategoriasNaoMapeadas = new Map<string, number>();
  const hashesUsados = new Set<string>();

  objetos.forEach((campos, indice) => {
    const numeroLinha = indice + 2;
    const dataRaw = campos["Data"] ?? "";
    if (normalizar(dataRaw) === null) return; // linha de total/rodapé

    const data = parseDataIso(dataRaw);
    // Data-sentinela usada na planilha para marcar lançamentos "a revisar"
    // (ex.: ano 2000) — mesma anomalia já tratada na migração original.
    if (!data || data.getUTCFullYear() < 2020) {
      ignorados.push({
        linha: numeroLinha,
        motivo: `data inválida ou sentinela ("${dataRaw}")`,
      });
      return;
    }

    const motivos: string[] = [];

    const categoriaNome = normalizar(campos["Categoria"]);
    const categoria = categoriaNome
      ? categoriaPorNome.get(categoriaNome)
      : undefined;
    if (categoriaNome && !categoria) {
      motivos.push(`categoria desconhecida "${categoriaNome}"`);
    }

    // Subcategoria não mapeada não descarta o lançamento — só fica sem
    // subcategoria (mesmo critério da migração original: só banco, pessoas,
    // categoria e valor são obrigatórios).
    let subcategoriaId: string | null = null;
    const subcategoriaNaoMapeada: string[] = [];
    const subcategoriaNome = normalizar(campos["Subcategoria"]);
    if (subcategoriaNome && categoria) {
      const sub = categoria.subcategorias.find(
        (s) => s.nome === subcategoriaNome,
      );
      if (sub) {
        subcategoriaId = sub.id;
      } else {
        subcategoriaNaoMapeada.push(
          `${categoria.nome} / ${subcategoriaNome}`,
        );
      }
    }

    const bancoNome = normalizar(campos["Banco"]);
    const banco = bancoNome ? bancoPorNome.get(bancoNome) : undefined;
    if (!banco) motivos.push(`banco desconhecido "${bancoNome}"`);

    const divisaoNome = normalizar(campos["Divisão"]);
    const pessoaDivisao = divisaoNome ? pessoaPorNome.get(divisaoNome) : undefined;
    if (!pessoaDivisao) motivos.push(`pessoa (divisão) desconhecida "${divisaoNome}"`);

    const pagouNome = normalizar(campos["Quem pagou"]);
    const pessoaPagou = pagouNome ? pessoaPorNome.get(pagouNome) : undefined;
    if (!pessoaPagou) motivos.push(`pessoa (quem pagou) desconhecida "${pagouNome}"`);

    const valorRaw = normalizar(campos["Valor"]);
    const descontoRaw = normalizar(campos["Desconto"]);
    const valorCentavosBruto = valorRaw ? parseValorCentavos(valorRaw) : null;
    const descontoCentavosBruto = descontoRaw
      ? parseValorCentavos(descontoRaw)
      : null;

    // Mesmo padrão da migração original: estornos/créditos lançados só na
    // coluna Desconto, com Valor vazio, viram lançamento de valor negativo.
    const valorFaltandoComDesconto =
      valorCentavosBruto === null && descontoCentavosBruto !== null;
    if (valorCentavosBruto === null && descontoCentavosBruto === null) {
      motivos.push("sem valor (campo Valor vazio)");
    }

    if (motivos.length > 0 || !banco || !pessoaDivisao || !pessoaPagou) {
      ignorados.push({ linha: numeroLinha, motivo: motivos.join("; ") });
      return;
    }

    for (const chave of subcategoriaNaoMapeada) {
      subcategoriasNaoMapeadas.set(
        chave,
        (subcategoriasNaoMapeadas.get(chave) ?? 0) + 1,
      );
    }

    const valorCentavos = valorFaltandoComDesconto
      ? -(descontoCentavosBruto as number)
      : (valorCentavosBruto as number);
    const descontoCentavos = valorFaltandoComDesconto
      ? 0
      : (descontoCentavosBruto ?? 0);

    const descricaoOrigem = normalizar(campos["Descrição Cartão"]);

    // Duas transações distintas (ex.: mesma assinatura cobrada 2x no mesmo
    // dia) podem coincidir em data+descrição+valor+banco — o hash de
    // dedup existe para detectar reimportação de extrato, não para bloquear
    // lançamentos legítimos coincidentes. Desambigua com a linha de origem
    // só quando há colisão, preservando a unicidade exigida pelo schema.
    let hashImportacao = calcularHashImportacao({
      data,
      descricaoOrigem: descricaoOrigem ?? "",
      valorCentavos,
      bancoId: banco.id,
    });
    if (hashesUsados.has(hashImportacao)) {
      hashImportacao = calcularHashImportacao({
        data,
        descricaoOrigem: `${descricaoOrigem ?? ""} #${numeroLinha}`,
        valorCentavos,
        bancoId: banco.id,
      });
    }
    hashesUsados.add(hashImportacao);

    paraImportar.push({
      data,
      descricaoOrigem,
      descricaoPropria: normalizar(campos["Descrição Própria"]),
      valorCentavos,
      descontoCentavos,
      categoriaId: categoria?.id ?? null,
      subcategoriaId,
      bancoId: banco.id,
      pessoaDivisaoId: pessoaDivisao.id,
      pessoaPagouId: pessoaPagou.id,
      householdId: household.id,
      hashImportacao,
    });
  });

  console.log(`Household: ${household.nome}`);
  console.log(`Lançamentos hoje na base: ${existentesCount}`);
  console.log(`Linhas no CSV: ${objetos.length}`);
  console.log(`Prontas para importar: ${paraImportar.length}`);
  console.log(`Ignoradas: ${ignorados.length}`);
  for (const i of ignorados.slice(0, 30)) {
    console.log(`  linha ${i.linha}: ${i.motivo}`);
  }
  if (ignorados.length > 30) {
    console.log(`  ... e mais ${ignorados.length - 30} linha(s) ignorada(s).`);
  }
  if (subcategoriasNaoMapeadas.size > 0) {
    console.log("Subcategorias não mapeadas (lançamento importado sem subcategoria):");
    for (const [chave, count] of subcategoriasNaoMapeadas) {
      console.log(`  ${chave}: ${count}x`);
    }
  }

  if (dryRun) {
    console.log("\n--dry-run: nada foi alterado no banco.");
    await prisma.$disconnect();
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.lancamento.deleteMany({ where: { householdId: household.id } });
    await tx.lancamento.createMany({ data: paraImportar });
  });

  const depois = await prisma.lancamento.count({
    where: { householdId: household.id },
  });
  console.log(`\n--commit: removidos ${existentesCount}, inseridos ${depois}.`);
  await prisma.$disconnect();
}

main();
