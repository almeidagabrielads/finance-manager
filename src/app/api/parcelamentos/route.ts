import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import {
  CriarParcelamentoSchema,
  criarParcelamento,
  listarParcelamentos,
} from "@/lib/domain/parcelamentos";
import { registrarAtividade } from "@/lib/domain/atividades";
import { rotularDispositivo } from "@/lib/auth/device";

export async function GET(request: NextRequest) {
  const session = verifySession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const parcelamentos = await listarParcelamentos(prisma, session.householdId, {
    bancoId: params.get("bancoId") ?? undefined,
    pessoaId: params.get("pessoaId") ?? undefined,
    incluirQuitados: params.get("incluirQuitados") === "true",
  });
  return NextResponse.json(parcelamentos);
}

export async function POST(request: NextRequest) {
  const session = verifySession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const validatedFields = CriarParcelamentoSchema.safeParse(body);
  if (!validatedFields.success) {
    return NextResponse.json(
      { error: z.treeifyError(validatedFields.error) },
      { status: 400 },
    );
  }

  const parcelamento = await criarParcelamento(
    prisma,
    session.householdId,
    validatedFields.data,
  );
  if (!parcelamento) {
    return NextResponse.json(
      {
        error:
          "Categoria, subcategoria, banco ou pessoa inválidos (verifique se pertencem ao household e se a subcategoria pertence à categoria selecionada).",
      },
      { status: 400 },
    );
  }

  await registrarAtividade(
    prisma,
    session.householdId,
    session.userId,
    "Adicionou parcelamento",
    rotularDispositivo(request.headers.get("user-agent")),
  ).catch(() => {});

  return NextResponse.json(parcelamento, { status: 201 });
}
