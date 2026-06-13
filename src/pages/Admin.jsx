import React, { useEffect, useState } from "react";
import { LayoutDashboard, MapPin, Users, CalendarDays, CalendarRange, Inbox, Plus, Check, X, UserCog, ScanLine, Activity as ActivityIcon } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { Shell, Panel, Eyebrow, Btn, Field, Select, Stat, Badge, fmtDate, fmtTime } from "../lib/ui.jsx";
import Calendar from "./Calendar.jsx";
import { Checkpoints, Activity } from "./AdminReview.jsx";

export default function Admin() {
  const [tab, setTab] = useState("overview");
  const [people, setPeople] = useState([]);
  const [sites, setSites] = useState([]);
  const [assigns, setAssigns] = useState([]);
  const [clientSites, setClientSites] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [reqs, setReqs] = useState([]);

  async function loadAll() {
    const [p, s, a, cs, sh, r] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("sites").select("*").order("name"),
      supabase.from("assignments").select("*, sites(name), profiles(full_name)"),
      supabase.from("client_sites").select("*, sites(name), profiles(full_name)"),
      supabase.from("shifts").select("*, sites(name), profiles(full_name)").order("start_ts", { ascending: false }).limit(500),
      supabase.from("time_off_requests").select("*, profiles!time_off_requests_officer_id_fkey(full_name)").order("created_at", { ascending: false }),
    ]);
    setPeople(p.data || []); setSites(s.data || []); setAssigns(a.data || []);
    setClientSites(cs.data || []); setShifts(sh.data || []); setReqs(r.data || []);
  }
  useEffect(() => { loadAll(); }, []);

  const officers = people.filter((x) => x.role === "officer");
  const clients = people.filter((x) => x.role === "client");

  const tabs = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard size={13} /> },
    { id: "sites", label: "Sites", icon: <MapPin size={13} /> },
    { id: "people", label: "People", icon: <Users size={13} /> },
    { id: "schedule", label: "Schedule", icon: <CalendarDays size={13} /> },
    { id: "calendar", label: "Calendar", icon: <CalendarRange size={13} /> },
    { id: "checkpoints", label: "Checkpoints", icon: <ScanLine size={13} /> },
    { id: "activity", label: "Activity", icon: <ActivityIcon size={13} /> },
    { id: "requests", label: "Requests", icon: <Inbox size={13} /> },
  ];

  return (
    <Shell title="Command" tabs={tabs} tab={tab} setTab={setTab}>
      {tab === "overview" && <Overview {...{ officers, clients, sites, shifts, reqs }} />}
      {tab === "sites" && <Sites {...{ sites, reload: loadAll }} />}
      {tab === "people" && <People {...{ people, officers, clients, sites, assigns, clientSites, reload: loadAll }} />}
      {tab === "schedule" && <Schedule {...{ sites, officers, shifts, reload: loadAll }} />}
      {tab === "calendar" && <Calendar shifts={shifts} sites={sites} officers={officers} />}
      {tab === "checkpoints" && <Checkpoints sites={sites} />}
      {tab === "activity" && <Activity />}
      {tab === "requests" && <Requests {...{ reqs, reload: loadAll }} />}
    </Shell>
  );
}

/* ---------------- overview ---------------- */
function Overview({ officers, clients, sites, shifts, reqs }) {
  const pending = reqs.filter((r) => r.status === "pending").length;
  const upcoming = shifts.filter((s) => new Date(s.start_ts) > new Date()).length;
  return (
    <div>
      <Eyebrow className="!text-ice">Mission control</Eyebrow>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Overview</h1>
      <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Officers" value={officers.length} tone="on" />
        <Stat label="Clients" value={clients.length} />
        <Stat label="Sites" value={sites.length} />
        <Stat label="Pending requests" value={pending} tone={pending ? "warn" : "platinum"} />
      </div>
      <Panel className="mt-4 p-5">
        <Eyebrow>Upcoming shifts</Eyebrow>
        <div className="mt-1 text-3xl font-semibold">{upcoming}</div>
        <div className="text-xs text-steel">scheduled ahead of now</div>
      </Panel>
    </div>
  );
}

