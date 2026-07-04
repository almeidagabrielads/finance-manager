import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import {
  AtualizarPreferenciasSchema,
  atualizarPreferencias,
  obterOuCriarPreferencias,
} from "@/lib/domain/preferencias";

export async function GET(request: NextRequest) {
  const session = verifySession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const preferencias = await obterOuCriarPreferencias(
    prisma,
    session.householdId,
  );
  return NextResponse.json(preferencias);
}

export async function PATCH(request: NextRequest) {
  const session = verifySession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const validatedFields = AtualizarPreferenciasSchema.safeParse(body);
  if (!validatedFields.success) {
    return NextResponse.json(
      { error: z.treeifyError(validatedFields.error) },
      { status: 400 },
    );
  }

  const preferencias = await atualizarPreferencias(
    prisma,
    session.householdId,
    validatedFields.data,
  );
  return NextResponse.json(preferencias);
}
