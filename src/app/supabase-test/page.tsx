import { createClient } from "@/lib/supabase/server";

export default async function SupabaseTestPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("healthcheck");

  const connected = !error && data === "ok";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-slate-900">
          Kids Bank Ltd
        </h1>

        <p className="mt-2 text-slate-500">
          Supabase Connection Test
        </p>

        <div
          className={`mt-8 rounded-2xl p-5 ${
            connected
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          <p className="font-semibold">
            {connected
              ? "✓ Supabase connected successfully"
              : "✕ Supabase connection failed"}
          </p>

          {!connected && (
            <p className="mt-2 text-sm">
              Check your environment variables and database setup.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}