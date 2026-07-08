// Ferramenta de USO ÚNICO — define o orçamento planejado (compartilhado,
// sem pessoa) de janeiro a junho/2026 por subcategoria, a partir dos valores
// informados manualmente abaixo (extraídos da tela Categorias & Orçamento).
//
// Como o orçamento é "vigente a partir do mês X até o próximo valor
// definido" (ver src/lib/domain/relatorios.ts), simplesmente criar uma
// entrada em janeiro faria esse valor vigorar também de julho em diante.
// Para não impactar julho (que já mudou), o script primeiro "congela" julho
// no valor que está vigente hoje — criando uma entrada explícita em mes=7
// só quando ainda não existe uma — e só depois define o novo valor a partir
// de janeiro. Também remove qualquer entrada solta em fev–jun e a entrada
// legada sem mês (mes=null), para não haver dois valores concorrendo pelo
// mesmo período (ver chavesComValorNoInicio em relatorios.ts).
//
// Não faz parte do produto; remova este arquivo depois de rodar.
//
// Uso:
//   npx tsx scripts/migracao/atualizar-orcamento-jan-jun-2026.ts --dry-run
//   npx tsx scripts/migracao/atualizar-orcamento-jan-jun-2026.ts --commit
import { config } from "dotenv";
config({ path: ".env.local", override: true });
config({ path: ".env" });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

const HOUSEHOLD_NOME = "Isa & Gabi";
const ANO = 2026;
const MES_CONGELAR = 7; // primeiro mês que NÃO deve ser alterado
const MESES_A_DEFINIR = [1, 2, 3, 4, 5, 6];

// [categoria, subcategoria, valor em reais]
const VALORES: [string, string, number][] = [
  // Alimentação
  ["Alimentação", "Assinaturas-Alimentação", 40.38],
  ["Alimentação", "Café", 305.51],
  ["Alimentação", "Restaurante", 2969.84],
  ["Alimentação", "Supermercado", 1446.35],
  ["Alimentação", "Delivery", 382.79],
  // Casa
  ["Casa", "Aluguel/Condomínio", 5000.0],
  ["Casa", "Energia", 500.0],
  ["Casa", "Gás", 0.0],
  ["Casa", "Internet", 124.9],
  ["Casa", "Faxina", 859.6],
  ["Casa", "Utensílios/Móveis", 400.0],
  ["Casa", "Celular", 75.67],
  ["Casa", "Outros-Casa", 425.66],
  // Diversos
  ["Diversos", "Presentes", 629.56],
  ["Diversos", "Contribuições", 167.21],
  ["Diversos", "Casamento", 0.0],
  ["Diversos", "Outros-Diversos", 0.0],
  // Educação/Trabalho
  ["Educação/Trabalho", "Livros", 30.0],
  ["Educação/Trabalho", "Cursos", 1000.0],
  ["Educação/Trabalho", "Assinaturas-Trabalho/educ", 233.28],
  ["Educação/Trabalho", "Infraestrutura", 300.0],
  // Higiene Pessoal
  ["Higiene Pessoal", "Cabelo", 259.8],
  ["Higiene Pessoal", "Sabonete", 50.0],
  ["Higiene Pessoal", "Depilação", 132.34],
  ["Higiene Pessoal", "Outros-Higiene Pessoal", 256.32],
  // Lazer
  ["Lazer", "Bar", 349.19],
  ["Lazer", "Passeio-Lazer", 28.14],
  ["Lazer", "Bebida", 270.19],
  ["Lazer", "Ingresso", 11.57],
  ["Lazer", "Streaming", 116.11],
  ["Lazer", "Outros-Lazer", 4.08],
  // Pet
  ["Pet", "Passeio/Hospedagem", 0.0],
  ["Pet", "Ração", 0.0],
  ["Pet", "Banho", 0.0],
  ["Pet", "Saúde-Pet", 0.0],
  ["Pet", "Tapete", 0.0],
  ["Pet", "Outros-Pet", 0.0],
  // Saúde
  ["Saúde", "Plano de Saúde", 0.0],
  ["Saúde", "Assinatura-Saúde", 357.98],
  ["Saúde", "Futebol", 3.64],
  ["Saúde", "Farmácia", 414.45],
  ["Saúde", "Médico", 873.08],
  ["Saúde", "Outros-Saúde", 25.81],
  // Taxas
  ["Taxas", "Imposto de renda", 200.0],
  ["Taxas", "Seguros", 268.19],
  ["Taxas", "Anuidade/Multas", 203.92],
  // Transporte
  ["Transporte", "Uber/99/Taxi", 393.36],
  ["Transporte", "Assinatura-Transporte", 4.09],
  ["Transporte", "Combustível", 471.52],
  ["Transporte", "Estacionamento", 44.9],
  ["Transporte", "Gorjeta", 1.46],
  ["Transporte", "Coletivo", 24.48],
  ["Transporte", "Manutenção", 831.3],
  ["Transporte", "Limpeza", 49.1],
  ["Transporte", "Pedágio/Sem Parar", 149.12],
  ["Transporte", "IPVA", 157.72],
  ["Transporte", "Seguro", 400.46],
  // Vestimenta
  ["Vestimenta", "Sapatos", 11.82],
  ["Vestimenta", "Acessórios", 38.83],
  ["Vestimenta", "Roupas", 566.57],
  // Viagem
  ["Viagem", "Assinatura-Viagem", 129.12],
  ["Viagem", "Passagem", 301.9],
  ["Viagem", "Transporte", 341.74],
  ["Viagem", "Hospedagem", 987.0],
  ["Viagem", "Passeio-Viagem", 134.96],
  ["Viagem", "Alimentação-Viagem", 246.28],
  ["Viagem", "Outros-Viagem", 39.07],
];

