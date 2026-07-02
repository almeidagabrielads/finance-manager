import type { NextRequest } from "next/server";
import { getSession, type SessionPayload } from "@/lib/auth/session";

// Centraliza a verificação de sessão para Route Handlers.
export function verifySession(request: NextRequest): SessionPayload | null {
  return getSession(request);
}
