import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";

const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  lembrar: z.boolean().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const validatedFields = LoginSchema.safeParse(body);

  if (!validatedFields.success) {
    return NextResponse.json(
      { error: "E-mail ou senha inválidos." },
      { status: 400 },
    );
  }

  const { email, password, lembrar } = validatedFields.data;

  const user = await prisma.user.findUnique({ where: { email } });
  const isValid = user
    ? await verifyPassword(password, user.passwordHash)
    : false;

  if (!user || !isValid) {
    return NextResponse.json(
      { error: "E-mail ou senha inválidos." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({
    id: user.id,
    email: user.email,
    nome: user.nome,
  });
  setSessionCookie(response, user.id, user.householdId, lembrar ?? false);
  return response;
}
