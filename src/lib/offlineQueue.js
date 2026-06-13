import { supabase } from "./supabase.js";

const KEY = "bs_offline_queue";

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(q) {
  try { localStorage.setItem(KEY, JSON.stringify(q)); } catch {}
}

export function queueCount() {
  return read().length;
}

// add an operation to the local queue
export function enqueue(op) {
  const q = read();
  q.push({ ...op, _id: crypto.randomUUID(), queued_at: Date.now() });
  write(q);
}

// persist a single operation to Supabase
async function persist(op) {
  if (op.kind === "round") {
    const { data, error } = await supabase.from("rounds").insert({
      officer_id: op.officer_id,
      site_id: op.site_id,
      started_at: op.started_at,
      ended_at: op.ended_at,
      status: "completed",
      route: op.route || [],
      notes: op.notes || null,
    }).select().single();
    if (error) throw error;
    if (op.scans && op.scans.length) {
      const rows = op.scans.map((s) => ({
        round_id: data.id,
        checkpoint_id: s.checkpoint_id || null,
        label: s.label,
        scanned_at: s.scanned_at,
        lat: s.lat ?? null,
        lng: s.lng ?? null,
      }));
      const { error: e2 } = await supabase.from("round_scans").insert(rows);
      if (e2) throw e2;
    }
    return;
  }
  if (op.kind === "daily_report") {
    const { error } = await supabase.from("daily_reports").insert(op.payload);
    if (error) throw error;
    return;
  }
  if (op.kind === "incident") {
    const { error } = await supabase.from("incidents").insert(op.payload);
    if (error) throw error;
    return;
  }
}

// try to send everything in the queue; keep whatever fails
export async function flush() {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  let q = read();
  if (q.length === 0) return;
  const remaining = [];
  for (const op of q) {
    try { await persist(op); }
    catch { remaining.push(op); }
  }
  write(remaining);
  return q.length - remaining.length; // number synced
}

// save now if online, otherwise queue for later
export async function saveOrQueue(op) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    enqueue(op);
    return { synced: false };
  }
  try {
    await persist(op);
    return { synced: true };
  } catch {
    enqueue(op);
    return { synced: false };
  }
}

// auto-flush when connectivity returns
if (typeof window !== "undefined") {
  window.addEventListener("online", () => { flush(); });
}
