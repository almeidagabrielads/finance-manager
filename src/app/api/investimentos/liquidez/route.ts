import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { liquidezConsolidada } from "@/lib/domain/investimentos";

export async function GET(request: NextRequest) {
  const session = verifySession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const resultado = await liquidezConsolidada(prisma, session.householdId, {
    pessoaId: params.get("pessoaId") ?? undefined,
  });
  return NextResponse.json(resultado);
}
