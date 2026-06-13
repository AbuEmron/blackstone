import React, { useEffect, useState } from "react";
import { Eye, MapPin, Clock } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../lib/auth.jsx";
import { Shell, Panel, Eyebrow, Stat, Badge, fmtDate, fmtTime } from "../lib/ui.jsx";

export default function Client() {
  const { session, profile } = useAuth();
  const uid = session?.user?.id;
  const [sites, setSites] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [officers, setOfficers] = useState([]);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const links = await supabase.from("client_sites").select("site_id, sites(name, address)").eq("client_id", uid);
      const siteRows = (links.data || []);
      setSites(siteRows.map((x) => ({ id: x.site_id, ...x.sites })));
      const ids = siteRows.map((x) => x.site_id);
      if (ids.length) {
        const sh = await supabase.from("shifts").select("*, sites(name)").in("site_id", ids).order("start_ts", { ascending: false }).limit(30);
        setShifts(sh.data || []);
        const asg = await supabase.from("assignments").select("site_id").in("site_id", ids);
        setOfficers(asg.data || []);
      }
    })();
  }, [uid]);

  const now = new Date();
  const live = shifts.filter((s) => new Date(s.start_ts) <= now && new Date(s.end_ts) >= now);
  const upcoming = shifts.filter((s) => new Date(s.start_ts) > now);

  return (
    <Shell title="Transparency">
      <div className="flex items-center justify-between">
        <div>
          <Eyebrow className="!text-ice">{profile?.full_name || "Client"} · Live</Eyebrow>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Transparency Mode</h1>
        </div>
        <Badge tone="on">● real time</Badge>
      </div>

      <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Your sites" value={sites.length} />
        <Stat label="On post now" value={live.length} tone={live.length ? "on" : "platinum"} />
        <Stat label="Upcoming shifts" value={upcoming.length} />
        <Stat label="Officers assigned" value={officers.length} />
      </div>

      <div className="mt-4 grid lg:grid-cols-2 gap-4">
        <Panel className="p-5">
          <Eyebrow>Your sites</Eyebrow>
          <div className="mt-3 space-y-2">
            {sites.map((s) => (
              <div key={s.id} className="flex items-center gap-3 border-b border-line pb-2">
                <MapPin size={15} className="text-ice" />
                <div>
                  <div className="text-sm text-platinum">{s.name}</div>
                  {s.address && <div className="text-xs text-steel">{s.address}</div>}
                </div>
              </div>
            ))}
            {sites.length === 0 && <p className="text-sm text-steel">No sites linked to your account yet.</p>}
          </div>
        </Panel>

        <Panel className="p-5">
          <Eyebrow>Coverage</Eyebrow>
          <div className="mt-3 space-y-2">
            {shifts.slice(0, 8).map((s) => {
              const ongoing = new Date(s.start_ts) <= now && new Date(s.end_ts) >= now;
              return (
                <div key={s.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-steel" />
                    <span className="text-sm text-platinum">{s.sites?.name}</span>
                  </div>
                  <div className="text-xs text-steel">
                    {fmtDate(s.start_ts)} {fmtTime(s.start_ts)}–{fmtTime(s.end_ts)}
                    {ongoing && <span className="ml-2"><Badge tone="on">on post</Badge></span>}
                  </div>
                </div>
              );
            })}
            {shifts.length === 0 && <p className="text-sm text-steel">No coverage recorded yet.</p>}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-ice">
            <Eye size={13} /> You see exactly what we see — nothing hidden.
          </div>
        </Panel>
      </div>
    </Shell>
  );
}