/* ---------------- sites ---------------- */
function Sites({ sites, reload }) {
  const [f, setF] = useState({ name: "", address: "", notes: "" });
  const [busy, setBusy] = useState(false);
  async function add() {
    if (!f.name) return;
    setBusy(true);
    await supabase.from("sites").insert({ name: f.name, address: f.address || null, notes: f.notes || null });
    setF({ name: "", address: "", notes: "" }); setBusy(false); reload();
  }
  async function del(id) {
    await supabase.from("sites").delete().eq("id", id); reload();
  }
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Panel className="p-5 h-fit">
        <Eyebrow className="!text-ice">New site location</Eyebrow>
        <div className="mt-4 space-y-3">
          <Field label="Site name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Harbor Point Logistics" />
          <Field label="Address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="200 Dock Rd, Binghamton NY" />
          <Field label="Post orders / notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Gate codes, contacts…" />
          <Btn className="w-full" onClick={add} disabled={busy || !f.name}><Plus size={15} className="inline mr-1" />Add site</Btn>
        </div>
      </Panel>
      <div className="space-y-2">
        <Eyebrow>{sites.length} sites</Eyebrow>
        {sites.map((s) => (
          <Panel key={s.id} className="p-4 flex items-start justify-between">
            <div>
              <div className="font-medium text-platinum">{s.name}</div>
              {s.address && <div className="text-xs text-steel mt-0.5">{s.address}</div>}
              {s.notes && <div className="text-xs text-steel/80 mt-1">{s.notes}</div>}
            </div>
            <button onClick={() => del(s.id)} className="text-steel hover:text-red-400"><X size={15} /></button>
          </Panel>
        ))}
        {sites.length === 0 && <p className="text-sm text-steel">No sites yet. Add your first on the left.</p>}
      </div>
    </div>
  );
}

