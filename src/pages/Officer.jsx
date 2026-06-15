import React, { useEffect, useState } from "react";
import { LayoutDashboard, CalendarDays, Send, MapPin, Navigation, FileText, AlertTriangle, Camera, Loader2, HelpCircle, Repeat, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../lib/auth.jsx";
import { Shell, Panel, Eyebrow, Btn, Field, Select, Badge, fmtDate, fmtTime } from "../lib/ui.jsx";
import Patrol from "./Patrol.jsx";
import Help from "./Help.jsx";

const INCIDENT_TYPES = ["Theft", "Vandalism", "Trespassing", "Injury", "Fire", "Safety hazard", "Vehicle", "Suspicious activity"];

async function uploadPhotos(files, setBusy) {
  const urls = [];
  for (const file of files) {
    const clean = file.name.replace(/[^a-zA-Z0-9._-]/g, "");
    const path = `${crypto.randomUUID()}-${clean}`;
    const { error } = await supabase.storage.from("evidence").upload(path, file);
    if (!error) {
      const { data } = supabase.storage.from("evidence").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
  }
  return urls;
}

function PhotoPicker({ urls, setUrls }) {
  const [busy, setBusy] = useState(false);
  async function onPick(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true);
    const added = await uploadPhotos(files);
    setUrls((u) => [...u, ...added]);
    setBusy(false);
    e.target.value = "";
  }
  return (
    <div>
      <Eyebrow className="mb-1.5">Photos</Eyebrow>
      <label className="flex items-center justify-center gap-2 py-4 rounded-lg border border-dashed border-line text-steel cursor-pointer hover:border-steel">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
        <span className="text-sm">{busy ? "Uploading…" : "Add photos"}</span>
        <input type="file" accept="image/*" multiple className="hidden" onChange={onPick} disabled={busy} />
      </label>
      {urls.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {urls.map((u, i) => (
            <img key={i} src={u} alt="" className="w-14 h-14 object-cover rounded-lg border border-line" />
          ))}
        </div>
      )}
    </div>
  );
}

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
      supabase.from("assignments").select("site_id, sites(name, address)").eq("officer_id", uid),
      supabase.from("shifts").select("*, sites(name)").eq("officer_id", uid).order("start_ts"),
      supabase.from("time_off_requests").select("*").eq("officer_id", uid).order("created_at", { ascending: false }),
    ]);
    setSites((a.data || []).map((x) => ({ id: x.site_id, name: x.sites?.name, address: x.sites?.address })).filter((s) => s.name));
    setShifts(sh.data || []);
    setReqs(r.data || []);
  }
  useEffect(() => { loadAll(); }, [uid]);

  const tabs = [
    { id: "home", label: "Command", icon: <LayoutDashboard size={13} /> },
    { id: "clock", label: "Time clock", icon: <Clock size={13} /> },
    { id: "patrol", label: "Patrol", icon: <Navigation size={13} /> },
    { id: "report", label: "Daily report", icon: <FileText size={13} /> },
    { id: "incident", label: "Incident", icon: <AlertTriangle size={13} /> },
    { id: "handoff", label: "Handoff", icon: <Repeat size={13} /> },
    { id: "schedule", label: "Schedule", icon: <CalendarDays size={13} /> },
    { id: "callin", label: "Call-in", icon: <Send size={13} /> },
    { id: "help", label: "Help", icon: <HelpCircle size={13} /> },
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
          <div className="mt-4 grid grid-cols-3 gap-3">
            <button onClick={() => setTab("patrol")} className="p-4 rounded-xl text-left bg-platinum text-ink">
              <Navigation size={18} /><div className="mt-2 text-sm font-semibold">Patrol</div>
            </button>
            <button onClick={() => setTab("report")} className="p-4 rounded-xl text-left bg-panel border border-line text-platinum">
              <FileText size={18} className="text-ice" /><div className="mt-2 text-sm font-semibold">Daily report</div>
            </button>
            <button onClick={() => setTab("incident")} className="p-4 rounded-xl text-left bg-panel border border-line text-platinum" style={{ borderColor: "rgba(240,82,74,0.4)" }}>
              <AlertTriangle size={18} className="text-red-400" /><div className="mt-2 text-sm font-semibold">Incident</div>
            </button>
          </div>
          <div className="mt-4">
            <Eyebrow>My sites</Eyebrow>
            <div className="mt-2 space-y-2">
              {sites.map((s) => (
                <Panel key={s.id} className="p-4 flex items-center gap-3">
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

      {tab === "patrol" && <Patrol />}
      {tab === "clock" && <TimeClock uid={uid} sites={sites} />}
      {tab === "report" && <DailyReport uid={uid} sites={sites} />}
      {tab === "incident" && <Incident uid={uid} sites={sites} />}
      {tab === "handoff" && <Handoff uid={uid} sites={sites} />}

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
      {tab === "help" && <Help role="officer" />}
    </Shell>
  );
}

/* ---------------- daily activity report ---------------- */
function DailyReport({ uid, sites }) {
  const [f, setF] = useState({ site: "", conditions: "", summary: "", weather: "" });
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  async function submit() {
    if (!f.site) return;
    setBusy(true);
    await supabase.from("daily_reports").insert({
      officer_id: uid, site_id: f.site,
      conditions: f.conditions || null, summary: f.summary || null,
      weather: f.weather || null, photo_urls: photos,
    });
    setF({ site: "", conditions: "", summary: "", weather: "" }); setPhotos([]);
    setBusy(false); setOk(true); setTimeout(() => setOk(false), 2500);
  }

  return (
    <div>
      <Eyebrow className="!text-ice">Daily activity report</Eyebrow>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">New report</h1>
      <Panel className="mt-4 p-5 space-y-3">
        <Select label="Site" value={f.site} onChange={(e) => setF({ ...f, site: e.target.value })}>
          <option value="">Select your post…</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <div>
          <Eyebrow className="mb-1.5">Site conditions</Eyebrow>
          <textarea rows={2} value={f.conditions} onChange={(e) => setF({ ...f, conditions: e.target.value })}
            placeholder="Gates secure, lighting operational…"
            className="w-full rounded-lg bg-panel border border-line px-3 py-2.5 text-sm text-platinum outline-none focus:border-ice placeholder:text-steel/60" />
        </div>
        <div>
          <Eyebrow className="mb-1.5">Patrol / activity summary</Eyebrow>
          <textarea rows={4} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })}
            placeholder="Rounds completed, visitors, deliveries, notable events…"
            className="w-full rounded-lg bg-panel border border-line px-3 py-2.5 text-sm text-platinum outline-none focus:border-ice placeholder:text-steel/60" />
        </div>
        <Field label="Weather" value={f.weather} onChange={(e) => setF({ ...f, weather: e.target.value })} placeholder="Clear, 38°F" />
        <PhotoPicker urls={photos} setUrls={setPhotos} />
        <Btn className="w-full" onClick={submit} disabled={busy || !f.site}>{busy ? "Submitting…" : "Submit report"}</Btn>
        {ok && <div className="text-xs text-emerald-300 border border-emerald-400/40 bg-emerald-400/10 rounded-lg px-3 py-2">Report submitted to the administrator.</div>}
      </Panel>
    </div>
  );
}

