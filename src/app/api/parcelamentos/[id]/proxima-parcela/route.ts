import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import {
  ParcelamentoConcluidoError,
  ParcelamentoJaQuitadoError,
  ParcelamentoModoInvalidoError,
  lancarProximaParcelaGradual,
} from "@/lib/domain/parcelamentos";

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = verifySession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await ctx.params;

  try {
    const lancamento = await lancarProximaParcelaGradual(
      prisma,
      session.householdId,
      id,
    );
    if (!lancamento) {
      return NextResponse.json(
        { error: "Parcelamento não encontrado." },
        { status: 404 },
      );
    }
    return NextResponse.json(lancamento, { status: 201 });
  } catch (error) {
    if (
      error instanceof ParcelamentoJaQuitadoError ||
      error instanceof ParcelamentoModoInvalidoError ||
      error instanceof ParcelamentoConcluidoError
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
