import React, { useEffect, useRef, useState } from "react";
import { Navigation, ShieldCheck, Wifi, WifiOff, CheckCircle2, Circle, XCircle, Satellite, MapPin, CloudUpload } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../lib/auth.jsx";
import { saveOrQueue, flush, queueCount } from "../lib/offlineQueue.js";
import { Panel, Eyebrow, Btn, Badge, Select } from "../lib/ui.jsx";

// distance in meters between two {lat,lng}
function distM(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const R = 6371000, toR = (x) => (x * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

export default function Patrol() {
  const { session } = useAuth();
  const uid = session?.user?.id;
  const [sites, setSites] = useState([]);
  const [siteId, setSiteId] = useState("");
  const [checkpoints, setCheckpoints] = useState([]);
  const [phase, setPhase] = useState("ready");
  const [scans, setScans] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [pos, setPos] = useState(null);
  const [gpsErr, setGpsErr] = useState(null);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pending, setPending] = useState(queueCount());
  const [result, setResult] = useState(null);

  const watchId = useRef(null);
  const routeRef = useRef([]);
  const scansRef = useRef([]);
  const cpRef = useRef([]);
  const startedAt = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const on = () => { setOnline(true); flush().then(() => setPending(queueCount())); };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    flush().then(() => setPending(queueCount()));
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    if (!uid) return;
    supabase.from("assignments").select("site_id, sites(name)").eq("officer_id", uid)
      .then(({ data }) => setSites((data || []).map((x) => ({ id: x.site_id, name: x.sites?.name })).filter((s) => s.name)));
  }, [uid]);

  useEffect(() => {
    if (!siteId) { setCheckpoints([]); cpRef.current = []; return; }
    supabase.from("checkpoints").select("*").eq("site_id", siteId).order("created_at")
      .then(({ data }) => { setCheckpoints(data || []); cpRef.current = data || []; });
  }, [siteId]);

  useEffect(() => () => { stopGps(); clearInterval(timerRef.current); }, []);

  function autoVerify(current) {
    cpRef.current.forEach((c) => {
      if (c.lat == null) return;
      if (scansRef.current.some((s) => s.checkpoint_id === c.id)) return;
      const d = distM(current, c);
      if (d != null && d <= (c.radius_m || 40)) addScan(c, current, true);
    });
  }

  function addScan(c, current, auto) {
    if (scansRef.current.some((s) => s.checkpoint_id === c.id)) return;
    const scan = {
      checkpoint_id: c.id, label: c.label,
      scanned_at: new Date().toISOString(),
      lat: current?.lat ?? null, lng: current?.lng ?? null, auto: !!auto,
    };
    scansRef.current = [...scansRef.current, scan];
    setScans(scansRef.current);
  }

  function startGps() {
    setGpsErr(null);
    if (!navigator.geolocation) { setGpsErr("This device has no GPS."); return; }
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        const cur = { lat: p.coords.latitude, lng: p.coords.longitude, t: Date.now() };
        setPos(cur);
        routeRef.current.push(cur);
        autoVerify(cur);
      },
      (err) => setGpsErr((err && err.message) || "Location unavailable. The round still runs; verify checkpoints manually."),
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 20000 }
    );
  }
  function stopGps() {
    if (watchId.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current); watchId.current = null;
    }
  }

  function startRound() {
    if (!siteId) return;
    routeRef.current = []; scansRef.current = [];
    setScans([]); setElapsed(0); setResult(null);
    startedAt.current = new Date().toISOString();
    setPhase("active");
    startGps();
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }

  async function endRound() {
    stopGps(); clearInterval(timerRef.current);
    const op = {
      kind: "round", officer_id: uid, site_id: siteId,
      started_at: startedAt.current, ended_at: new Date().toISOString(),
      route: routeRef.current, scans: scansRef.current,
    };
    const r = await saveOrQueue(op);
    setPending(queueCount());
    setResult(r);
    setPhase("done");
  }

  const gpsOn = phase === "active";
  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const missed = checkpoints.filter((c) => !scans.some((s) => s.checkpoint_id === c.id));
  const next = checkpoints.find((c) => !scans.some((s) => s.checkpoint_id === c.id));

  if (sites.length === 0) {
    return <p className="text-sm text-steel">You aren't assigned to a site yet. Ask your administrator to assign you in the People tab.</p>;
  }

  return (
    <div>
      {/* connectivity + sync line */}
      <div className="flex items-center justify-between text-xs mb-3">
        <span className={`flex items-center gap-1.5 ${online ? "text-emerald-400" : "text-amber-400"}`}>
          {online ? <Wifi size={13} /> : <WifiOff size={13} />} {online ? "Online" : "Offline — rounds save on the device"}
        </span>
        {pending > 0 && (
          <button onClick={() => flush().then(() => setPending(queueCount()))} className="flex items-center gap-1 text-steel hover:text-platinum">
            <CloudUpload size={13} /> {pending} waiting to sync
          </button>
        )}
      </div>

      {/* GPS honesty banner */}
      <div className="rounded-xl p-3 flex items-center gap-3 text-sm"
        style={{ background: gpsOn ? "rgba(74,222,128,0.12)" : "#141619", border: `1px solid ${gpsOn ? "#4ADE80" : "#2A2E34"}` }}>
        {gpsOn ? <Satellite size={16} className="text-emerald-400" /> : <Satellite size={16} className="text-steel" />}
        <span style={{ color: gpsOn ? "#4ADE80" : "#8A929E" }}>
          {gpsOn ? "Location is ACTIVE for this patrol round only." : "Location is OFF. It runs only while a round is active — never otherwise."}
        </span>
      </div>

      {phase === "ready" && (
        <div className="mt-5">
          <Eyebrow className="!text-ice">Guard tour</Eyebrow>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Start a patrol round</h1>
          <Panel className="mt-4 p-5">
            <Select label="Site" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              <option value="">Select your post…</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            {siteId && (
              <div className="mt-4">
                <Eyebrow>{checkpoints.length} checkpoint{checkpoints.length === 1 ? "" : "s"} on this route</Eyebrow>
                <div className="mt-2 space-y-2">
                  {checkpoints.map((c) => (
                    <div key={c.id} className="flex items-center gap-3">
                      {c.photo_url
                        ? <img src={c.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-line" />
                        : <div className="w-10 h-10 rounded-lg border border-line grid place-items-center text-steel"><MapPin size={15} /></div>}
                      <div className="text-sm text-platinum">{c.label}
                        <span className="text-[10px] font-mono text-steel ml-2">{c.lat != null ? "GPS set" : "no coords"}</span>
                      </div>
                    </div>
                  ))}
                  {checkpoints.length === 0 && <p className="text-xs text-steel">No checkpoints yet — admin can add them in Checkpoints. You can still run a GPS-tracked round.</p>}
                </div>
              </div>
            )}
            <Btn className="w-full mt-5" onClick={startRound} disabled={!siteId}>
              <Navigation size={16} className="inline mr-1" /> Start round — enable GPS
            </Btn>
          </Panel>
        </div>
      )}

      {phase === "active" && (
        <div className="mt-5">
          <div className="flex items-end justify-between">
            <div>
              <Eyebrow className="!text-ice">Round in progress</Eyebrow>
              <div className="mt-2 text-5xl font-mono font-semibold tracking-tight">{mmss}</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-semibold">{scans.length}<span className="text-steel">/{checkpoints.length}</span></div>
              <div className="text-xs text-steel flex items-center gap-1 justify-end"><Satellite size={11} /> {routeRef.current.length} pts</div>
            </div>
          </div>

          {gpsErr && <div className="mt-3 text-xs text-amber-300 border border-amber-400/40 bg-amber-400/10 rounded-lg px-3 py-2">{gpsErr}</div>}

          <div className="mt-5 space-y-2">
            {checkpoints.map((c) => {
              const done = scans.some((s) => s.checkpoint_id === c.id);
              const isNext = next?.id === c.id;
              const d = distM(pos, c);
              const inRange = d != null && d <= (c.radius_m || 40);
              return (
                <Panel key={c.id} className="p-4 flex items-center justify-between" style={isNext ? { borderColor: "#7FB2C9" } : {}}>
                  <div className="flex items-center gap-3">
                    {done ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Circle size={18} className={isNext ? "text-ice" : "text-steel"} />}
                    <div>
                      <div className="text-sm font-medium text-platinum">{c.label}</div>
                      <div className="text-[11px] font-mono text-steel">
                        {done ? "verified" : d != null ? `${d} m away${inRange ? " · in range" : ""}` : "locating…"}
                      </div>
                    </div>
                  </div>
                  {done ? <Badge tone="on">verified</Badge> : (
                    <Btn variant="ghost" className="!py-1.5 !px-3" onClick={() => addScan(c, pos, false)}>Verify</Btn>
                  )}
                </Panel>
              );
            })}
          </div>

          <Btn variant="ghost" className="w-full mt-5" onClick={endRound}>End round — stop GPS</Btn>
        </div>
      )}

      {phase === "done" && (
        <Panel className="mt-5 p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-400" />
            <span className="font-medium text-platinum">Round complete · GPS stopped</span>
          </div>
          <div className="mt-3 text-sm text-steel">
            Duration {mmss} · {scans.length} verified · {routeRef.current.length} GPS points
            {missed.length > 0 && <span className="text-red-400"> · {missed.length} missed (flagged)</span>}
          </div>
          <div className="mt-2 text-xs">
            {result?.synced
              ? <span className="text-emerald-400">Saved to the server.</span>
              : <span className="text-amber-400">No connection — saved on this device and will upload automatically when you're back online.</span>}
          </div>
          {missed.length > 0 && (
            <div className="mt-3 space-y-1">
              {missed.map((c) => <div key={c.id} className="text-xs text-red-300 flex items-center gap-2"><XCircle size={13} /> {c.label}</div>)}
            </div>
          )}
          <Btn className="mt-4" onClick={() => { setPhase("ready"); setSiteId(""); }}>Start another round</Btn>
        </Panel>
      )}
    </div>
  );
}
