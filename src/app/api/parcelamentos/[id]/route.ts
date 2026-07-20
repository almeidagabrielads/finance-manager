import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import {
  AtualizarParcelamentoSchema,
  ParcelamentoComLancamentosRealizadosError,
  atualizarParcelamento,
  buscarParcelamento,
  removerParcelamento,
} from "@/lib/domain/parcelamentos";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = verifySession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const parcelamento = await buscarParcelamento(
    prisma,
    session.householdId,
    id,
  );
  if (!parcelamento) {
    return NextResponse.json(
      { error: "Parcelamento não encontrado." },
      { status: 404 },
    );
  }

  return NextResponse.json(parcelamento);
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
  const validatedFields = AtualizarParcelamentoSchema.safeParse(body);
  if (!validatedFields.success) {
    return NextResponse.json(
      { error: z.treeifyError(validatedFields.error) },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  const parcelamento = await atualizarParcelamento(
    prisma,
    session.householdId,
    id,
    validatedFields.data,
  );
  if (!parcelamento) {
    return NextResponse.json(
      {
        error:
          "Parcelamento não encontrado, ou categoria/subcategoria/banco/pessoa inválidos.",
      },
      { status: 400 },
    );
  }
  return NextResponse.json(parcelamento);
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

  try {
    const parcelamento = await removerParcelamento(
      prisma,
      session.householdId,
      id,
    );
    if (!parcelamento) {
      return NextResponse.json(
        { error: "Parcelamento não encontrado." },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ParcelamentoComLancamentosRealizadosError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
