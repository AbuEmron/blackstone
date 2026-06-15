import React, { useEffect, useMemo, useState } from "react";
import { Download, FileText, Plus, X, DollarSign, Clock } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { Panel, Eyebrow, Btn, Field, Select, Stat, Badge, fmtDate, fmtTime } from "../lib/ui.jsx";
import { downloadCsv, payrollPdf } from "../lib/reportExport.js";

const OT_THRESHOLD = 40;     // hours/week before overtime
const OT_MULT = 1.5;

function hoursOf(e) {
  if (!e.clock_out) return 0;
  const ms = new Date(e.clock_out) - new Date(e.clock_in);
  return Math.max(0, ms / 3600000 - (e.break_minutes || 0) / 60);
}
function weekKey(d) {
  const dt = new Date(d);
  const day = (dt.getDay() + 6) % 7; // Monday = 0
  dt.setDate(dt.getDate() - day); dt.setHours(0, 0, 0, 0);
  return dt.toISOString().slice(0, 10);
}
function compute(entries, rate) {
  const byWeek = {};
  entries.forEach((e) => { const k = weekKey(e.clock_in); byWeek[k] = (byWeek[k] || 0) + hoursOf(e); });
  let reg = 0, ot = 0;
  Object.values(byWeek).forEach((h) => { reg += Math.min(h, OT_THRESHOLD); ot += Math.max(0, h - OT_THRESHOLD); });
  const r = Number(rate) || 0;
  return { reg, ot, total: reg + ot, gross: reg * r + ot * r * OT_MULT };
}
const iso = (d) => d.toISOString();

export default function Payroll() {
  const [view, setView] = useState("run");
  const [officers, setOfficers] = useState([]);
  const [sites, setSites] = useState([]);
  const [entries, setEntries] = useState([]);
  const [range, setRange] = useState(() => {
    const now = new Date();
    const day = (now.getDay() + 6) % 7;
    const start = new Date(now); start.setDate(now.getDate() - day); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  });

  async function loadStatic() {
    const [o, s] = await Promise.all([
      supabase.from("profiles").select("id, full_name, pay_rate").eq("role", "officer").order("full_name"),
      supabase.from("sites").select("id, name").order("name"),
    ]);
    setOfficers(o.data || []); setSites(s.data || []);
  }
  async function loadEntries() {
    const startISO = new Date(range.start + "T00:00:00").toISOString();
    const endISO = new Date(range.end + "T23:59:59").toISOString();
    const { data } = await supabase.from("time_entries")
      .select("*, profiles(full_name), sites(name)")
      .gte("clock_in", startISO).lte("clock_in", endISO)
      .order("clock_in", { ascending: false });
    setEntries(data || []);
  }
  useEffect(() => { loadStatic(); }, []);
  useEffect(() => { loadEntries(); }, [range.start, range.end]);

  function preset(kind) {
    const now = new Date();
    if (kind === "thisWeek" || kind === "lastWeek") {
      const day = (now.getDay() + 6) % 7;
      const monday = new Date(now); monday.setDate(now.getDate() - day);
      if (kind === "lastWeek") monday.setDate(monday.getDate() - 7);
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
      setRange({ start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) });
    } else if (kind === "thisMonth") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setRange({ start: first.toISOString().slice(0, 10), end: last.toISOString().slice(0, 10) });
    }
  }

  const rows = useMemo(() => officers.map((o) => {
    const mine = entries.filter((e) => e.officer_id === o.id);
    const c = compute(mine, o.pay_rate);
    return { id: o.id, name: o.full_name || "—", rate: o.pay_rate, ...c };
  }), [officers, entries]);

  const totals = rows.reduce((a, r) => ({ hours: a.hours + r.total, gross: a.gross + r.gross }), { hours: 0, gross: 0 });

  async function setRate(id, val) {
    const v = val === "" ? null : Number(val);
    await supabase.from("profiles").update({ pay_rate: v }).eq("id", id);
    setOfficers((os) => os.map((o) => (o.id === id ? { ...o, pay_rate: v } : o)));
  }

  function exportCsv() {
    const data = [["Officer", "Regular hours", "OT hours", "Total hours", "Rate", "Gross pay"]];
    rows.forEach((r) => data.push([r.name, r.reg.toFixed(2), r.ot.toFixed(2), r.total.toFixed(2), r.rate ?? "", r.gross.toFixed(2)]));
    data.push(["TOTALS", "", "", totals.hours.toFixed(2), "", totals.gross.toFixed(2)]);
    downloadCsv(`Blackstone-Payroll-${range.start}_to_${range.end}.csv`, data);
  }
  function exportPdf() {
    payrollPdf({ period: `${range.start} to ${range.end}` }, rows, totals);
  }

  return (
    <div>
      <Eyebrow className="!text-ice">Payroll</Eyebrow>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Pay run</h1>

      <div className="mt-4 flex gap-1">
        {[["run", "Pay run"], ["timesheets", "Timesheets"]].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)}
            className={`px-3 py-1.5 rounded-lg text-xs ${view === id ? "bg-panel text-platinum border border-line" : "text-steel"}`}>{label}</button>
        ))}
      </div>

      {view === "run" && (
        <>
          <Panel className="mt-4 p-5">
            <Eyebrow>Pay period</Eyebrow>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn variant="ghost" className="!py-1.5 !px-3 !text-xs" onClick={() => preset("thisWeek")}>This week</Btn>
              <Btn variant="ghost" className="!py-1.5 !px-3 !text-xs" onClick={() => preset("lastWeek")}>Last week</Btn>
              <Btn variant="ghost" className="!py-1.5 !px-3 !text-xs" onClick={() => preset("thisMonth")}>This month</Btn>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="From" type="date" value={range.start} onChange={(e) => setRange({ ...range, start: e.target.value })} />
              <Field label="To" type="date" value={range.end} onChange={(e) => setRange({ ...range, end: e.target.value })} />
            </div>
          </Panel>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="Total hours" value={totals.hours.toFixed(1)} />
            <Stat label="Total gross" value={`$${totals.gross.toFixed(2)}`} tone="on" />
          </div>

          <Panel className="mt-4 p-0 overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-steel border-b border-line">
              <div className="col-span-4">Officer</div>
              <div className="col-span-2 text-right">Reg</div>
              <div className="col-span-2 text-right">OT</div>
              <div className="col-span-2 text-right">Rate $/hr</div>
              <div className="col-span-2 text-right">Gross</div>
            </div>
            {rows.map((r) => (
              <div key={r.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-line text-sm">
                <div className="col-span-4 text-platinum truncate">{r.name}</div>
                <div className="col-span-2 text-right text-steel">{r.reg.toFixed(1)}</div>
                <div className="col-span-2 text-right text-amber-400">{r.ot.toFixed(1)}</div>
                <div className="col-span-2">
                  <input type="number" defaultValue={r.rate ?? ""} placeholder="—"
                    onBlur={(e) => setRate(r.id, e.target.value)}
                    className="w-full text-right rounded bg-panel border border-line px-2 py-1 text-platinum outline-none focus:border-ice" />
                </div>
                <div className="col-span-2 text-right text-platinum font-medium">${r.gross.toFixed(2)}</div>
              </div>
            ))}
            {rows.length === 0 && <div className="px-4 py-6 text-sm text-steel">No officers yet.</div>}
          </Panel>

          <div className="mt-4 flex gap-2">
            <Btn onClick={exportPdf}><FileText size={14} className="inline mr-1" />Export PDF</Btn>
            <Btn variant="ghost" onClick={exportCsv}><Download size={14} className="inline mr-1" />Export CSV</Btn>
          </div>
          <p className="mt-3 text-xs text-steel">Overtime is 1.5× after {OT_THRESHOLD} hrs/week. Gross pay only — hand the export to your payroll provider for taxes and payment.</p>
        </>
      )}

      {view === "timesheets" && <Timesheets officers={officers} sites={sites} entries={entries} reload={loadEntries} />}
    </div>
  );
}

