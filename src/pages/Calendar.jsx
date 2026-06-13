import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Panel, Eyebrow, Select } from "../lib/ui.jsx";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SITE_COLORS = ["#7FB2C9", "#4ADE80", "#F5A524", "#C9A77F", "#A78BFA", "#F0524A", "#5EAAC0", "#8AD1A0"];

function colorForSite(id, sites) {
  const idx = sites.findIndex((s) => s.id === id);
  return SITE_COLORS[(idx < 0 ? 0 : idx) % SITE_COLORS.length];
}

const t = (s) => new Date(s).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export default function Calendar({ shifts = [], sites = [], officers = [] }) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [siteFilter, setSiteFilter] = useState("");
  const [officerFilter, setOfficerFilter] = useState("");

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthName = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const filtered = shifts.filter((s) => {
    if (siteFilter && s.site_id !== siteFilter) return false;
    if (officerFilter && s.officer_id !== officerFilter) return false;
    return true;
  });

  const shiftsForDay = (day) =>
    filtered
      .filter((s) => {
        const dt = new Date(s.start_ts);
        return dt.getFullYear() === year && dt.getMonth() === month && dt.getDate() === day;
      })
      .sort((a, b) => new Date(a.start_ts) - new Date(b.start_ts));

  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const monthCount = filtered.filter((s) => {
    const dt = new Date(s.start_ts);
    return dt.getFullYear() === year && dt.getMonth() === month;
  }).length;

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Eyebrow className="!text-ice">Schedule calendar</Eyebrow>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{monthName}</h1>
          <div className="text-xs text-steel mt-1">{monthCount} shift{monthCount === 1 ? "" : "s"} this month</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="p-2 rounded-lg border border-line text-steel hover:text-platinum"><ChevronLeft size={16} /></button>
          <button onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="px-3 py-2 rounded-lg border border-line text-xs text-platinum hover:border-steel">Today</button>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="p-2 rounded-lg border border-line text-steel hover:text-platinum"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="mt-4 grid sm:grid-cols-2 gap-3">
        <Select label="Filter by site" value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}>
          <option value="">All sites</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select label="Filter by officer" value={officerFilter} onChange={(e) => setOfficerFilter(e.target.value)}>
          <option value="">All officers</option>
          {officers.map((o) => <option key={o.id} value={o.id}>{o.full_name || o.id.slice(0, 8)}</option>)}
        </Select>
      </div>

      <Panel className="mt-4 p-3 sm:p-4">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DOW.map((d) => (
            <div key={d} className="text-center text-[10px] font-mono uppercase tracking-widest text-steel py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => (
            <div key={i} className={`min-h-[88px] rounded-lg p-1.5 ${day ? "border border-line bg-panel2/50" : ""}`}>
              {day && (
                <>
                  <div className={`text-xs mb-1 inline-block ${isToday(day) ? "bg-platinum text-ink rounded px-1.5 font-semibold" : "text-steel"}`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {shiftsForDay(day).map((s) => {
                      const col = colorForSite(s.site_id, sites);
                      return (
                        <div key={s.id} className="rounded px-1.5 py-1 text-[10px] leading-tight overflow-hidden"
                          style={{ background: `${col}1f`, borderLeft: `2px solid ${col}` }}
                          title={`${s.sites?.name || ""} · ${t(s.start_ts)}–${t(s.end_ts)} · ${s.profiles?.full_name || "Open shift"}`}>
                          <div className="text-platinum truncate">{t(s.start_ts)} {s.sites?.name}</div>
                          <div className="text-steel truncate">{s.profiles?.full_name || "Open"}</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </Panel>

      {sites.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {sites.map((s) => (
            <span key={s.id} className="flex items-center gap-1.5 text-xs text-steel">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: colorForSite(s.id, sites) }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