/* ---------------- people / roles / assignment ---------------- */
function People({ people, officers, clients, sites, assigns, clientSites, reload }) {
  const [asg, setAsg] = useState({ officer: "", site: "" });
  const [lnk, setLnk] = useState({ client: "", site: "" });

  async function setRole(id, role) { await supabase.from("profiles").update({ role }).eq("id", id); reload(); }
  async function assign() {
    if (!asg.officer || !asg.site) return;
    await supabase.from("assignments").insert({ officer_id: asg.officer, site_id: asg.site });
    setAsg({ officer: "", site: "" }); reload();
  }
  async function unassign(id) { await supabase.from("assignments").delete().eq("id", id); reload(); }
  async function link() {
    if (!lnk.client || !lnk.site) return;
    await supabase.from("client_sites").insert({ client_id: lnk.client, site_id: lnk.site });
    setLnk({ client: "", site: "" }); reload();
  }
  async function unlink(id) { await supabase.from("client_sites").delete().eq("id", id); reload(); }

  return (
    <div className="space-y-4">
      {/* roles */}
      <Panel className="p-5">
        <Eyebrow className="!text-ice"><UserCog size={12} className="inline mr-1" />People & roles</Eyebrow>
        <div className="mt-4 space-y-2">
          {people.map((p) => (
            <div key={p.id} className="flex items-center justify-between border-b border-line pb-2">
              <div>
                <div className="text-sm text-platinum">{p.full_name || "—"}</div>
                <div className="text-[11px] text-steel font-mono">{p.id.slice(0, 8)}</div>
              </div>
              <div className="flex gap-1">
                {["admin", "officer", "client"].map((r) => (
                  <button key={r} onClick={() => setRole(p.id, r)}
                    className={`px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider border
                      ${p.role === r ? "bg-platinum text-ink border-platinum" : "text-steel border-line hover:border-steel"}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {people.length === 0 && <p className="text-sm text-steel">No accounts yet.</p>}
        </div>
      </Panel>

      {/* assign officer -> site */}
      <Panel className="p-5">
        <Eyebrow className="!text-ice">Assign officer to site</Eyebrow>
        <div className="mt-4 grid sm:grid-cols-3 gap-3">
          <Select label="Officer" value={asg.officer} onChange={(e) => setAsg({ ...asg, officer: e.target.value })}>
            <option value="">Select…</option>
            {officers.map((o) => <option key={o.id} value={o.id}>{o.full_name || o.id.slice(0, 8)}</option>)}
          </Select>
          <Select label="Site" value={asg.site} onChange={(e) => setAsg({ ...asg, site: e.target.value })}>
            <option value="">Select…</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <div className="flex items-end"><Btn className="w-full" onClick={assign} disabled={!asg.officer || !asg.site}>Assign</Btn></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {assigns.map((a) => (
            <span key={a.id} className="text-xs rounded-lg border border-line bg-panel2 px-2 py-1 flex items-center gap-2">
              {a.profiles?.full_name || "officer"} → {a.sites?.name}
              <button onClick={() => unassign(a.id)} className="text-steel hover:text-red-400"><X size={12} /></button>
            </span>
          ))}
        </div>
      </Panel>

      {/* link client -> site */}
      <Panel className="p-5">
        <Eyebrow className="!text-ice">Give client visibility to a site</Eyebrow>
        <div className="mt-4 grid sm:grid-cols-3 gap-3">
          <Select label="Client" value={lnk.client} onChange={(e) => setLnk({ ...lnk, client: e.target.value })}>
            <option value="">Select…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name || c.id.slice(0, 8)}</option>)}
          </Select>
          <Select label="Site" value={lnk.site} onChange={(e) => setLnk({ ...lnk, site: e.target.value })}>
            <option value="">Select…</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <div className="flex items-end"><Btn className="w-full" onClick={link} disabled={!lnk.client || !lnk.site}>Link</Btn></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {clientSites.map((c) => (
            <span key={c.id} className="text-xs rounded-lg border border-line bg-panel2 px-2 py-1 flex items-center gap-2">
              {c.profiles?.full_name || "client"} → {c.sites?.name}
              <button onClick={() => unlink(c.id)} className="text-steel hover:text-red-400"><X size={12} /></button>
            </span>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- schedule ---------------- */
function Schedule({ sites, officers, shifts, reload }) {
  const [f, setF] = useState({ site: "", officer: "", start: "", end: "" });
  async function add() {
    if (!f.site || !f.start || !f.end) return;
    await supabase.from("shifts").insert({
      site_id: f.site,
      officer_id: f.officer || null,
      start_ts: new Date(f.start).toISOString(),
      end_ts: new Date(f.end).toISOString(),
    });
    setF({ site: "", officer: "", start: "", end: "" }); reload();
  }
  async function del(id) { await supabase.from("shifts").delete().eq("id", id); reload(); }
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Panel className="p-5 h-fit">
        <Eyebrow className="!text-ice">Schedule a shift</Eyebrow>
        <div className="mt-4 space-y-3">
          <Select label="Site" value={f.site} onChange={(e) => setF({ ...f, site: e.target.value })}>
            <option value="">Select…</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Select label="Officer (optional — leave open)" value={f.officer} onChange={(e) => setF({ ...f, officer: e.target.value })}>
            <option value="">Open shift</option>
            {officers.map((o) => <option key={o.id} value={o.id}>{o.full_name || o.id.slice(0, 8)}</option>)}
          </Select>
          <Field label="Start" type="datetime-local" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} />
          <Field label="End" type="datetime-local" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} />
          <Btn className="w-full" onClick={add} disabled={!f.site || !f.start || !f.end}><Plus size={15} className="inline mr-1" />Add shift</Btn>
        </div>
      </Panel>
      <div className="space-y-2">
        <Eyebrow>Shifts</Eyebrow>
        {shifts.map((s) => (
          <Panel key={s.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-platinum">{s.sites?.name}</div>
              <div className="text-xs text-steel">{fmtDate(s.start_ts)} · {fmtTime(s.start_ts)}–{fmtTime(s.end_ts)}</div>
              <div className="mt-1">{s.profiles?.full_name ? <Badge tone="on">{s.profiles.full_name}</Badge> : <Badge tone="warn">open shift</Badge>}</div>
            </div>
            <button onClick={() => del(s.id)} className="text-steel hover:text-red-400"><X size={15} /></button>
          </Panel>
        ))}
        {shifts.length === 0 && <p className="text-sm text-steel">No shifts scheduled.</p>}
      </div>
    </div>
  );
}

/* ---------------- requests (call-in approval) ---------------- */
function Requests({ reqs, reload }) {
  async function decide(id, status) {
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("time_off_requests").update({ status, reviewer_id: u?.user?.id }).eq("id", id);
    reload();
  }
  const tone = { pending: "warn", approved: "on", denied: "alert" };
  return (
    <div>
      <Eyebrow className="!text-ice">Call-in & time-off requests</Eyebrow>
      <div className="mt-4 space-y-2">
        {reqs.map((r) => (
          <Panel key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-platinum">
                  {r.profiles?.full_name || "Officer"} · <span className="font-mono uppercase text-xs text-steel">{r.type}</span>
                </div>
                <div className="text-xs text-steel mt-0.5">{fmtDate(r.start_date)} – {fmtDate(r.end_date)}</div>
                {r.reason && <div className="text-xs text-steel/80 mt-1">{r.reason}</div>}
              </div>
              <Badge tone={tone[r.status]}>{r.status}</Badge>
            </div>
            {r.status === "pending" && (
              <div className="mt-3 flex gap-2">
                <Btn className="flex-1" onClick={() => decide(r.id, "approved")}><Check size={14} className="inline mr-1" />Approve</Btn>
                <Btn variant="ghost" className="flex-1" onClick={() => decide(r.id, "denied")}><X size={14} className="inline mr-1" />Deny</Btn>
              </div>
            )}
          </Panel>
        ))}
        {reqs.length === 0 && <p className="text-sm text-steel">No requests yet.</p>}
      </div>
    </div>
  );
}
