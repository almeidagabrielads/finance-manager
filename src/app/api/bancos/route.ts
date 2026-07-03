import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import {
  CriarBancoSchema,
  criarBanco,
  listarBancos,
} from "@/lib/domain/bancos";

export async function GET(request: NextRequest) {
  const session = verifySession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const incluirInativos =
    request.nextUrl.searchParams.get("incluirInativos") === "true";
  const bancos = await listarBancos(prisma, session.householdId, {
    incluirInativos,
  });
  return NextResponse.json(bancos);
}

export async function POST(request: NextRequest) {
  const session = verifySession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const validatedFields = CriarBancoSchema.safeParse(body);
  if (!validatedFields.success) {
    return NextResponse.json(
      { error: z.treeifyError(validatedFields.error) },
      { status: 400 },
    );
  }

  try {
    const banco = await criarBanco(
      prisma,
      session.householdId,
      validatedFields.data,
    );
    return NextResponse.json(banco, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Já existe um banco com esse nome." },
      { status: 409 },
    );
  }
}
