import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { inativarBanco } from "@/lib/domain/bancos";

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = verifySession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const banco = await inativarBanco(prisma, session.householdId, id);
  if (!banco) {
    return NextResponse.json(
      { error: "Banco não encontrado." },
      { status: 404 },
    );
  }

  return NextResponse.json(banco);
}
