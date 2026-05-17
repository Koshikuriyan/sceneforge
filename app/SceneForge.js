"use client";
import { useState, useCallback } from "react";

function Checkbox({ checked, onChange, label }) {
  return (
    <label style={s.checkLabel} onClick={() => onChange(!checked)}>
      <div style={{ ...s.checkbox, ...(checked ? s.checkboxOn : {}) }}>
        {checked && <span style={s.checkmark}>✓</span>}
      </div>
      {label}
    </label>
  );
}

async function downloadFile(url, filename) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || "footage";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank");
  }
}

function SceneCard({ scene, index }) {
  const [selected, setSelected] = useState([]);
  const [downloading, setDownloading] = useState(null);

  const toggle = (id) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const handleDownload = async (e, item) => {
    e.stopPropagation();
    setDownloading(item.id);
    const ext = item.type === "video" ? "mp4" : "jpg";
    await downloadFile(item.downloadUrl || item.thumb, `sceneforge-${item.id}.${ext}`);
    setDownloading(null);
  };

  return (
    <div style={s.sceneCard}>
      <div style={s.sceneTop}>
        <span style={s.sceneLabel}>SCENE {index + 1}</span>
        <span style={s.sceneQuery}>"{scene.query}"</span>
        <span style={s.sceneCount}>{scene.results.length} results</span>
      </div>
      <p style={s.sceneSentence}>{scene.sentence}</p>
      <div style={s.grid}>
        {scene.results.map((item) => (
          <div
            key={item.id}
            style={{ ...s.card, ...(selected.includes(item.id) ? s.cardSelected : {}) }}
            onClick={() => toggle(item.id)}
          >
            <div style={s.imgWrap}>
              <img src={item.thumb} alt={item.alt} style={s.img} loading="lazy" />
              {item.type === "video" && <span style={s.vidBadge}>▶ VIDEO</span>}
              <span style={s.srcBadge}>{item.source}</span>
              {selected.includes(item.id) && <div style={s.overlay}>✓</div>}
            </div>
            <button
              style={{ ...s.dlBtn, ...(downloading === item.id ? s.dlBtnLoading : {}) }}
              onClick={(e) => handleDownload(e, item)}
              disabled={downloading === item.id}
            >
              {downloading === item.id ? "⟳ Downloading..." : "↓ Download"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SceneForge() {
  const [script, setScript] = useState("");
  const [groqKey, setGroqKey] = useState("");
  const [pexelsKey, setPexelsKey] = useState("");
  const [pixabayKey, setPixabayKey] = useState("");
  const [resultsPerSentence, setResultsPerSentence] = useState(10);
  const [minLength, setMinLength] = useState(30);
  const [batchSize, setBatchSize] = useState(5);
  const [useVideos, setUseVideos] = useState(true);
  const [usePhotos, setUsePhotos] = useState(true);
  const [usePexels, setUsePexels] = useState(true);
  const [usePixabay, setUsePixabay] = useState(true);
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const totalResults = scenes.reduce((a, s) => a + s.results.length, 0);

  const run = useCallback(async () => {
    if (!script.trim()) return setError("Please paste your script.");
    if (!groqKey.trim()) return setError("Please enter your Groq API key.");
    if (!pexelsKey.trim() && !pixabayKey.trim())
      return setError("Enter at least one API key (Pexels or Pixabay).");
    if (!useVideos && !usePhotos) return setError("Select at least Videos or Photos.");
    if (!usePexels && !usePixabay) return setError("Select at least Pexels or Pixabay.");

    setError("");
    setScenes([]);
    setLoading(true);
    setStatus("🤖 Sending script to Groq AI for analysis...");

    try {
      const sentences = script
        .split(/(?<=[.!?])\s+|\n+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= minLength);

      if (sentences.length === 0) {
        setError("No sentences long enough. Try lowering Min Sentence Length.");
        setLoading(false);
        return;
      }

      const aiRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentences, batchSize, groqKey }),
      });
      const aiData = await aiRes.json();
      if (aiData.error) throw new Error(aiData.error);

      const parsed = aiData.results;
      const allScenes = [];
      const sourcesEnabled = [usePexels, usePixabay].filter(Boolean).length;
      const typesEnabled = [useVideos, usePhotos].filter(Boolean).length;
      const perSource = Math.max(2, Math.ceil(resultsPerSentence / (sourcesEnabled * typesEnabled)));

      for (let i = 0; i < parsed.length; i++) {
        const { sentence, query } = parsed[i];
        setStatus(`📡 Fetching footage for scene ${i + 1} of ${parsed.length}: "${query}"`);
        const results = [];

        if (usePexels && pexelsKey.trim()) {
          if (useVideos) {
            try {
              const r = await fetch(
                `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perSource}`,
                { headers: { Authorization: pexelsKey.trim() } }
              );
              const d = await r.json();
              (d.videos || []).forEach((v) => {
                const file = v.video_files?.find(f => f.quality === "hd") || v.video_files?.[0];
                results.push({
                  id: `pv${v.id}`,
                  type: "video",
                  thumb: v.image,
                  url: v.url,
                  downloadUrl: file?.link || v.url,
                  alt: query,
                  source: "Pexels"
                });
              });
            } catch {}
          }
          if (usePhotos) {
            try {
              const r = await fetch(
                `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perSource}`,
                { headers: { Authorization: pexelsKey.trim() } }
              );
              const d = await r.json();
              (d.photos || []).forEach((p) =>
                results.push({
                  id: `pp${p.id}`,
                  type: "photo",
                  thumb: p.src.medium,
                  url: p.url,
                  downloadUrl: p.src.original,
                  alt: p.alt || query,
                  source: "Pexels"
                })
              );
            } catch {}
          }
        }

        if (usePixabay && pixabayKey.trim()) {
          if (useVideos) {
            try {
              const r = await fetch(
                `https://pixabay.com/api/videos/?key=${pixabayKey.trim()}&q=${encodeURIComponent(query)}&per_page=${perSource}`
              );
              const d = await r.json();
              (d.hits || []).forEach((v) => {
                const file = v.videos?.large?.url || v.videos?.medium?.url || "";
                results.push({
                  id: `xv${v.id}`,
                  type: "video",
                  thumb: v.videos?.medium?.thumbnail || v.userImageURL,
                  url: `https://pixabay.com/videos/id-${v.id}/`,
                  downloadUrl: file,
                  alt: query,
                  source: "Pixabay"
                });
              });
            } catch {}
          }
          if (usePhotos) {
            try {
              const r = await fetch(
                `https://pixabay.com/api/?key=${pixabayKey.trim()}&q=${encodeURIComponent(query)}&per_page=${perSource}&image_type=photo`
              );
              const d = await r.json();
              (d.hits || []).forEach((p) =>
                results.push({
                  id: `xp${p.id}`,
                  type: "photo",
                  thumb: p.webformatURL,
                  url: p.pageURL,
                  downloadUrl: p.largeImageURL,
                  alt: p.tags || query,
                  source: "Pixabay"
                })
              );
            } catch {}
          }
        }

        if (results.length > 0) allScenes.push({ sentence, query, results });
      }

      setScenes(allScenes);
      setStatus(`Done — ${allScenes.reduce((a, s) => a + s.results.length, 0)} results found across ${allScenes.length} scenes.`);
    } catch (e) {
      setError("Error: " + e.message);
      setStatus("");
    } finally {
      setLoading(false);
    }
  }, [script, groqKey, pexelsKey, pixabayKey, resultsPerSentence, minLength, batchSize, useVideos, usePhotos, usePexels, usePixabay]);

  return (
    <div style={s.root}>
      <div style={s.gridBg} />
      <div style={s.wrap}>
        <div style={s.header}>
          <div style={s.logoRow}>
            <span style={s.logoHex}>⬡</span>
            <span style={s.logoText}>SCENEFORGE</span>
          </div>
          <p style={s.tagline}>AI Script → Stock Footage Engine for Faceless YouTube Creators</p>
        </div>

        <div style={s.section}>
          <label style={s.sectionLabel}>YOUR SCRIPT</label>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder={"Paste your full faceless YouTube script here...\n\nEvery sentence will be analyzed by Groq AI and matched to stock footage from Pexels and Pixabay."}
            style={s.textarea}
            rows={12}
          />
        </div>

        <div style={s.section}>
          <label style={s.sectionLabel}>API KEYS</label>
          <div style={s.keysGrid}>
            <div>
              <div style={s.keyLabel}>GROQ API KEY <span style={s.required}>*REQUIRED — FREE</span></div>
              <input
                type="text"
                placeholder="gsk_..."
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                style={s.input}
              />
              <div style={s.hint}>console.groq.com → API Keys → free account</div>
            </div>
            <div>
              <div style={s.keyLabel}>PEXELS API KEY <span style={s.required}>FREE</span></div>
              <input
                type="text"
                placeholder="Paste Pexels key..."
                value={pexelsKey}
                onChange={(e) => setPexelsKey(e.target.value)}
                style={s.input}
              />
              <div style={s.hint}>pexels.com/api → free account</div>
            </div>
            <div>
              <div style={s.keyLabel}>PIXABAY API KEY <span style={s.required}>FREE</span></div>
              <input
                type="text"
                placeholder="Paste Pixabay key..."
                value={pixabayKey}
                onChange={(e) => setPixabayKey(e.target.value)}
                style={s.input}
              />
              <div style={s.hint}>pixabay.com/api/docs → free account</div>
            </div>
          </div>
        </div>

        <div style={s.section}>
          <label style={s.sectionLabel}>OPTIONS</label>
          <div style={{ ...s.optionsGrid, gridTemplateColumns: "1fr 1fr 1fr" }}>
            <div>
              <div style={s.keyLabel}>RESULTS PER SENTENCE</div>
              <input type="number" min={2} max={20} value={resultsPerSentence}
                onChange={(e) => setResultsPerSentence(Number(e.target.value))} style={s.input} />
              <div style={s.hint}>Videos + photos each</div>
            </div>
            <div>
              <div style={s.keyLabel}>MIN SENTENCE LENGTH</div>
              <input type="number" min={10} max={200} value={minLength}
                onChange={(e) => setMinLength(Number(e.target.value))} style={s.input} />
              <div style={s.hint}>Characters — skip short lines</div>
            </div>
            <div>
              <div style={s.keyLabel}>BATCH SIZE</div>
              <input type="number" min={1} max={20} value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))} style={s.input} />
              <div style={s.hint}>Sentences per AI call</div>
            </div>
          </div>
          <div style={s.checkRow}>
            <Checkbox checked={useVideos} onChange={setUseVideos} label="Videos" />
            <Checkbox checked={usePhotos} onChange={setUsePhotos} label="Photos" />
            <Checkbox checked={usePexels} onChange={setUsePexels} label="Pexels" />
            <Checkbox checked={usePixabay} onChange={setUsePixabay} label="Pixabay" />
          </div>
        </div>

        {error && <div style={s.errorBox}>{error}</div>}

        <button
          style={{ ...s.runBtn, ...(loading ? s.runBtnDisabled : {}) }}
          onClick={run}
          disabled={loading}
        >
          {loading ? "⟳ PROCESSING..." : "ANALYSE SCRIPT & FIND FOOTAGE"}
        </button>

        {status && (
          <div style={{ ...s.statusBox, ...(status.startsWith("Done") ? s.statusDone : {}) }}>
            {status.startsWith("Done") ? "✓ " : ""}{status}
          </div>
        )}

        {scenes.length > 0 && (
          <div style={s.statsRow}>
            <span style={s.stat}>🎬 <strong>{totalResults}</strong> results across <strong>{scenes.length}</strong> scenes</span>
            <span style={s.statHint}>Click thumbnails to select • Click Download to save directly</span>
          </div>
        )}

        {scenes.map((scene, i) => (
          <SceneCard key={i} scene={scene} index={i} />
        ))}
      </div>
    </div>
  );
}

