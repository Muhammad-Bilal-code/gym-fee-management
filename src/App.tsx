import React from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import MemberDetails from "./pages/MemberDetails";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected area */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/members/:id" element={<MemberDetails />} />
      </Route>

      <Route path="*" element={<div style={{ padding: 20 }}>404</div>} />
    </Routes>
    // <h2 className="text-7xl text-amber-800">Bilal</h2>
  );
}
