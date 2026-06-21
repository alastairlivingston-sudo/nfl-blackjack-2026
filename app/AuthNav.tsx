import Link from "next/link";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";

/** Dynamic (per-request) nav slot — streamed in via Suspense so layout's static parts can still prerender. */
export async function AuthNav() {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return (
      <Link href="/login" className="text-sm font-medium text-violet-200 hover:text-white">
        Sign in
      </Link>
    );
  }

  return (
    <>
      <Link href="/entry" className="text-sm font-medium text-violet-200 hover:text-white">
        My entry
      </Link>
      {isAdminEmail(email) ? (
        <Link href="/admin" className="text-sm font-medium text-violet-200 hover:text-white">
          Admin
        </Link>
      ) : null}
    </>
  );
}
