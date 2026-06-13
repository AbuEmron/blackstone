import React from "react";
import { MapPin, Users, ScanLine, CalendarDays, Activity as ActivityIcon, Inbox, Navigation, FileText, AlertTriangle, Send, WifiOff } from "lucide-react";
import { Panel, Eyebrow } from "../lib/ui.jsx";

const ADMIN = [
  { icon: <MapPin size={16} />, title: "Add a site", body: "Open the Sites tab, enter the site name and address, and save. Repeat for every property you cover." },
  { icon: <Users size={16} />, title: "Add your team", body: "Have each guard and client tap “Request access” on the login screen and sign up. They start as clients. In the People tab, tap “officer” next to a guard’s name to make them an officer." },
  { icon: <Users size={16} />, title: "Assign officers & clients", body: "In People, pick an officer and a site and tap Assign. To let a client see a site, link them the same way under “Give client visibility.”" },
  { icon: <ScanLine size={16} />, title: "Program the patrol route", body: "Open Checkpoints, choose the site, then physically walk to each spot on the property. At each one tap “Capture this spot” to record its GPS point, snap a reference photo, name it, and save. That’s the whole route — no QR codes, no printing." },
  { icon: <ScanLine size={16} />, title: "Set the verify radius", body: "Each checkpoint has a radius (default 40m). That’s how close an officer must get for it to auto-verify. Tighten it for small sites, widen it for large lots." },
  { icon: <CalendarDays size={16} />, title: "Schedule shifts", body: "In Schedule, pick a site, an officer (or leave it open), and start/end times. The Calendar tab shows every shift color-coded by site, filterable by officer." },
  { icon: <ActivityIcon size={16} />, title: "Review the field", body: "The Activity tab shows incidents (with photos and status you control), completed patrol rounds with GPS points and checkpoints hit, and daily reports." },
  { icon: <Inbox size={16} />, title: "Approve time off", body: "Call-in and time-off requests land in the Requests tab. Approve or deny with one tap." },
];

const OFFICER = [
  { icon: <Navigation size={16} />, title: "Run a patrol", body: "Tap Patrol, choose your post, and hit “Start round.” Your location turns on only for the round and shuts off the moment you end it." },
  { icon: <MapPin size={16} />, title: "Checkpoints verify themselves", body: "Just walk your route. Each checkpoint checks off automatically as you reach it — you’ll see how many meters away the next one is. If GPS is being stubborn, tap Verify to do it manually." },
  { icon: <WifiOff size={16} />, title: "No signal? Keep going", body: "Patrols work with zero service — the round runs and saves right on your phone, then uploads by itself the moment you’re back in coverage. You’ll see “waiting to sync” until it does." },
  { icon: <FileText size={16} />, title: "Daily report", body: "End of shift, open Daily report: note conditions, a summary, the weather, and add photos straight from your camera." },
  { icon: <AlertTriangle size={16} />, title: "Report an incident", body: "Tap Incident, pick the type and severity, write what happened, and attach photos. It routes to the supervisor instantly." },
  { icon: <Send size={16} />, title: "Request time off", body: "Use Call-in to request a day off, PTO, or call out. You’ll see the status update once the admin reviews it." },
];

export default function Help({ role = "officer" }) {
  const steps = role === "admin" ? ADMIN : OFFICER;
  return (
    <div>
      <Eyebrow className="!text-ice">Help</Eyebrow>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        {role === "admin" ? "Running Blackstone Command" : "Your field guide"}
      </h1>
      <p className="mt-1 text-sm text-steel">
        {role === "admin"
          ? "Everything you need to set up sites, your team, and patrol routes."
          : "Everything you need on shift — patrols, reports, and time off."}
      </p>

      <div className="mt-5 space-y-3">
        {steps.map((s, i) => (
          <Panel key={i} className="p-4 flex gap-4 fade-up">
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-lg grid place-items-center text-ice" style={{ background: "rgba(127,178,201,0.12)", border: "1px solid #2A2E34" }}>
                {s.icon}
              </div>
              <div className="text-[10px] font-mono text-steel mt-1">{String(i + 1).padStart(2, "0")}</div>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-platinum">{s.title}</div>
              <div className="text-sm text-steel mt-1 leading-relaxed">{s.body}</div>
            </div>
          </Panel>
        ))}
      </div>

      <p className="mt-5 text-xs text-steel">
        Prefer a video later? You can drop a screen recording link here anytime — but this guide stands on its own.
      </p>
    </div>
  );
}
