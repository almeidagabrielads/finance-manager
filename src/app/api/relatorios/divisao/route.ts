import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { buscarSaldoDivisao } from "@/lib/domain/split";

function parseData(valor: string | null): Date | undefined {
  if (!valor) return undefined;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? undefined : data;
}

export async function GET(request: NextRequest) {
  const session = verifySession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const saldo = await buscarSaldoDivisao(prisma, session.householdId, {
    dataInicio: parseData(params.get("dataInicio")),
    dataFim: parseData(params.get("dataFim")),
  });

  if (!saldo) {
    return NextResponse.json(
      {
        error:
          "É preciso cadastrar duas pessoas do tipo Individual (ex.: Isa e Gabi) para calcular a divisão de despesas.",
      },
      { status: 422 },
    );
  }

  return NextResponse.json(saldo);
}