function centavos(reais: number): number {
  return Math.round(reais * 100);
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

  const categorias = await prisma.categoria.findMany({
    where: { householdId: household.id },
    include: { subcategorias: true },
  });
  const categoriaPorNome = new Map(categorias.map((c) => [c.nome, c]));

  const orcamentosExistentes = await prisma.orcamentoPlanejado.findMany({
    where: { householdId: household.id, ano: ANO, pessoaId: null },
  });

  type Operacao =
    | {
        tipo: "congelar-julho";
        categoria: string;
        subcategoria: string;
        valorCentavos: number;
      }
    | {
        tipo: "definir-jan-jun";
        categoria: string;
        subcategoria: string;
        de: number | null;
        para: number;
      }
    | {
        tipo: "remover-solta";
        categoria: string;
        subcategoria: string;
        mes: number | null;
        valorCentavos: number;
      };

  const operacoes: Operacao[] = [];
  const naoMapeados: string[] = [];

  for (const [categoriaNome, subcategoriaNome, valorReais] of VALORES) {
    const categoria = categoriaPorNome.get(categoriaNome);
    const subcategoria = categoria?.subcategorias.find(
      (s) => s.nome === subcategoriaNome,
    );
    if (!categoria || !subcategoria) {
      naoMapeados.push(`${categoriaNome} / ${subcategoriaNome}`);
      continue;
    }

    const rowsDaSubcategoria = orcamentosExistentes.filter(
      (o) =>
        o.categoriaId === categoria.id && o.subcategoriaId === subcategoria.id,
    );

    // Valor vigente hoje em julho: entrada com o maior "início" (mes ?? 1)
    // que seja <= MES_CONGELAR.
    const candidatasAntesDeJulho = rowsDaSubcategoria
      .filter((o) => (o.mes ?? 1) <= MES_CONGELAR)
      .sort((a, b) => (a.mes ?? 1) - (b.mes ?? 1));
    const jaTemJulho = rowsDaSubcategoria.some((o) => o.mes === MES_CONGELAR);
    const vigenteEmJulho =
      candidatasAntesDeJulho.at(-1)?.valorCentavos ??
      subcategoria.orcamentoCentavos ??
      0;

    if (!jaTemJulho) {
      operacoes.push({
        tipo: "congelar-julho",
        categoria: categoriaNome,
        subcategoria: subcategoriaNome,
        valorCentavos: vigenteEmJulho,
      });
    }

    // Qualquer entrada solta em fev–jun ou legada (mes=null) é removida:
    // vamos concentrar tudo num único valor vigente desde janeiro.
    for (const row of rowsDaSubcategoria) {
      const inicio = row.mes ?? 1;
      const ehLegadaOuNoMeio =
        row.mes === null || MESES_A_DEFINIR.slice(1).includes(inicio);
      if (ehLegadaOuNoMeio) {
        operacoes.push({
          tipo: "remover-solta",
          categoria: categoriaNome,
          subcategoria: subcategoriaNome,
          mes: row.mes,
          valorCentavos: row.valorCentavos,
        });
      }
    }

    const rowJaneiro = rowsDaSubcategoria.find((o) => o.mes === 1);
    const novoValorCentavos = centavos(valorReais);
    if (!rowJaneiro || rowJaneiro.valorCentavos !== novoValorCentavos) {
      operacoes.push({
        tipo: "definir-jan-jun",
        categoria: categoriaNome,
        subcategoria: subcategoriaNome,
        de: rowJaneiro?.valorCentavos ?? null,
        para: novoValorCentavos,
      });
    }
  }

  console.log(`Household: ${household.nome}`);
  console.log(`Ano: ${ANO} | congelando mês ${MES_CONGELAR} em diante`);
  console.log(`Subcategorias no arquivo: ${VALORES.length}`);
  console.log(`Operações planejadas: ${operacoes.length}`);
  if (naoMapeados.length > 0) {
    console.log(
      `\nNão encontrados no banco (${naoMapeados.length}) — verifique nome da categoria/subcategoria:`,
    );
    for (const nome of naoMapeados) console.log(`  ${nome}`);
  }

  console.log("\nDetalhe das operações:");
  for (const op of operacoes) {
    if (op.tipo === "congelar-julho") {
      console.log(
        `  [congelar] ${op.categoria} / ${op.subcategoria}: cria mês ${MES_CONGELAR} = R$ ${(op.valorCentavos / 100).toFixed(2)} (preserva o valor atual)`,
      );
    } else if (op.tipo === "definir-jan-jun") {
      const de = op.de === null ? "—" : `R$ ${(op.de / 100).toFixed(2)}`;
      console.log(
        `  [jan-jun]  ${op.categoria} / ${op.subcategoria}: ${de} → R$ ${(op.para / 100).toFixed(2)} (vigente a partir de jan)`,
      );
    } else {
      console.log(
        `  [remove]   ${op.categoria} / ${op.subcategoria}: mês ${op.mes ?? "sem mês"} = R$ ${(op.valorCentavos / 100).toFixed(2)}`,
      );
    }
  }

  if (dryRun) {
    console.log("\n--dry-run: nada foi alterado no banco.");
    await prisma.$disconnect();
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const [categoriaNome, subcategoriaNome, valorReais] of VALORES) {
      const categoria = categoriaPorNome.get(categoriaNome);
      const subcategoria = categoria?.subcategorias.find(
        (s) => s.nome === subcategoriaNome,
      );
      if (!categoria || !subcategoria) continue;

      const rowsDaSubcategoria = orcamentosExistentes.filter(
        (o) =>
          o.categoriaId === categoria.id &&
          o.subcategoriaId === subcategoria.id,
      );
      const candidatasAntesDeJulho = rowsDaSubcategoria
        .filter((o) => (o.mes ?? 1) <= MES_CONGELAR)
        .sort((a, b) => (a.mes ?? 1) - (b.mes ?? 1));
      const jaTemJulho = rowsDaSubcategoria.some((o) => o.mes === MES_CONGELAR);
      const vigenteEmJulho =
        candidatasAntesDeJulho.at(-1)?.valorCentavos ??
        subcategoria.orcamentoCentavos ??
        0;

      if (!jaTemJulho) {
        await tx.orcamentoPlanejado.create({
          data: {
            householdId: household.id,
            pessoaId: null,
            categoriaId: categoria.id,
            subcategoriaId: subcategoria.id,
            mes: MES_CONGELAR,
            ano: ANO,
            valorCentavos: vigenteEmJulho,
          },
        });
      }

      for (const row of rowsDaSubcategoria) {
        const inicio = row.mes ?? 1;
        const ehLegadaOuNoMeio =
          row.mes === null || MESES_A_DEFINIR.slice(1).includes(inicio);
        if (ehLegadaOuNoMeio) {
          await tx.orcamentoPlanejado.delete({ where: { id: row.id } });
        }
      }

      const rowJaneiro = rowsDaSubcategoria.find((o) => o.mes === 1);
      const novoValorCentavos = centavos(valorReais);
      if (rowJaneiro) {
        if (rowJaneiro.valorCentavos !== novoValorCentavos) {
          await tx.orcamentoPlanejado.update({
            where: { id: rowJaneiro.id },
            data: { valorCentavos: novoValorCentavos },
          });
        }
      } else {
        await tx.orcamentoPlanejado.create({
          data: {
            householdId: household.id,
            pessoaId: null,
            categoriaId: categoria.id,
            subcategoriaId: subcategoria.id,
            mes: 1,
            ano: ANO,
            valorCentavos: novoValorCentavos,
          },
        });
      }
    }
  });

  console.log(`\n--commit: ${operacoes.length} operação(ões) aplicada(s).`);
  await prisma.$disconnect();
}

main();
