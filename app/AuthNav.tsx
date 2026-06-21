import Link from "next/link";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";

/** Dynamic (per-request) nav slot — streamed in via Suspense so layout's static parts can still prerender. */
export async function AuthNav({ className }: { className?: string }) {
  const linkClass = className ?? "text-sm font-medium text-violet-200 hover:text-white";
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return (
      <Link href="/login" className={linkClass}>
        Sign in
      </Link>
    );
  }

  return (
    <>
      <Link href="/entry" className={linkClass}>
        My entry
      </Link>
      {isAdminEmail(email) ? (
        <Link href="/admin" className={linkClass}>
          Admin
        </Link>
      ) : null}
    </>
  );
}
