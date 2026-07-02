import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import {
  AtualizarPessoaSchema,
  atualizarPessoa,
  buscarPessoa,
  removerPessoa,
} from "@/lib/domain/pessoas";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = verifySession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const pessoa = await buscarPessoa(prisma, session.householdId, id);
  if (!pessoa) {
    return NextResponse.json(
      { error: "Pessoa não encontrada." },
      { status: 404 },
    );
  }

  return NextResponse.json(pessoa);
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
  const validatedFields = AtualizarPessoaSchema.safeParse(body);
  if (!validatedFields.success) {
    return NextResponse.json(
      { error: z.treeifyError(validatedFields.error) },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  const pessoa = await atualizarPessoa(
    prisma,
    session.householdId,
    id,
    validatedFields.data,
  );
  if (!pessoa) {
    return NextResponse.json(
      { error: "Pessoa não encontrada." },
      { status: 404 },
    );
  }

  return NextResponse.json(pessoa);
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = verifySession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const pessoa = await removerPessoa(prisma, session.householdId, id);
  if (!pessoa) {
    return NextResponse.json(
      { error: "Pessoa não encontrada." },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true });
}
