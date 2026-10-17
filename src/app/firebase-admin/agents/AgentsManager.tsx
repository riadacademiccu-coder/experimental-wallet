"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AgentStatus = "ACTIVE" | "INACTIVE";
type AgentAction = "VERIFY" | "UNVERIFY" | "ACTIVATE" | "DEACTIVATE";

export type AgentRecord = {
  id: string;
  name: string;
  phone: string;
  area: string;
  status: AgentStatus;
  verified: boolean;
  createdAt: string | null;
};

type Props = { initialAgents: AgentRecord[] };

type ApiResult = {
  success?: boolean;
  error?: string;
  message?: string;
  agentId?: string;
  verified?: boolean;
  status?: AgentStatus;
};

function formatDate(value: string | null): string {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Date unavailable";
  return date.toLocaleDateString("en-BD", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function actionText(action: AgentAction): string {
  switch (action) {
    case "VERIFY":
      return "Verify agent";
    case "UNVERIFY":
      return "Remove verification";
    case "ACTIVATE":
      return "Activate agent";
    case "DEACTIVATE":
      return "Deactivate agent";
  }
}

function actionDescription(action: AgentAction, agent: AgentRecord): string {
  switch (action) {
    case "VERIFY":
      return `Confirm you have reviewed ${agent.name}'s details and want to mark this agent verified.`;
    case "UNVERIFY":
      return `Remove verification from ${agent.name}. This is allowed only when the agent is inactive.`;
    case "ACTIVATE":
      return `Allow ${agent.name} to be selected for new withdrawal requests.`;
    case "DEACTIVATE":
      return `Stop ${agent.name} from receiving new withdrawal requests. Existing pending requests are not automatically cancelled.`;
  }
}

async function readApiResponse(response: Response): Promise<ApiResult> {
  try {
    return (await response.json()) as ApiResult;
  } catch {
    return { error: `Server response could not be read (${response.status}).` };
  }
}

export default function AgentsManager({ initialAgents }: Props) {
  const router = useRouter();
  const [agents, setAgents] = useState(initialAgents);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [creating, setCreating] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    agentId: string;
    action: AgentAction;
  } | null>(null);
  const [acting, setActing] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setAgents(initialAgents);
  }, [initialAgents]);

  const activeCount = agents.filter((agent) => agent.status === "ACTIVE" && agent.verified).length;
  const verifiedCount = agents.filter((agent) => agent.verified).length;
  const pendingCount = agents.filter((agent) => !agent.verified).length;

  const visibleAgents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return agents;
    return agents.filter((agent) =>
      [agent.name, agent.area, agent.phone].some((value) => value.toLowerCase().includes(query))
    );
  }, [agents, search]);

  const selectedAgent = pendingAction
    ? agents.find((agent) => agent.id === pendingAction.agentId)
    : undefined;

  function resetMessages() {
    setError("");
    setNotice("");
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating || acting || uncertain) return;
    resetMessages();

    const cleanName = name.trim().replace(/\s+/g, " ");
    const cleanArea = area.trim().replace(/\s+/g, " ");
    const cleanPhone = phone.trim();

    if (cleanName.length < 2 || cleanName.length > 80) {
      setError("Agent name must contain 2 to 80 characters.");
      return;
    }
    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
      setError("Enter a valid 11-digit Bangladesh phone number.");
      return;
    }
    if (cleanArea.length < 2 || cleanArea.length > 100) {
      setError("Area must contain 2 to 100 characters.");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/firebase-admin/agents", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, phone: cleanPhone, area: cleanArea }),
      });
      const result = await readApiResponse(response);
      if (!response.ok || result.success !== true || !result.agentId) {
        // Never silently retry a create operation: it might already have succeeded.
        if (response.status >= 500) {
          setUncertain(true);
          throw new Error("Creation might have succeeded. Refresh the agent list and check before trying again.");
        }
        throw new Error(result.error ?? "Unable to create agent.");
      }

      setAgents((previous) => [
        {
          id: result.agentId as string,
          name: cleanName,
          phone: cleanPhone,
          area: cleanArea,
          status: "INACTIVE",
          verified: false,
          createdAt: new Date().toISOString(),
        },
        ...previous,
      ]);
      setName("");
      setPhone("");
      setArea("");
      setNotice(`${cleanName} was added. Verify the agent before activation.`);
      router.refresh();
    } catch (caught) {
      if (caught instanceof TypeError) {
        setUncertain(true);
        setError("Connection interrupted. Creation may have succeeded. Refresh and check the agent list before trying again.");
      } else {
        setError(caught instanceof Error ? caught.message : "Unable to confirm agent creation.");
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleAction() {
    if (!pendingAction || !selectedAgent || acting || creating || uncertain) return;
    const { agentId, action } = pendingAction;
    resetMessages();
    setActing(true);

    try {
      const response = await fetch("/api/firebase-admin/agents", {
        method: "PATCH",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, action }),
      });
      const result = await readApiResponse(response);
      if (!response.ok || result.success !== true) {
        if (response.status >= 500) {
          setUncertain(true);
          throw new Error("The result is uncertain. Refresh and check the agent's status before another change.");
        }
        throw new Error(result.error ?? "Unable to update agent.");
      }

      if (typeof result.verified === "boolean" && (result.status === "ACTIVE" || result.status === "INACTIVE")) {
        setAgents((previous) =>
          previous.map((agent) =>
            agent.id === agentId
              ? { ...agent, verified: result.verified as boolean, status: result.status as AgentStatus }
              : agent
          )
        );
      }
      setNotice(`${selectedAgent.name}: ${result.message ?? "Agent updated successfully."}`);
      setPendingAction(null);
      router.refresh();
    } catch (caught) {
      if (caught instanceof TypeError) {
        setUncertain(true);
        setError("Connection interrupted. Check the agent status in Firebase before trying again.");
      } else {
        setError(caught instanceof Error ? caught.message : "Unable to confirm agent update.");
      }
      setPendingAction(null);
    } finally {
      setActing(false);
    }
  }

  const busy = creating || acting;
  const inputClass = "w-full rounded-2xl border border-white/10 bg-[#0b1727] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50 focus:ring-4 focus:ring-emerald-400/10 disabled:opacity-50";

  return (
    <div className="space-y-7">
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[26px] border border-emerald-400/15 bg-gradient-to-br from-emerald-400/[0.12] to-teal-400/[0.03] p-6 backdrop-blur-xl">
          <p className="text-sm font-semibold text-emerald-200">Active & verified</p>
          <p className="mt-4 text-4xl font-extrabold tabular-nums text-emerald-300">{activeCount}</p>
          <p className="mt-2 text-xs text-emerald-200/60">Available for new withdrawal requests</p>
        </div>
        <div className="rounded-[26px] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl">
          <p className="text-sm font-semibold text-slate-300">Verified agents</p>
          <p className="mt-4 text-4xl font-extrabold tabular-nums">{verifiedCount}</p>
          <p className="mt-2 text-xs text-slate-500">Approved identity and details</p>
        </div>
        <div className="rounded-[26px] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl">
          <p className="text-sm font-semibold text-slate-300">Awaiting verification</p>
          <p className="mt-4 text-4xl font-extrabold tabular-nums">{pendingCount}</p>
          <p className="mt-2 text-xs text-slate-500">Not eligible for activation yet</p>
        </div>
      </section>

      {(error || notice || uncertain) && (
        <div className={`rounded-2xl border p-5 text-sm leading-6 ${error || uncertain ? "border-amber-400/20 bg-amber-400/[0.07] text-amber-100" : "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-100"}`} role={error || uncertain ? "alert" : "status"}>
          {error || notice}
          {uncertain && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p>Refresh the page and verify the saved record before doing anything else.</p>
              <button type="button" onClick={() => window.location.reload()} className="rounded-xl border border-amber-300/30 px-4 py-2 font-semibold transition hover:bg-white/10">
                Refresh and review
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.3fr)]">
        <section className="rounded-[30px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/10 backdrop-blur-xl sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-xl text-emerald-300">+</div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-300">New entry</p>
              <h2 className="mt-1 text-xl font-extrabold">Register an agent</h2>
            </div>
          </div>
          <p className="mt-5 text-sm leading-7 text-slate-400">New agents start inactive and unverified. Review their details before enabling withdrawals.</p>

          <form onSubmit={handleCreate} className="mt-7 space-y-5">
            <div>
              <label htmlFor="agentName" className="mb-2 block text-sm font-semibold text-slate-200">Agent name</label>
              <input id="agentName" className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter full agent name" maxLength={80} required disabled={busy || uncertain} autoComplete="off" />
            </div>
            <div>
              <label htmlFor="agentPhone" className="mb-2 block text-sm font-semibold text-slate-200">Phone number</label>
              <input id="agentPhone" type="tel" inputMode="tel" className={inputClass} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="01XXXXXXXXX" maxLength={11} required disabled={busy || uncertain} autoComplete="off" />
            </div>
            <div>
              <label htmlFor="agentArea" className="mb-2 block text-sm font-semibold text-slate-200">Service area</label>
              <input id="agentArea" className={inputClass} value={area} onChange={(event) => setArea(event.target.value)} placeholder="e.g. Chattogram" maxLength={100} required disabled={busy || uncertain} autoComplete="off" />
            </div>
            <button type="submit" disabled={busy || uncertain} className="w-full rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-400 px-6 py-4 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-400/10 transition duration-300 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
              {creating ? "Creating agent..." : "Create agent  ↗"}
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] shadow-2xl shadow-black/10 backdrop-blur-xl">
          <div className="flex flex-col justify-between gap-4 border-b border-white/10 p-6 sm:flex-row sm:items-center sm:p-8">
            <div>
              <h2 className="text-xl font-extrabold">Agent directory</h2>
              <p className="mt-2 text-sm text-slate-400">Review and manage registered agents</p>
            </div>
            <span className="self-start rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300">{agents.length} shown</span>
          </div>

          <div className="border-b border-white/10 p-5 sm:px-8">
            <label htmlFor="agentSearch" className="sr-only">Search agents</label>
            <input id="agentSearch" className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, area, or number" />
          </div>

          {visibleAgents.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-3xl text-emerald-300">◇</div>
              <h3 className="mt-6 text-xl font-extrabold">{agents.length === 0 ? "No agents registered" : "No agents match your search"}</h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-400">{agents.length === 0 ? "Use the form to add your first agent. They will appear here." : "Try a different name, phone number, or service area."}</p>
            </div>
          ) : (
            <div className="max-h-[850px] divide-y divide-white/10 overflow-y-auto">
              {visibleAgents.map((agent) => {
                const canManage = !busy && !uncertain;
                return (
                  <article key={agent.id} className="p-5 transition hover:bg-white/[0.025] sm:p-7">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div className="flex min-w-0 gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-emerald-400/10 text-xl font-extrabold text-emerald-300">{agent.name.charAt(0).toUpperCase() || "A"}</div>
                        <div className="min-w-0">
                          <h3 className="break-words text-lg font-extrabold">{agent.name}</h3>
                          <p className="mt-1 break-words text-sm text-slate-400">{agent.area} · {agent.phone}</p>
                          <p className="mt-1 text-xs text-slate-500">Registered {formatDate(agent.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${agent.status === "ACTIVE" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/5 text-slate-300"}`}>{agent.status}</span>
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${agent.verified ? "border-sky-400/20 bg-sky-400/10 text-sky-300" : "border-amber-400/20 bg-amber-400/10 text-amber-300"}`}>{agent.verified ? "VERIFIED" : "UNVERIFIED"}</span>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2 sm:pl-[60px]">
                      {!agent.verified && (
                        <button type="button" disabled={!canManage} onClick={() => { resetMessages(); setPendingAction({ agentId: agent.id, action: "VERIFY" }); }} className="rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50">Verify agent</button>
                      )}
                      {agent.verified && agent.status === "INACTIVE" && (
                        <>
                          <button type="button" disabled={!canManage} onClick={() => { resetMessages(); setPendingAction({ agentId: agent.id, action: "ACTIVATE" }); }} className="rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50">Activate</button>
                          <button type="button" disabled={!canManage} onClick={() => { resetMessages(); setPendingAction({ agentId: agent.id, action: "UNVERIFY" }); }} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-white/10 disabled:opacity-50">Remove verification</button>
                        </>
                      )}
                      {agent.status === "ACTIVE" && (
                        <button type="button" disabled={!canManage} onClick={() => { resetMessages(); setPendingAction({ agentId: agent.id, action: "DEACTIVATE" }); }} className="rounded-xl border border-rose-400/25 bg-rose-400/10 px-4 py-2.5 text-xs font-extrabold text-rose-200 transition hover:bg-rose-400/20 disabled:opacity-50">Deactivate</button>
                      )}
                    </div>
                    {pendingAction?.agentId === agent.id && (
                      <div className="mt-5 rounded-2xl border border-emerald-400/25 bg-[#0b1c28] p-5 sm:ml-[60px]">
                        <p className="text-sm font-extrabold text-emerald-200">Confirm: {actionText(pendingAction.action)}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{actionDescription(pendingAction.action, agent)}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button type="button" disabled={acting} onClick={handleAction} className="rounded-xl bg-emerald-400 px-5 py-2.5 text-xs font-extrabold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50">{acting ? "Saving..." : "Yes, confirm"}</button>
                          <button type="button" disabled={acting} onClick={() => setPendingAction(null)} className="rounded-xl border border-white/15 px-5 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50">Cancel</button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
          {agents.length >= 100 && (
            <p className="border-t border-white/10 p-5 text-xs text-slate-400">Showing the latest 100 agents. Pagination can be added later.</p>
          )}
        </section>
      </div>
    </div>
  );
}
