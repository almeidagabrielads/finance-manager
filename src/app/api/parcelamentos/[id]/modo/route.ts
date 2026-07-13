import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import {
  AlterarModoParcelamentoSchema,
  ParcelamentoJaQuitadoError,
  ParcelamentoModoInvalidoError,
  alterarModoParcelamento,
} from "@/lib/domain/parcelamentos";

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = verifySession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const validatedFields = AlterarModoParcelamentoSchema.safeParse(body);
  if (!validatedFields.success) {
    return NextResponse.json(
      { error: z.treeifyError(validatedFields.error) },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;

  try {
    const parcelamento = await alterarModoParcelamento(
      prisma,
      session.householdId,
      id,
      validatedFields.data.novoModo,
    );
    if (!parcelamento) {
      return NextResponse.json(
        { error: "Parcelamento não encontrado." },
        { status: 404 },
      );
    }
    return NextResponse.json(parcelamento);
  } catch (error) {
    if (
      error instanceof ParcelamentoJaQuitadoError ||
      error instanceof ParcelamentoModoInvalidoError
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
