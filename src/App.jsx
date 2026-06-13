import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth, ProtectedRoute } from "./lib/auth.jsx";
import Login from "./pages/Login.jsx";
import Admin from "./pages/Admin.jsx";
import Officer from "./pages/Officer.jsx";
import Client from "./pages/Client.jsx";

function Home() {
  const { loading, session, role } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-steel font-mono text-xs tracking-widest">SECURING SESSION…</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (role === "admin") return <Navigate to="/admin" replace />;
  if (role === "officer") return <Navigate to="/officer" replace />;
  if (role === "client") return <Navigate to="/client" replace />;
  return <div className="min-h-screen grid place-items-center text-steel text-sm px-6 text-center">
    Your account is awaiting role assignment from the administrator.
  </div>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={<ProtectedRoute allow={["admin"]}><Admin /></ProtectedRoute>} />
      <Route path="/officer" element={<ProtectedRoute allow={["officer"]}><Officer /></ProtectedRoute>} />
      <Route path="/client" element={<ProtectedRoute allow={["client"]}><Client /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
