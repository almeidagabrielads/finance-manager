import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardClient } from "./DashboardClient";
import { decryptSession, SESSION_COOKIE } from "@/lib/auth/session";

export default async function Home() {
  const cookieStore = await cookies();
  const session = decryptSession(cookieStore.get(SESSION_COOKIE)?.value);

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="flex w-full flex-col">
      <div className="gap-lg p-lg mx-auto flex w-full max-w-6xl flex-col">
        <DashboardClient />
      </div>

      <Link
        href="/lancamentos"
        aria-label="Nova transação"
        className="bottom-lg right-lg bg-primary text-on-primary fixed flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold shadow-lg hover:opacity-90 sm:hidden"
      >
        +
      </Link>
    </main>
  );
}
