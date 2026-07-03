import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import {
  AtualizarBancoSchema,
  atualizarBanco,
  buscarBanco,
} from "@/lib/domain/bancos";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = verifySession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const banco = await buscarBanco(prisma, session.householdId, id);
  if (!banco) {
    return NextResponse.json(
      { error: "Banco não encontrado." },
      { status: 404 },
    );
  }

  return NextResponse.json(banco);
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = verifySession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const validatedFields = AtualizarBancoSchema.safeParse(body);
  if (!validatedFields.success) {
    return NextResponse.json(
      { error: z.treeifyError(validatedFields.error) },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  try {
    const banco = await atualizarBanco(
      prisma,
      session.householdId,
      id,
      validatedFields.data,
    );
    if (!banco) {
      return NextResponse.json(
        { error: "Banco não encontrado." },
        { status: 404 },
      );
    }
    return NextResponse.json(banco);
  } catch {
    return NextResponse.json(
      { error: "Já existe um banco com esse nome." },
      { status: 409 },
    );
  }
}
