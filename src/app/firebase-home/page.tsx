
import { redirect } from "next/navigation";
import { getCurrentWalletUser } from "@/lib/firebase/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function FirebaseHomePage() {
  const user = await getCurrentWalletUser();

  if (!user) {
    redirect("/firebase-login");
  }

  if (user.role === "ADMIN") {
    redirect("/firebase-admin");
  }

  redirect("/firebase-dashboard");
}
