"use client";
import { useState } from "react";
import SceneForge from "./SceneForge";

const ACCESS_CODE = "test";

export default function Page() {
  const [code, setCode] = useState("");
  const [granted, setGranted] = useState(false);
  const [error, setError] = useState(false);

  if (granted) return <SceneForge />;

  const check = () => {
    if (code.trim() === ACCESS_CODE) {
      setGranted(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Courier New', monospace" }}>
      <div style={{ background: "#111", border: "1px solid rgba(201,168,76,0.25)", borderRadius: "6px", padding: "48px 40px", width: "100%", maxWidth: "380px", textAlign: "center" }}>
        <div style={{ fontSize: "28px", color: "#c9a84c", letterSpacing: "0.35em", fontWeight: "bold", marginBottom: "8px" }}>⬡ SCENEFORGE</div>
        <div style={{ fontSize: "11px", color: "rgba(232,220,200,0.35)", letterSpacing: "0.15em", marginBottom: "36px" }}>ENTER ACCESS CODE</div>
        <input
          type="password"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(false); }}
          onKeyDown={(e) => e.key === "Enter" && check()}
          placeholder="Access code..."
          style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${error ? "rgba(200,60,60,0.6)" : "rgba(201,168,76,0.25)"}`, borderRadius: "3px", color: "#e8dcc8", padding: "12px 16px", fontSize: "14px", fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: "12px" }}
          autoFocus
        />
        {error && <div style={{ color: "#ff8f8f", fontSize: "12px", marginBottom: "12px" }}>Incorrect code. Try again.</div>}
        <button
          onClick={check}
          style={{ width: "100%", background: "linear-gradient(135deg, #c9a84c, #a07830)", border: "none", color: "#0d0d0d", padding: "14px", fontSize: "13px", fontWeight: "bold", letterSpacing: "0.2em", fontFamily: "inherit", cursor: "pointer", borderRadius: "3px" }}
        >
          ENTER
        </button>
      </div>
    </div>
  );
}
