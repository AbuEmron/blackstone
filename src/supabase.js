import React from "react";
import { Shield, LogOut } from "lucide-react";
import { useAuth } from "./auth.jsx";

export const Bg = () => <div className="bg-ops" aria-hidden />;

export const Eyebrow = ({ children, className = "" }) => (
  <div className={`font-mono uppercase tracking-[0.25em] text-[10px] text-steel ${className}`}>{children}</div>
);

export const Panel = ({ children, className = "" }) => (
  <div className={`rounded-xl border border-line bg-panel/80 backdrop-blur ${className}`}>{children}</div>
);

export const Badge = ({ children, tone = "steel" }) => {
  const tones = {
    steel: "text-steel border-steel/40 bg-steel/10",
    ice: "text-ice border-ice/40 bg-ice/10",
    on: "text-emerald-400 border-emerald-400/40 bg-emerald-400/10",
    warn: "text-amber-400 border-amber-400/40 bg-amber-400/10",
    alert: "text-red-400 border-red-400/40 bg-red-400/10",
  };
  return (
    <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded border ${tones[tone]}`}>
      {children}
    </span>
  );
};

export const Btn = ({ children, variant = "solid", className = "", ...p }) => {
  const base = "px-4 py-2.5 rounded-lg text-sm font-medium tracking-wide transition disabled:opacity-40 disabled:cursor-not-allowed";
  const v = {
    solid: "bg-platinum text-ink hover:bg-white",
    ghost: "text-platinum border border-line hover:border-steel",
    danger: "bg-red-500 text-white hover:bg-red-400",
  }[variant];
  return <button className={`${base} ${v} ${className}`} {...p}>{children}</button>;
};

export const Field = ({ label, ...p }) => (
  <label className="block">
    {label && <Eyebrow className="mb-1.5">{label}</Eyebrow>}
    <input
      className="w-full rounded-lg bg-panel border border-line px-3 py-2.5 text-sm text-platinum
                 outline-none focus:border-ice placeholder:text-steel/60"
      {...p}
    />
  </label>
);

export const Select = ({ label, children, ...p }) => (
  <label className="block">
    {label && <Eyebrow className="mb-1.5">{label}</Eyebrow>}
    <select
      className="w-full rounded-lg bg-panel border border-line px-3 py-2.5 text-sm text-platinum outline-none focus:border-ice"
      {...p}
    >
      {children}
    </select>
  </label>
);

export const Stat = ({ label, value, sub, tone = "platinum" }) => {
  const colors = { platinum: "text-platinum", on: "text-emerald-400", warn: "text-amber-400", alert: "text-red-400" };
  return (
    <Panel className="p-4 fade-up">
      <Eyebrow>{label}</Eyebrow>
      <div className={`mt-2 text-3xl font-semibold tracking-tight ${colors[tone]}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-steel">{sub}</div>}
    </Panel>
  );
};

export function Shell({ title, tabs, tab, setTab, children }) {
  const { profile, signOut } = useAuth();
  return (
    <div className="relative min-h-screen">
      <Bg />
      <div className="relative z-10">
        <header className="sticky top-0 z-20 border-b border-line bg-ink/85 backdrop-blur scanline">
          <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-platinum" />
              <span className="font-semibold tracking-[0.18em] text-sm">BLACKSTONE</span>
              <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-[0.25em] text-steel ml-2">{title}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-xs text-steel">{profile?.full_name || profile?.role}</span>
              <button onClick={signOut} className="text-steel hover:text-platinum" title="Sign out">
                <LogOut size={16} />
              </button>
            </div>
          </div>
          {tabs && (
            <div className="max-w-5xl mx-auto px-5 pb-2 flex gap-1 overflow-x-auto">
              {tabs.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap flex items-center gap-1.5 transition
                    ${tab === t.id ? "bg-panel text-platinum border border-line" : "text-steel hover:text-platinum"}`}>
                  {t.icon}{t.label}
                </button>
              ))}
            </div>
          )}
        </header>
        <main className="max-w-5xl mx-auto px-5 py-7">{children}</main>
      </div>
    </div>
  );
}

export const fmtDate = (s) => s ? new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
export const fmtTime = (s) => s ? new Date(s).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";