/* ---------------- incident report ---------------- */
function Incident({ uid, sites }) {
  const [f, setF] = useState({ site: "", type: "", severity: "Medium", narrative: "" });
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  async function submit() {
    if (!f.site || !f.type) return;
    setBusy(true);
    await supabase.from("incidents").insert({
      officer_id: uid, site_id: f.site, type: f.type, severity: f.severity,
      narrative: f.narrative || null, photo_urls: photos,
    });
    setF({ site: "", type: "", severity: "Medium", narrative: "" }); setPhotos([]);
    setBusy(false); setOk(true); setTimeout(() => setOk(false), 2500);
  }

  if (ok) {
    return (
      <div className="text-center py-16">
        <AlertTriangle size={36} className="text-emerald-400 mx-auto" />
        <h2 className="mt-3 text-xl font-semibold text-platinum">Incident submitted</h2>
        <p className="mt-2 text-sm text-steel">Routed to supervisor review.</p>
      </div>
    );
  }

  return (
    <div>
      <Eyebrow className="!text-red-400">Incident report</Eyebrow>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">New incident</h1>
      <Panel className="mt-4 p-5 space-y-4">
        <Select label="Site" value={f.site} onChange={(e) => setF({ ...f, site: e.target.value })}>
          <option value="">Select your post…</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <div>
          <Eyebrow className="mb-1.5">Type</Eyebrow>
          <div className="flex flex-wrap gap-2">
            {INCIDENT_TYPES.map((t) => (
              <button key={t} onClick={() => setF({ ...f, type: t })}
                className="px-3 py-2 rounded-lg text-sm border"
                style={{ color: f.type === t ? "#0B0C0E" : "#D6DAE0", background: f.type === t ? "#D6DAE0" : "#141619", borderColor: f.type === t ? "#D6DAE0" : "#2A2E34" }}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Eyebrow className="mb-1.5">Severity</Eyebrow>
          <div className="flex gap-2">
            {[["Low", "#8A929E"], ["Medium", "#F5A524"], ["High", "#F0524A"]].map(([s, col]) => (
              <button key={s} onClick={() => setF({ ...f, severity: s })}
                className="flex-1 py-2 rounded-lg text-sm font-medium border"
                style={{ color: f.severity === s ? "#0B0C0E" : col, background: f.severity === s ? col : `${col}22`, borderColor: `${col}55` }}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Eyebrow className="mb-1.5">Narrative</Eyebrow>
          <textarea rows={4} value={f.narrative} onChange={(e) => setF({ ...f, narrative: e.target.value })}
            placeholder="What happened, when, who was involved…"
            className="w-full rounded-lg bg-panel border border-line px-3 py-2.5 text-sm text-platinum outline-none focus:border-ice placeholder:text-steel/60" />
        </div>
        <PhotoPicker urls={photos} setUrls={setPhotos} />
        <Btn className="w-full" onClick={submit} disabled={busy || !f.site || !f.type}
          style={{ background: f.type ? "#F0524A" : undefined, color: f.type ? "#fff" : undefined }}>
          {busy ? "Submitting…" : "Submit for supervisor review"}
        </Btn>
      </Panel>
    </div>
  );
}

/* ---------------- time clock ---------------- */
function TimeClock({ uid, sites }) {
  const [open, setOpen] = useState(null);
  const [siteId, setSiteId] = useState("");
  const [today, setToday] = useState([]);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!uid) return;
    const oc = await supabase.from("time_entries").select("*").eq("officer_id", uid).is("clock_out", null).order("clock_in", { ascending: false }).limit(1).maybeSingle();
    setOpen(oc.data || null);
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const td = await supabase.from("time_entries").select("*, sites(name)").eq("officer_id", uid).gte("clock_in", start.toISOString()).order("clock_in", { ascending: false });
    setToday(td.data || []);
  }
  useEffect(() => { load(); }, [uid]);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(t); }, []);

  async function clockIn() {
    setBusy(true);
    let lat = null, lng = null;
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 }));
      lat = pos.coords.latitude; lng = pos.coords.longitude;
    } catch { /* geo optional */ }
    await supabase.from("time_entries").insert({ officer_id: uid, site_id: siteId || null, clock_in: new Date().toISOString(), source: "clock", lat, lng });
    setBusy(false); load();
  }
  async function clockOut() {
    if (!open) return;
    setBusy(true);
    await supabase.from("time_entries").update({ clock_out: new Date().toISOString() }).eq("id", open.id);
    setBusy(false); load();
  }

  const elapsed = open ? Math.floor((Date.now() - new Date(open.clock_in)) / 1000) : 0;
  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const todayHours = today.reduce((a, e) => a + (e.clock_out ? (new Date(e.clock_out) - new Date(e.clock_in)) / 3600000 : 0), 0);

  return (
    <div>
      <Eyebrow className="!text-ice">Time clock</Eyebrow>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{open ? "On the clock" : "Clock in"}</h1>

      <Panel className="mt-4 p-6 text-center">
        {open ? (
          <>
            <div className="text-5xl font-mono font-semibold tracking-tight">{hh}:{mm}:{ss}</div>
            <div className="text-xs text-steel mt-2">Since {fmtTime(open.clock_in)}{open.site_id && today.find((t) => t.id === open.id)?.sites?.name ? ` · ${today.find((t) => t.id === open.id).sites.name}` : ""}</div>
            <Btn className="mt-5 w-full" variant="danger" onClick={clockOut} disabled={busy}>{busy ? "…" : "Clock out"}</Btn>
          </>
        ) : (
          <>
            <Clock size={36} className="text-steel mx-auto" />
            <div className="mt-4 max-w-xs mx-auto text-left">
              <Select label="Post (optional)" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                <option value="">No specific site</option>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
            <Btn className="mt-4 w-full" onClick={clockIn} disabled={busy}>{busy ? "…" : "Clock in"}</Btn>
          </>
        )}
      </Panel>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <Eyebrow>Today</Eyebrow>
          <span className="text-xs text-steel">{todayHours.toFixed(2)} h</span>
        </div>
        <div className="mt-2 space-y-2">
          {today.map((e) => (
            <Panel key={e.id} className="p-3 flex items-center justify-between">
              <div className="text-sm text-platinum">{e.sites?.name || "—"}</div>
              <div className="text-xs text-steel">{fmtTime(e.clock_in)} – {e.clock_out ? fmtTime(e.clock_out) : <span className="text-emerald-400">active</span>}</div>
            </Panel>
          ))}
          {today.length === 0 && <p className="text-sm text-steel">No entries today.</p>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- shift handoff ---------------- */
function Handoff({ uid, sites }) {
  const [list, setList] = useState([]);
  const [f, setF] = useState({ site: "", notes: "", open_items: "" });
  const [busy, setBusy] = useState(false);

  async function load() {
    const ids = sites.map((s) => s.id);
    if (!ids.length) { setList([]); return; }
    const { data } = await supabase
      .from("handoffs")
      .select("*, sites(name), from:profiles!handoffs_from_officer_fkey(full_name)")
      .in("site_id", ids)
      .order("created_at", { ascending: false })
      .limit(30);
    setList(data || []);
  }
  useEffect(() => { load(); }, [sites]);

  async function pass() {
    if (!f.site) return;
    setBusy(true);
    await supabase.from("handoffs").insert({
      site_id: f.site, from_officer: uid,
      notes: f.notes || null, open_items: f.open_items || null,
    });
    setF({ site: "", notes: "", open_items: "" }); setBusy(false); load();
  }
  async function acknowledge(id) {
    await supabase.from("handoffs").update({ acknowledged_at: new Date().toISOString(), acknowledged_by: uid }).eq("id", id);
    load();
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Panel className="p-5 h-fit">
        <Eyebrow className="!text-ice">Pass down to next shift</Eyebrow>
        <div className="mt-4 space-y-3">
          <Select label="Site" value={f.site} onChange={(e) => setF({ ...f, site: e.target.value })}>
            <option value="">Select your post…</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <div>
            <Eyebrow className="mb-1.5">Shift notes</Eyebrow>
            <textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })}
              placeholder="What the next officer should know…"
              className="w-full rounded-lg bg-panel border border-line px-3 py-2.5 text-sm text-platinum outline-none focus:border-ice placeholder:text-steel/60" />
          </div>
          <div>
            <Eyebrow className="mb-1.5">Open items / follow-ups</Eyebrow>
            <textarea rows={3} value={f.open_items} onChange={(e) => setF({ ...f, open_items: e.target.value })}
              placeholder="Gate 3 lock broken, contractor returning at 6am…"
              className="w-full rounded-lg bg-panel border border-line px-3 py-2.5 text-sm text-platinum outline-none focus:border-ice placeholder:text-steel/60" />
          </div>
          <Btn className="w-full" onClick={pass} disabled={busy || !f.site}>
            <Repeat size={14} className="inline mr-1" />Hand off to next shift
          </Btn>
        </div>
      </Panel>

      <div className="space-y-2">
        <Eyebrow>Pass-down log</Eyebrow>
        {list.map((h) => (
          <Panel key={h.id} className="p-4" style={!h.acknowledged_at ? { borderColor: "#7FB2C9" } : {}}>
            <div className="flex items-center justify-between">
              <div className="text-sm text-platinum">{h.sites?.name}</div>
              <Badge tone={h.acknowledged_at ? "on" : "ice"}>{h.acknowledged_at ? "acknowledged" : "new"}</Badge>
            </div>
            <div className="text-[11px] text-steel mt-0.5">{h.from?.full_name || "Officer"} · {fmtDate(h.created_at)} {fmtTime(h.created_at)}</div>
            {h.notes && <div className="text-xs text-steel mt-2"><span className="text-platinum">Notes: </span>{h.notes}</div>}
            {h.open_items && <div className="text-xs text-steel mt-1"><span className="text-platinum">Open: </span>{h.open_items}</div>}
            {!h.acknowledged_at && h.from_officer !== uid && (
              <Btn variant="ghost" className="mt-3 !py-1.5" onClick={() => acknowledge(h.id)}>
                <CheckCircle2 size={14} className="inline mr-1" />Acknowledge
              </Btn>
            )}
          </Panel>
        ))}
        {list.length === 0 && <p className="text-sm text-steel">No handoffs yet for your sites.</p>}
      </div>
    </div>
  );
}

/* ---------------- call-in ---------------- */
function CallIn({ uid, reqs, reload }) {
  const [f, setF] = useState({ type: "call_out", start_date: "", end_date: "", reason: "" });
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  async function submit() {
    if (!f.start_date) return;
    setBusy(true);
    await supabase.from("time_off_requests").insert({
      officer_id: uid, type: f.type, start_date: f.start_date,
      end_date: f.end_date || f.start_date, reason: f.reason || null,
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
