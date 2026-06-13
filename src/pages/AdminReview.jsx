import React, { useEffect, useState } from "react";
import { Plus, X, Navigation, FileText, AlertTriangle, MapPin, Satellite } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { Panel, Eyebrow, Btn, Field, Select, Badge, fmtDate, fmtTime } from "../lib/ui.jsx";

/* ---------------- checkpoint capture (walk the site) ---------------- */
export function Checkpoints({ sites }) {
  const [siteId, setSiteId] = useState("");
  const [list, setList] = useState([]);
  const [label, setLabel] = useState("");
  const [radius, setRadius] = useState(40);
  const [coords, setCoords] = useState(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [locating, setLocating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState(null);

  async function load() {
    if (!siteId) { setList([]); return; }
    const { data } = await supabase.from("checkpoints").select("*").eq("site_id", siteId).order("created_at");
    setList(data || []);
  }
  useEffect(() => { load(); }, [siteId]);

  function capture() {
    setErr(null);
    if (!navigator.geolocation) { setErr("This device has no GPS."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }); setLocating(false); },
      (e) => { setErr((e && e.message) || "Couldn't get a location fix. Step outside or try again."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }

  async function onPhoto(e) {
    const file = (e.target.files || [])[0];
    if (!file) return;
    setUploading(true);
    const clean = file.name.replace(/[^a-zA-Z0-9._-]/g, "");
    const path = `checkpoint-${crypto.randomUUID()}-${clean}`;
    const { error } = await supabase.storage.from("evidence").upload(path, file);
    if (!error) { const { data } = supabase.storage.from("evidence").getPublicUrl(path); setPhotoUrl(data.publicUrl); }
    setUploading(false); e.target.value = "";
  }

  async function add() {
    if (!siteId || !label || !coords) return;
    await supabase.from("checkpoints").insert({
      site_id: siteId, label, lat: coords.lat, lng: coords.lng,
      radius_m: Number(radius) || 40, photo_url: photoUrl || null, method: "GPS",
    });
    setLabel(""); setCoords(null); setPhotoUrl(""); setRadius(40); load();
  }
  async function del(id) { await supabase.from("checkpoints").delete().eq("id", id); load(); }

  return (
    <div>
      <Eyebrow className="!text-ice">Checkpoints</Eyebrow>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Walk the site</h1>
      <p className="mt-1 text-sm text-steel">Stand at each spot on the property, capture its GPS point and a reference photo. Officers' rounds auto-verify when they reach it.</p>
      <Panel className="mt-4 p-5">
        <Select label="Site" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
          <option value="">Select a site…</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>

        {siteId && (
          <div className="mt-4 space-y-3">
            <Field label="Checkpoint name" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="North Gate" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Eyebrow className="mb-1.5">GPS point</Eyebrow>
                <Btn variant="ghost" className="w-full" onClick={capture} disabled={locating}>
                  <MapPin size={14} className="inline mr-1" />{locating ? "Locating…" : coords ? "Re-capture" : "Capture this spot"}
                </Btn>
                {coords && <div className="text-[11px] font-mono text-emerald-400 mt-1.5">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} · ±{coords.acc}m</div>}
              </div>
              <Field label="Verify radius (m)" type="number" value={radius} onChange={(e) => setRadius(e.target.value)} />
            </div>

            <div>
              <Eyebrow className="mb-1.5">Reference photo (optional)</Eyebrow>
              <label className="flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-line text-steel cursor-pointer hover:border-steel text-sm">
                {uploading ? "Uploading…" : photoUrl ? "Replace photo" : "Add photo"}
                <input type="file" accept="image/*" className="hidden" onChange={onPhoto} disabled={uploading} />
              </label>
              {photoUrl && <img src={photoUrl} alt="" className="mt-2 w-20 h-20 object-cover rounded-lg border border-line" />}
            </div>

            {err && <div className="text-xs text-amber-300 border border-amber-400/40 bg-amber-400/10 rounded-lg px-3 py-2">{err}</div>}
            <Btn className="w-full" onClick={add} disabled={!label || !coords}><Plus size={15} className="inline mr-1" />Save checkpoint</Btn>

            <div className="mt-2 space-y-2">
              {list.map((c) => (
                <div key={c.id} className="flex items-center justify-between border-b border-line pb-2">
                  <div className="flex items-center gap-3">
                    {c.photo_url
                      ? <img src={c.photo_url} alt="" className="w-9 h-9 rounded object-cover border border-line" />
                      : <div className="w-9 h-9 rounded border border-line grid place-items-center text-steel"><MapPin size={13} /></div>}
                    <div>
                      <div className="text-sm text-platinum">{c.label}</div>
                      <div className="text-[10px] font-mono text-steel">{c.lat != null ? `${c.lat.toFixed(4)}, ${c.lng.toFixed(4)} · ${c.radius_m}m` : "no GPS"}</div>
                    </div>
                  </div>
                  <button onClick={() => del(c.id)} className="text-steel hover:text-red-400"><X size={14} /></button>
                </div>
              ))}
              {list.length === 0 && <p className="text-sm text-steel">No checkpoints captured yet for this site.</p>}
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ---------------- activity review ---------------- */
export function Activity() {
  const [rounds, setRounds] = useState([]);
  const [scanCounts, setScanCounts] = useState({});
  const [reports, setReports] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [view, setView] = useState("incidents");

  async function load() {
    const [rd, sc, dr, inc] = await Promise.all([
      supabase.from("rounds").select("*, sites(name), profiles(full_name)").order("started_at", { ascending: false }).limit(100),
      supabase.from("round_scans").select("round_id"),
      supabase.from("daily_reports").select("*, sites(name), profiles(full_name)").order("created_at", { ascending: false }).limit(100),
      supabase.from("incidents").select("*, sites(name), profiles(full_name)").order("created_at", { ascending: false }).limit(100),
    ]);
    setRounds(rd.data || []);
    const counts = {};
    (sc.data || []).forEach((s) => { counts[s.round_id] = (counts[s.round_id] || 0) + 1; });
    setScanCounts(counts);
    setReports(dr.data || []);
    setIncidents(inc.data || []);
  }
  useEffect(() => { load(); }, []);

  async function setIncidentStatus(id, status) {
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("incidents").update({ status, reviewer_id: u?.user?.id }).eq("id", id);
    load();
  }

  const dur = (a, b) => {
    if (!b) return "—";
    const ms = new Date(b) - new Date(a);
    const m = Math.round(ms / 60000);
    return `${m}m`;
  };
  const sevTone = { Low: "steel", Medium: "warn", High: "alert" };
  const incTone = { open: "warn", reviewing: "ice", resolved: "on" };

  const sub = [
    { id: "incidents", label: "Incidents", icon: <AlertTriangle size={13} /> },
    { id: "rounds", label: "Patrol rounds", icon: <Navigation size={13} /> },
    { id: "reports", label: "Daily reports", icon: <FileText size={13} /> },
  ];

  return (
    <div>
      <Eyebrow className="!text-ice">Activity</Eyebrow>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Field activity review</h1>

      <div className="mt-4 flex gap-1">
        {sub.map((s) => (
          <button key={s.id} onClick={() => setView(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 ${view === s.id ? "bg-panel text-platinum border border-line" : "text-steel"}`}>
            {s.icon}{s.label}
          </button>
        ))}
      </div>

      {view === "incidents" && (
        <div className="mt-4 space-y-2">
          {incidents.map((r) => (
            <Panel key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-platinum font-medium">{r.type} · {r.sites?.name}</div>
                  <div className="text-xs text-steel mt-0.5">{r.profiles?.full_name || "Officer"} · {fmtDate(r.created_at)} {fmtTime(r.created_at)}</div>
                  {r.narrative && <div className="text-xs text-steel/90 mt-2">{r.narrative}</div>}
                  {r.photo_urls?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {r.photo_urls.map((u, i) => <a key={i} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" className="w-14 h-14 object-cover rounded-lg border border-line" /></a>)}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge tone={sevTone[r.severity]}>{r.severity}</Badge>
                  <Badge tone={incTone[r.status]}>{r.status}</Badge>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {["open", "reviewing", "resolved"].map((st) => (
                  <button key={st} onClick={() => setIncidentStatus(r.id, st)}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider border ${r.status === st ? "bg-platinum text-ink border-platinum" : "text-steel border-line"}`}>
                    {st}
                  </button>
                ))}
              </div>
            </Panel>
          ))}
          {incidents.length === 0 && <p className="text-sm text-steel">No incidents reported.</p>}
        </div>
      )}

      {view === "rounds" && (
        <div className="mt-4 space-y-2">
          {rounds.map((r) => (
            <Panel key={r.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-platinum">{r.sites?.name} · {r.profiles?.full_name || "Officer"}</div>
                <div className="text-xs text-steel mt-0.5">
                  {fmtDate(r.started_at)} {fmtTime(r.started_at)} · {dur(r.started_at, r.ended_at)} ·
                  {" "}{scanCounts[r.id] || 0} checkpoints · <span className="inline-flex items-center gap-1"><Satellite size={10} />{r.route?.length || 0} pts</span>
                </div>
              </div>
              <Badge tone={r.status === "completed" ? "on" : "ice"}>{r.status}</Badge>
            </Panel>
          ))}
          {rounds.length === 0 && <p className="text-sm text-steel">No patrol rounds yet.</p>}
        </div>
      )}

      {view === "reports" && (
        <div className="mt-4 space-y-2">
          {reports.map((r) => (
            <Panel key={r.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-platinum font-medium">{r.sites?.name}</div>
                <div className="text-xs text-steel">{fmtDate(r.report_date)} · {r.profiles?.full_name || "Officer"}</div>
              </div>
              {r.conditions && <div className="text-xs text-steel mt-2"><span className="text-platinum">Conditions: </span>{r.conditions}</div>}
              {r.summary && <div className="text-xs text-steel mt-1"><span className="text-platinum">Summary: </span>{r.summary}</div>}
              {r.weather && <div className="text-xs text-steel mt-1"><span className="text-platinum">Weather: </span>{r.weather}</div>}
              {r.photo_urls?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.photo_urls.map((u, i) => <a key={i} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" className="w-14 h-14 object-cover rounded-lg border border-line" /></a>)}
                </div>
              )}
            </Panel>
          ))}
          {reports.length === 0 && <p className="text-sm text-steel">No daily reports yet.</p>}
        </div>
      )}
    </div>
  );
}
