import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import {
  RemoverPosicaoInvestimentoSchema,
  UpsertPosicaoInvestimentoSchema,
  listarPosicoesInvestimento,
  removerPosicaoInvestimento,
  upsertPosicaoInvestimento,
} from "@/lib/domain/posicoesInvestimento";

export async function GET(request: NextRequest) {
  const session = verifySession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const anoParam = params.get("ano");
  const ano = anoParam ? Number(anoParam) : new Date().getUTCFullYear();
  if (!Number.isInteger(ano)) {
    return NextResponse.json({ error: "Ano inválido." }, { status: 400 });
  }

  const posicoes = await listarPosicoesInvestimento(
    prisma,
    session.householdId,
    {
      ano,
    },
  );
  return NextResponse.json(posicoes);
}

export async function POST(request: NextRequest) {
  const session = verifySession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const validatedFields = UpsertPosicaoInvestimentoSchema.safeParse(body);
  if (!validatedFields.success) {
    return NextResponse.json(
      { error: z.treeifyError(validatedFields.error) },
      { status: 400 },
    );
  }

  const posicao = await upsertPosicaoInvestimento(
    prisma,
    session.householdId,
    validatedFields.data,
  );
  if (!posicao) {
    return NextResponse.json(
      { error: "Investimento não encontrado." },
      { status: 404 },
    );
  }
  return NextResponse.json(posicao, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = verifySession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const validatedFields = RemoverPosicaoInvestimentoSchema.safeParse(body);
  if (!validatedFields.success) {
    return NextResponse.json(
      { error: z.treeifyError(validatedFields.error) },
      { status: 400 },
    );
  }

  const resultado = await removerPosicaoInvestimento(
    prisma,
    session.householdId,
    validatedFields.data,
  );
  if (!resultado) {
    return NextResponse.json(
      { error: "Investimento não encontrado." },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true });
}