/* ---------------- timesheets ---------------- */
function Timesheets({ officers, sites, entries, reload }) {
  const [f, setF] = useState({ officer: "", site: "", clock_in: "", clock_out: "", break_minutes: 0 });

  async function add() {
    if (!f.officer || !f.clock_in) return;
    await supabase.from("time_entries").insert({
      officer_id: f.officer, site_id: f.site || null,
      clock_in: new Date(f.clock_in).toISOString(),
      clock_out: f.clock_out ? new Date(f.clock_out).toISOString() : null,
      break_minutes: Number(f.break_minutes) || 0, source: "manual",
    });
    setF({ officer: "", site: "", clock_in: "", clock_out: "", break_minutes: 0 }); reload();
  }
  async function del(id) { await supabase.from("time_entries").delete().eq("id", id); reload(); }

  return (
    <div className="grid lg:grid-cols-2 gap-4 mt-4">
      <Panel className="p-5 h-fit">
        <Eyebrow className="!text-ice">Add / correct a time entry</Eyebrow>
        <div className="mt-4 space-y-3">
          <Select label="Officer" value={f.officer} onChange={(e) => setF({ ...f, officer: e.target.value })}>
            <option value="">Select…</option>
            {officers.map((o) => <option key={o.id} value={o.id}>{o.full_name || o.id.slice(0, 8)}</option>)}
          </Select>
          <Select label="Site (optional)" value={f.site} onChange={(e) => setF({ ...f, site: e.target.value })}>
            <option value="">—</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Field label="Clock in" type="datetime-local" value={f.clock_in} onChange={(e) => setF({ ...f, clock_in: e.target.value })} />
          <Field label="Clock out" type="datetime-local" value={f.clock_out} onChange={(e) => setF({ ...f, clock_out: e.target.value })} />
          <Field label="Break (minutes)" type="number" value={f.break_minutes} onChange={(e) => setF({ ...f, break_minutes: e.target.value })} />
          <Btn className="w-full" onClick={add} disabled={!f.officer || !f.clock_in}><Plus size={14} className="inline mr-1" />Add entry</Btn>
        </div>
      </Panel>
      <div className="space-y-2">
        <Eyebrow>Entries in period</Eyebrow>
        {entries.map((e) => (
          <Panel key={e.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-platinum">{e.profiles?.full_name || "Officer"} {e.sites?.name ? `· ${e.sites.name}` : ""}</div>
              <div className="text-xs text-steel">
                {fmtDate(e.clock_in)} {fmtTime(e.clock_in)} – {e.clock_out ? fmtTime(e.clock_out) : "open"} · {hoursOf(e).toFixed(2)}h
                {e.source === "manual" && <span className="ml-1 text-[10px] font-mono">(manual)</span>}
              </div>
            </div>
            <button onClick={() => del(e.id)} className="text-steel hover:text-red-400"><X size={15} /></button>
          </Panel>
        ))}
        {entries.length === 0 && <p className="text-sm text-steel">No time entries in this period.</p>}
      </div>
    </div>
  );
}
