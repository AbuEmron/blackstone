@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root { height: 100%; }
body {
  margin: 0;
  background: #0B0C0E;
  color: #D6DAE0;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* animated tactical background */
.bg-ops {
  position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none;
}
.bg-ops::before {
  content: ""; position: absolute; inset: -40%;
  background:
    radial-gradient(40% 35% at 20% 15%, rgba(127,178,201,0.10), transparent 60%),
    radial-gradient(35% 30% at 85% 80%, rgba(214,218,224,0.06), transparent 60%);
  animation: drift 22s ease-in-out infinite alternate;
}
.bg-ops::after {
  content: ""; position: absolute; inset: 0;
  background-image:
    repeating-linear-gradient(0deg,  rgba(214,218,224,0.035) 0 1px, transparent 1px 72px),
    repeating-linear-gradient(90deg, rgba(214,218,224,0.035) 0 1px, transparent 1px 72px);
  mask-image: radial-gradient(circle at 50% 30%, black, transparent 90%);
}
@keyframes drift {
  from { transform: translate3d(-2%, -1%, 0) scale(1.02); }
  to   { transform: translate3d(2%, 1%, 0) scale(1.06); }
}
@keyframes sweep {
  0% { transform: translateX(-120%); }
  100% { transform: translateX(120%); }
}
.scanline { position: relative; overflow: hidden; }
.scanline::after {
  content: ""; position: absolute; top: 0; bottom: 0; width: 30%;
  background: linear-gradient(90deg, transparent, rgba(127,178,201,0.12), transparent);
  animation: sweep 3.4s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .bg-ops::before, .scanline::after { animation: none; }
}
.fade-up { animation: fadeUp .5s ease both; }
@keyframes fadeUp { from { opacity: 0; transform: translateY(8px);} to {opacity:1; transform:none;} }
