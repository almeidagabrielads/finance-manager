import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { confirmarImportacao } from "@/lib/domain/import/importacao";

const LinhaSchema = z.object({
  data: z.string().trim().min(1),
  descricaoOrigem: z.string().trim().min(1),
  descricaoPropria: z.string().trim().min(1).nullish(),
  valorCentavos: z.number().int(),
  descontoCentavos: z.number().int().min(0).optional(),
  categoriaId: z.string().trim().min(1).nullish(),
  subcategoriaId: z.string().trim().min(1).nullish(),
  bancoId: z.string().trim().min(1).nullish(),
  pessoaDivisaoId: z.string().trim().min(1).nullish(),
  pessoaPagouId: z.string().trim().min(1).nullish(),
});

const ConfirmarSchema = z.object({
  // Opcionais: dependendo do modelo do arquivo, cada linha pode já trazer
  // (ou o usuário pode definir na revisão) seu próprio banco/dono/pagador.
  bancoId: z.string().trim().min(1).nullish(),
  pessoaDivisaoId: z.string().trim().min(1).nullish(),
  pessoaPagouId: z.string().trim().min(1).nullish(),
  linhas: z.array(LinhaSchema).min(1, "Selecione ao menos uma linha."),
});

export async function POST(request: NextRequest) {
  const session = verifySession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const validatedFields = ConfirmarSchema.safeParse(body);
  if (!validatedFields.success) {
    return NextResponse.json(
      { error: z.treeifyError(validatedFields.error) },
      { status: 400 },
    );
  }

  const resultado = await confirmarImportacao(prisma, session.householdId, {
    bancoId: validatedFields.data.bancoId,
    pessoaDivisaoId: validatedFields.data.pessoaDivisaoId,
    pessoaPagouId: validatedFields.data.pessoaPagouId,
    linhas: validatedFields.data.linhas,
  });

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.erro }, { status: 400 });
  }

  return NextResponse.json(resultado, { status: 201 });
}