const gold = "#c9a84c";
const goldDim = "rgba(201,168,76,0.15)";
const goldBorder = "rgba(201,168,76,0.25)";

const s = {
  root: { minHeight: "100vh", background: "#0d0d0d", color: "#e8dcc8", fontFamily: "'Courier New', monospace", position: "relative" },
  gridBg: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.04) 1px,transparent 1px)", backgroundSize: "36px 36px", pointerEvents: "none", zIndex: 0 },
  wrap: { position: "relative", zIndex: 1, maxWidth: "1200px", margin: "0 auto", padding: "40px 24px 100px" },
  header: { textAlign: "center", padding: "20px 0 40px", borderBottom: `1px solid ${goldBorder}`, marginBottom: "36px" },
  logoRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "10px" },
  logoHex: { fontSize: "28px", color: gold, filter: `drop-shadow(0 0 10px ${gold})` },
  logoText: { fontSize: "32px", letterSpacing: "0.35em", color: gold, fontWeight: "bold", textShadow: `0 0 24px ${gold}` },
  tagline: { fontSize: "11px", letterSpacing: "0.12em", color: "rgba(232,220,200,0.45)", margin: 0 },
  section: { marginBottom: "28px" },
  sectionLabel: { display: "block", fontSize: "10px", letterSpacing: "0.25em", color: gold, marginBottom: "14px", borderBottom: `1px solid ${goldBorder}`, paddingBottom: "8px" },
  textarea: { width: "100%", background: "rgba(255,255,255,0.03)", border: `1px solid ${goldBorder}`, borderRadius: "3px", color: "#e8dcc8", padding: "16px", fontSize: "13px", lineHeight: "1.85", fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" },
  keysGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" },
  keyLabel: { fontSize: "10px", letterSpacing: "0.15em", color: "rgba(232,220,200,0.5)", marginBottom: "8px" },
  required: { color: "#e8a87c", marginLeft: "6px" },
  input: { width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${goldBorder}`, borderRadius: "3px", color: "#e8dcc8", padding: "10px 14px", fontSize: "13px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
  hint: { fontSize: "10px", color: "rgba(232,220,200,0.3)", marginTop: "6px", letterSpacing: "0.05em" },
  optionsGrid: { display: "grid", gap: "20px", marginBottom: "20px" },
  checkRow: { display: "flex", gap: "28px", flexWrap: "wrap", alignItems: "center" },
  checkLabel: { display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13px", userSelect: "none" },
  checkbox: { width: "18px", height: "18px", border: `2px solid ${goldBorder}`, borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  checkboxOn: { background: gold, borderColor: gold },
  checkmark: { fontSize: "11px", color: "#0d0d0d", fontWeight: "bold" },
  errorBox: { background: "rgba(200,60,60,0.1)", border: "1px solid rgba(200,60,60,0.4)", borderRadius: "3px", padding: "12px 18px", fontSize: "13px", color: "#ff8f8f", marginBottom: "16px" },
  runBtn: { width: "100%", background: `linear-gradient(135deg, ${gold}, #a07830)`, border: "none", color: "#0d0d0d", padding: "20px", fontSize: "14px", fontWeight: "bold", letterSpacing: "0.2em", fontFamily: "inherit", cursor: "pointer", borderRadius: "3px", marginBottom: "20px" },
  runBtnDisabled: { opacity: 0.6, cursor: "not-allowed" },
  statusBox: { borderLeft: `3px solid ${goldBorder}`, paddingLeft: "18px", fontSize: "13px", color: "rgba(232,220,200,0.6)", marginBottom: "24px", fontStyle: "italic" },
  statusDone: { borderLeftColor: "#6abf6a", color: "#8de08d" },
  statsRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", background: goldDim, border: `1px solid ${goldBorder}`, borderRadius: "3px", marginBottom: "24px", flexWrap: "wrap", gap: "8px" },
  stat: { fontSize: "13px" },
  statHint: { fontSize: "11px", color: "rgba(232,220,200,0.4)", letterSpacing: "0.05em" },
  sceneCard: { background: "rgba(15,13,10,0.98)", border: `1px solid ${goldBorder}`, borderRadius: "3px", marginBottom: "20px", overflow: "hidden" },
  sceneTop: { display: "flex", alignItems: "center", gap: "14px", padding: "12px 18px", background: goldDim, borderBottom: `1px solid ${goldBorder}`, flexWrap: "wrap" },
  sceneLabel: { fontSize: "10px", letterSpacing: "0.2em", color: gold, background: "rgba(201,168,76,0.1)", border: `1px solid ${goldBorder}`, padding: "3px 10px", borderRadius: "2px" },
  sceneQuery: { fontSize: "14px", color: "#e8dcc8", fontWeight: "bold", flex: 1 },
  sceneCount: { fontSize: "11px", color: "rgba(232,220,200,0.4)" },
  sceneSentence: { margin: 0, padding: "10px 18px", fontSize: "12px", color: "rgba(232,220,200,0.45)", fontStyle: "italic", borderBottom: `1px solid rgba(201,168,76,0.07)`, lineHeight: "1.6" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "12px", padding: "14px" },
  card: { border: "2px solid transparent", borderRadius: "3px", overflow: "hidden", cursor: "pointer", background: "#111", transition: "border-color 0.15s, box-shadow 0.15s" },
  cardSelected: { borderColor: gold, boxShadow: `0 0 18px rgba(201,168,76,0.35)` },
  imgWrap: { position: "relative", paddingTop: "56.25%", background: "#1a1a1a", overflow: "hidden" },
  img: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" },
  vidBadge: { position: "absolute", top: "6px", left: "6px", background: "rgba(201,168,76,0.88)", color: "#0d0d0d", fontSize: "8px", fontWeight: "bold", padding: "2px 7px", borderRadius: "2px", letterSpacing: "0.05em" },
  srcBadge: { position: "absolute", bottom: "6px", right: "6px", background: "rgba(0,0,0,0.65)", color: "rgba(232,220,200,0.7)", fontSize: "8px", padding: "2px 7px", borderRadius: "2px" },
  overlay: { position: "absolute", inset: 0, background: "rgba(201,168,76,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", color: gold, fontWeight: "bold" },
  dlBtn: { display: "block", width: "100%", textAlign: "center", padding: "8px", background: "rgba(201,168,76,0.07)", color: "rgba(201,168,76,0.85)", fontSize: "11px", letterSpacing: "0.08em", borderTop: `1px solid rgba(201,168,76,0.1)`, border: "none", cursor: "pointer", fontFamily: "'Courier New', monospace" },
  dlBtnLoading: { opacity: 0.5, cursor: "not-allowed" },
};
