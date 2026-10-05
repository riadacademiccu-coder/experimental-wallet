"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AddAgentPage() {
  const supabase = createClient();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setSuccess(false);

    if (name.trim().length < 2) {
      setMessage("Please enter the agent name.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setMessage("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.rpc("admin_add_agent", {
      p_name: name.trim(),
      p_email: email.trim(),
      p_phone: phone.trim(),
    });

    setLoading(false);

    if (error) {
      const errorText = error.message || "";

      if (
        errorText.toLowerCase().includes("duplicate") ||
        errorText.toLowerCase().includes("unique")
      ) {
        setMessage("An agent with this email or phone already exists.");
        return;
      }

      if (errorText.includes("Admin access required")) {
        setMessage("Admin access required.");
        return;
      }

      setMessage(errorText || "Unable to add agent.");
      return;
    }

    if (!data) {
      setMessage("Unable to create agent.");
      return;
    }

    setSuccess(true);
    setMessage("Agent created successfully.");

    setTimeout(() => {
      router.push(`/admin/agents/${data}`);
      router.refresh();
    }, 800);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Kids Bank Ltd
            </h1>

            <p className="text-sm text-slate-500">
              Admin — Add Agent
            </p>
          </div>

          <Link
            href="/admin/agents"
            className="rounded-xl border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700"
          >
            Back to Agents
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="rounded-3xl bg-white p-8 shadow">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">
              Add New Agent
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              The new agent will start as INACTIVE and NOT VERIFIED.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Agent Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Example: Chattogram Agent"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agent@example.com"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Phone
              </label>

              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              />
            </div>

            {message && (
              <div
                className={`rounded-xl p-4 text-sm ${
                  success
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Creating Agent..." : "Create Agent"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}