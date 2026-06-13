import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "../lib/auth.jsx";
import { Bg, Eyebrow, Panel, Btn, Field } from "../lib/ui.jsx";

export default function Login() {
  const { session, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState("in"); // in | up
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!loading && session) return <Navigate to="/" replace />;

  async function submit() {
    setBusy(true); setMsg(null);
    try {
      if (mode === "in") {
        const { error } = await signIn(email.trim(), pw);
        if (error) setMsg({ t: "err", m: error.message });
      } else {
        const { error } = await signUp(email.trim(), pw, name.trim());
        if (error) setMsg({ t: "err", m: error.message });
        else setMsg({ t: "ok", m: "Account created. Your access is set by the administrator — check your email if confirmation is on, then sign in." });
      }
    } finally { setBusy(false); }
  }

  return (
    <div className="relative min-h-screen grid place-items-center px-5">
      <Bg />
      <div className="relative z-10 w-full max-w-sm fade-up">
        <div className="text-center mb-7">
          <Shield size={30} className="text-platinum mx-auto" />
          <h1 className="mt-3 text-2xl font-semibold tracking-[0.18em]">BLACKSTONE</h1>
          <Eyebrow className="mt-1 !text-steel">Protection · Accountability · Excellence</Eyebrow>
        </div>

        <Panel className="p-5 scanline">
          <div className="flex gap-1 mb-5 p-1 rounded-lg border border-line bg-ink/50">
            {[["in", "Sign in"], ["up", "Request access"]].map(([k, l]) => (
              <button key={k} onClick={() => { setMode(k); setMsg(null); }}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium ${mode === k ? "bg-platinum text-ink" : "text-steel"}`}>
                {l}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {mode === "up" && <Field label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Reyes" />}
            <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            <Field label="Password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••"
              onKeyDown={(e) => e.key === "Enter" && submit()} />
          </div>

          {msg && (
            <div className={`mt-4 text-xs rounded-lg px-3 py-2 border ${msg.t === "err" ? "text-red-300 border-red-400/40 bg-red-400/10" : "text-emerald-300 border-emerald-400/40 bg-emerald-400/10"}`}>
              {msg.m}
            </div>
          )}

          <Btn className="w-full mt-5" onClick={submit} disabled={busy || !email || !pw || (mode === "up" && !name)}>
            {busy ? "…" : mode === "in" ? "Enter command center" : "Request access"}
          </Btn>
        </Panel>

        <p className="mt-4 text-center text-[11px] text-steel">
          Access is invite-controlled. New accounts start as client and are assigned by the administrator.
        </p>
      </div>
    </div>
  );
}
