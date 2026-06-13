import React, { useEffect, useState } from "react";
import { LayoutDashboard, CalendarDays, Send, MapPin } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../lib/auth.jsx";
import { Shell, Panel, Eyebrow, Btn, Field, Select, Badge, fmtDate, fmtTime } from "../lib/ui.jsx";

export default function Officer() {
  const { session, profile } = useAuth();
  const uid = session?.user?.id;
  const [tab, setTab] = useState("home");
  const [sites, setSites] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [reqs, setReqs] = useState([]);

  async function loadAll() {
    if (!uid) return;
    const [a, sh, r] = await Promise.all([
      supabase.from("assignments").select("sites(name, address)").eq("officer_id", uid),
      supabase.from("shifts").select("*, sites(name)").eq("officer_id", uid).order("start_ts"),
      supabase.from("time_off_requests").select("*").eq("officer_id", uid).order("created_at", { ascending: false }),
    ]);
    setSites((a.data || []).map((x) => x.sites).filter(Boolean));
    setShifts(sh.data || []); setReqs(r.data || []);
  }
  useEffect(() => { loadAll(); }, [uid]);

  const tabs = [
    { id: "home", label: "Command", icon: <LayoutDashboard size={13} /> },
    { id: "schedule", label: "My schedule", icon: <CalendarDays size={13} /> },
    { id: "callin", label: "Call-in", icon: <Send size={13} /> },
  ];

  const next = shifts.find((s) => new Date(s.end_ts) > new Date());

  return (
    <Shell title="Officer" tabs={tabs} tab={tab} setTab={setTab}>
      {tab === "home" && (
        <div>
          <Eyebrow className="!text-ice">{profile?.full_name || "Officer"}</Eyebrow>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Command center</h1>
          <Panel className="mt-5 p-5">
            <Eyebrow>Next shift</Eyebrow>
            {next ? (
              <div className="mt-2">
                <div className="text-lg font-medium text-platinum">{next.sites?.name}</div>
                <div className="text-sm text-steel">{fmtDate(next.start_ts)} · {fmtTime(next.start_ts)}–{fmtTime(next.end_ts)}</div>
              </div>
            ) : <div className="mt-2 text-sm text-steel">No upcoming shifts scheduled.</div>}
          </Panel>
          <div className="mt-4">
            <Eyebrow>My sites</Eyebrow>
            <div className="mt-2 space-y-2">
              {sites.map((s, i) => (
                <Panel key={i} className="p-4 flex items-center gap-3">
                  <MapPin size={16} className="text-ice" />
                  <div>
                    <div className="text-sm text-platinum">{s.name}</div>
                    {s.address && <div className="text-xs text-steel">{s.address}</div>}
                  </div>
                </Panel>
              ))}
              {sites.length === 0 && <p className="text-sm text-steel">You have not been assigned to a site yet.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === "schedule" && (
        <div>
          <Eyebrow className="!text-ice">My schedule</Eyebrow>
          <div className="mt-4 space-y-2">
            {shifts.map((s) => (
              <Panel key={s.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm text-platinum">{s.sites?.name}</div>
                  <div className="text-xs text-steel">{fmtDate(s.start_ts)} · {fmtTime(s.start_ts)}–{fmtTime(s.end_ts)}</div>
                </div>
                <Badge tone={new Date(s.start_ts) > new Date() ? "ice" : "steel"}>
                  {new Date(s.start_ts) > new Date() ? "upcoming" : "past"}
                </Badge>
              </Panel>
            ))}
            {shifts.length === 0 && <p className="text-sm text-steel">No shifts assigned.</p>}
          </div>
        </div>
      )}

      {tab === "callin" && <CallIn uid={uid} reqs={reqs} reload={loadAll} />}
    </Shell>
  );
}

function CallIn({ uid, reqs, reload }) {
  const [f, setF] = useState({ type: "call_out", start_date: "", end_date: "", reason: "" });
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  async function submit() {
    if (!f.start_date) return;
    setBusy(true);
    await supabase.from("time_off_requests").insert({
      officer_id: uid,
      type: f.type,
      start_date: f.start_date,
      end_date: f.end_date || f.start_date,
      reason: f.reason || null,
    });
    setF({ type: "call_out", start_date: "", end_date: "", reason: "" });
    setBusy(false); setOk(true); setTimeout(() => setOk(false), 2500); reload();
  }
  const tone = { pending: "warn", approved: "on", denied: "alert" };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Panel className="p-5 h-fit">
        <Eyebrow className="!text-ice">New call-in / time-off request</Eyebrow>
        <div className="mt-4 space-y-3">
          <Select label="Type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            <option value="call_out">Call out (today)</option>
            <option value="sick">Sick leave</option>
            <option value="pto">PTO</option>
            <option value="vacation">Vacation</option>
            <option value="personal">Personal day</option>
          </Select>
          <Field label="Start date" type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} />
          <Field label="End date (optional)" type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} />
          <Field label="Reason (optional)" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Brief note for the supervisor" />
          <Btn className="w-full" onClick={submit} disabled={busy || !f.start_date}>
            <Send size={14} className="inline mr-1" />Submit for approval
          </Btn>
          {ok && <div className="text-xs text-emerald-300 border border-emerald-400/40 bg-emerald-400/10 rounded-lg px-3 py-2">Submitted. The administrator will review it.</div>}
        </div>
      </Panel>
      <div className="space-y-2">
        <Eyebrow>My requests</Eyebrow>
        {reqs.map((r) => (
          <Panel key={r.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-platinum font-mono uppercase text-xs">{r.type}</div>
              <div className="text-xs text-steel">{fmtDate(r.start_date)} – {fmtDate(r.end_date)}</div>
            </div>
            <Badge tone={tone[r.status]}>{r.status}</Badge>
          </Panel>
        ))}
        {reqs.length === 0 && <p className="text-sm text-steel">No requests yet.</p>}
      </div>
    </div>
  );
}
