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

async function fetchBlobAsBase64(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ data: reader.result.split(",")[1], type: blob.type });
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function downloadSingleFile(url, filename) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank");
  }
}

async function buildAndDownloadZip(scenes, selectedPerScene, setZipStatus) {
  const { default: JSZip } = await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm");
  const zip = new JSZip();
  let total = 0;
  let done = 0;

  // count total
  scenes.forEach((scene, si) => {
    const sel = selectedPerScene[si] || [];
    total += sel.length;
    if (scene.ytResults) {
      // yt not downloadable directly, skip
    }
    if (scene.googleResults) {
      const gSel = (selectedPerScene[`g${si}`] || []);
      total += gSel.length;
    }
  });

  for (let si = 0; si < scenes.length; si++) {
    const scene = scenes[si];
    const folderName = `Scene_${si + 1}_${scene.query.replace(/[^a-z0-9]/gi, "_").slice(0, 30)}`;
    const folder = zip.folder(folderName);

    const sel = selectedPerScene[si] || [];
    for (const id of sel) {
      const item = scene.results.find(r => r.id === id);
      if (!item) continue;
      const ext = item.type === "video" ? "mp4" : "jpg";
      const filename = `${item.source}_${item.id}.${ext}`;
      setZipStatus(`Packing ${done + 1}/${total}: ${filename}`);
      const result = await fetchBlobAsBase64(item.downloadUrl || item.thumb);
      if (result) folder.file(filename, result.data, { base64: true });
      done++;
    }

    // Google images
    const gSel = selectedPerScene[`g${si}`] || [];
    if (scene.googleResults && gSel.length > 0) {
      const gFolder = folder.folder("google_images");
      for (const id of gSel) {
        const item = scene.googleResults.find(r => r.id === id);
        if (!item) continue;
        const filename = `google_${id}.jpg`;
        setZipStatus(`Packing ${done + 1}/${total}: ${filename}`);
        const result = await fetchBlobAsBase64(item.url);
        if (result) gFolder.file(filename, result.data, { base64: true });
        done++;
      }
    }
  }

  setZipStatus("Generating ZIP file...");
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sceneforge_footage.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  setZipStatus("");
}

function SceneCard({ scene, index, selectedPerScene, setSelectedPerScene }) {
  const [downloading, setDownloading] = useState(null);

  const selected = selectedPerScene[index] || [];
  const gSelected = selectedPerScene[`g${index}`] || [];

  const setSelected = (val) => setSelectedPerScene(prev => ({ ...prev, [index]: typeof val === "function" ? val(prev[index] || []) : val }));
  const setGSelected = (val) => setSelectedPerScene(prev => ({ ...prev, [`g${index}`]: typeof val === "function" ? val(prev[`g${index}`] || []) : val }));

  const toggle = (id) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleG = (id) => setGSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const allIds = scene.results.map(r => r.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.includes(id));
  const toggleAll = () => allSelected ? setSelected([]) : setSelected(allIds);

  const allGIds = (scene.googleResults || []).map(r => r.id);
  const allGSelected = allGIds.length > 0 && allGIds.every(id => gSelected.includes(id));
  const toggleAllG = () => allGSelected ? setGSelected([]) : setGSelected(allGIds);

  const handleDownload = async (e, item) => {
    e.stopPropagation();
    setDownloading(item.id);
    const ext = item.type === "video" ? "mp4" : "jpg";
    await downloadSingleFile(item.downloadUrl || item.thumb, `sceneforge-${item.id}.${ext}`);
    setDownloading(null);
  };

  const totalSelected = selected.length + gSelected.length;

  return (
    <div style={s.sceneCard}>
      <div style={s.sceneTop}>
        <span style={s.sceneLabel}>SCENE {index + 1}</span>
        {scene.type === "event" && <span style={s.eventBadge}>📰 EVENT</span>}
        {scene.type === "place" && <span style={s.placeBadge}>📍 PLACE</span>}
        <span style={s.sceneQuery}>"{scene.query}"</span>
        <span style={s.sceneCount}>{scene.results.length} clips {scene.googleResults?.length ? `· ${scene.googleResults.length} images` : ""}</span>
      </div>
      <p style={s.sceneSentence}>{scene.sentence}</p>

      {/* Stock Footage */}
      <div style={s.subHeader}>
        <span style={s.subLabel}>STOCK FOOTAGE</span>
        <button style={s.selectAllBtn} onClick={toggleAll}>
          {allSelected ? "✕ Deselect All" : "✓ Select All"}
        </button>
        <span style={s.selCount}>{selected.length} selected</span>
      </div>
      <div style={s.grid}>
        {scene.results.map((item) => (
          <div key={item.id}
            style={{ ...s.card, ...(selected.includes(item.id) ? s.cardSelected : {}) }}
            onClick={() => toggle(item.id)}>
            <div style={s.imgWrap}>
              <img src={item.thumb} alt={item.alt} style={s.img} loading="lazy" />
              {item.type === "video" && <span style={s.vidBadge}>▶ VIDEO</span>}
              <span style={s.srcBadge}>{item.source}</span>
              {selected.includes(item.id) && <div style={s.overlay}>✓</div>}
            </div>
            <button style={{ ...s.dlBtn, ...(downloading === item.id ? s.dlBtnLoading : {}) }}
              onClick={(e) => handleDownload(e, item)} disabled={downloading === item.id}>
              {downloading === item.id ? "⟳ Downloading..." : "↓ Download"}
            </button>
          </div>
        ))}
      </div>

      {/* Google Images */}
      {scene.googleResults && scene.googleResults.length > 0 && (
        <>
          <div style={{ ...s.subHeader, borderTop: `1px solid rgba(201,168,76,0.1)`, marginTop: "0" }}>
            <span style={{ ...s.subLabel, color: "#4a9eff" }}>🔍 GOOGLE IMAGES — {scene.googleQuery}</span>
            <button style={s.selectAllBtn} onClick={toggleAllG}>
              {allGSelected ? "✕ Deselect All" : "✓ Select All"}
            </button>
            <span style={s.selCount}>{gSelected.length} selected</span>
          </div>
          <div style={s.grid}>
            {scene.googleResults.map((item) => (
              <div key={item.id}
                style={{ ...s.card, ...(gSelected.includes(item.id) ? s.cardSelectedBlue : {}) }}
                onClick={() => toggleG(item.id)}>
                <div style={s.imgWrap}>
                  <img src={item.thumb || item.url} alt={item.title} style={s.img} loading="lazy"
                    onError={(e) => { e.target.style.display = "none"; }} />
                  <span style={{ ...s.srcBadge, background: "rgba(74,158,255,0.7)" }}>Google</span>
                  {gSelected.includes(item.id) && <div style={s.overlayBlue}>✓</div>}
                </div>
                <div style={s.imgTitle}>{item.title?.slice(0, 40)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* YouTube */}
      {scene.ytResults && scene.ytResults.length > 0 && (
        <>
          <div style={{ ...s.subHeader, borderTop: `1px solid rgba(201,168,76,0.1)` }}>
            <span style={{ ...s.subLabel, color: "#ff4444" }}>▶ YOUTUBE CLIPS</span>
          </div>
          <div style={{ ...s.grid, gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", padding: "14px" }}>
            {scene.ytResults.map((yt) => (
              <a key={yt.id} href={`https://youtube.com/watch?v=${yt.id}`} target="_blank" rel="noopener noreferrer" style={s.ytCard}>
                <div style={s.imgWrap}>
                  <img src={yt.thumb} alt={yt.title} style={s.img} loading="lazy" />
                  <span style={s.ytPlayBadge}>▶</span>
                </div>
                <div style={s.ytTitle}>{yt.title}</div>
                <div style={s.ytChannel}>{yt.channel}</div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function SceneForge() {
  const [script, setScript] = useState("");
  const [groqKey, setGroqKey] = useState("");
  const [pexelsKey, setPexelsKey] = useState("");
  const [pixabayKey, setPixabayKey] = useState("");
  const [ytKey, setYtKey] = useState("");
  const [googleKey, setGoogleKey] = useState("");
  const [googleCx, setGoogleCx] = useState("");
  const [resultsPerSentence, setResultsPerSentence] = useState(8);
  const [minLength, setMinLength] = useState(30);
  const [batchSize, setBatchSize] = useState(5);
  const [useVideos, setUseVideos] = useState(true);
  const [usePhotos, setUsePhotos] = useState(true);
  const [usePexels, setUsePexels] = useState(true);
  const [usePixabay, setUsePixabay] = useState(true);
  const [useYT, setUseYT] = useState(false);
  const [useGoogle, setUseGoogle] = useState(false);
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [selectedPerScene, setSelectedPerScene] = useState({});
  const [zipStatus, setZipStatus] = useState("");
  const [zipping, setZipping] = useState(false);

  const totalSelected = Object.values(selectedPerScene).reduce((a, v) => a + (Array.isArray(v) ? v.length : 0), 0);

  const selectAll = () => {
    const newSel = {};
    scenes.forEach((scene, i) => {
      newSel[i] = scene.results.map(r => r.id);
      if (scene.googleResults) newSel[`g${i}`] = scene.googleResults.map(r => r.id);
    });
    setSelectedPerScene(newSel);
  };

  const deselectAll = () => setSelectedPerScene({});

  const handleZipDownload = async () => {
    setZipping(true);
    try {
      await buildAndDownloadZip(scenes, selectedPerScene, setZipStatus);
    } catch (e) {
      setError("ZIP error: " + e.message);
    }
    setZipping(false);
    setZipStatus("");
  };

  const run = useCallback(async () => {
    if (!script.trim()) return setError("Please paste your script.");
    if (!groqKey.trim()) return setError("Please enter your Groq API key.");
    if (!pexelsKey.trim() && !pixabayKey.trim()) return setError("Enter at least one API key (Pexels or Pixabay).");
    if (!useVideos && !usePhotos) return setError("Select at least Videos or Photos.");
    if (!usePexels && !usePixabay) return setError("Select at least Pexels or Pixabay.");
    if (useYT && !ytKey.trim()) return setError("Enter YouTube API key or disable YouTube.");
    if (useGoogle && (!googleKey.trim() || !googleCx.trim())) return setError("Enter Google API Key and Search Engine ID or disable Google Images.");

    setError(""); setScenes([]); setSelectedPerScene({});
    setLoading(true); setStatus("🤖 Sending script to Groq AI...");

    try {
      const sentences = script.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(s => s.length >= minLength);
      if (sentences.length === 0) { setError("No sentences long enough. Lower Min Sentence Length."); setLoading(false); return; }

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
        const { sentence, query, type, googleQuery } = parsed[i];
        setStatus(`📡 Fetching footage for scene ${i + 1}/${parsed.length}: "${query}"`);
        const results = [];

        if (usePexels && pexelsKey.trim()) {
          if (useVideos) {
            try {
              const r = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perSource}`, { headers: { Authorization: pexelsKey.trim() } });
              const d = await r.json();
              (d.videos || []).forEach(v => {
                const file = v.video_files?.find(f => f.quality === "hd") || v.video_files?.[0];
                results.push({ id: `pv${v.id}`, type: "video", thumb: v.image, downloadUrl: file?.link || v.url, alt: query, source: "Pexels" });
              });
            } catch {}
          }
          if (usePhotos) {
            try {
              const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perSource}`, { headers: { Authorization: pexelsKey.trim() } });
              const d = await r.json();
              (d.photos || []).forEach(p => results.push({ id: `pp${p.id}`, type: "photo", thumb: p.src.medium, downloadUrl: p.src.original, alt: p.alt || query, source: "Pexels" }));
            } catch {}
          }
        }

        if (usePixabay && pixabayKey.trim()) {
          if (useVideos) {
            try {
              const r = await fetch(`https://pixabay.com/api/videos/?key=${pixabayKey.trim()}&q=${encodeURIComponent(query)}&per_page=${perSource}`);
              const d = await r.json();
              (d.hits || []).forEach(v => {
                const file = v.videos?.large?.url || v.videos?.medium?.url || "";
                results.push({ id: `xv${v.id}`, type: "video", thumb: v.videos?.medium?.thumbnail || v.userImageURL, downloadUrl: file, alt: query, source: "Pixabay" });
              });
            } catch {}
          }
          if (usePhotos) {
            try {
              const r = await fetch(`https://pixabay.com/api/?key=${pixabayKey.trim()}&q=${encodeURIComponent(query)}&per_page=${perSource}&image_type=photo`);
              const d = await r.json();
              (d.hits || []).forEach(p => results.push({ id: `xp${p.id}`, type: "photo", thumb: p.webformatURL, downloadUrl: p.largeImageURL, alt: p.tags || query, source: "Pixabay" }));
            } catch {}
          }
        }

        let ytResults = [];
        if (useYT && ytKey.trim()) {
          try {
            const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=4&key=${ytKey.trim()}`);
            const d = await r.json();
            ytResults = (d.items || []).map(item => ({ id: item.id.videoId, title: item.snippet.title, channel: item.snippet.channelTitle, thumb: item.snippet.thumbnails?.medium?.url || "" }));
          } catch {}
        }

        let googleResults = [];
        const effectiveGoogleQuery = googleQuery || query;
        if (useGoogle && googleKey.trim() && googleCx.trim() && effectiveGoogleQuery) {
          try {
            const r = await fetch(`https://www.googleapis.com/customsearch/v1?key=${googleKey.trim()}&cx=${googleCx.trim()}&q=${encodeURIComponent(effectiveGoogleQuery)}&searchType=image&num=6`);
            const d = await r.json();
            googleResults = (d.items || []).map((item, idx) => ({
              id: `g${i}_${idx}`,
              url: item.link,
              thumb: item.image?.thumbnailLink || item.link,
              title: item.title,
              source: item.displayLink,
            }));
          } catch {}
        }

        if (results.length > 0 || ytResults.length > 0 || googleResults.length > 0) {
          allScenes.push({ sentence, query, type: type || "generic", googleQuery: effectiveGoogleQuery, results, ytResults, googleResults });
        }
      }

      setScenes(allScenes);
      setStatus(`Done — ${allScenes.reduce((a, s) => a + s.results.length, 0)} clips + ${allScenes.reduce((a, s) => a + (s.googleResults?.length || 0), 0)} images across ${allScenes.length} scenes.`);
    } catch (e) {
      setError("Error: " + e.message);
      setStatus("");
    } finally {
      setLoading(false);
    }
  }, [script, groqKey, pexelsKey, pixabayKey, ytKey, googleKey, googleCx, resultsPerSentence, minLength, batchSize, useVideos, usePhotos, usePexels, usePixabay, useYT, useGoogle]);

  return (
    <div style={s.root}>
      <div style={s.gridBg} />
      <div style={s.wrap}>
        <div style={s.header}>
          <div style={s.logoRow}><span style={s.logoHex}>⬡</span><span style={s.logoText}>SCENEFORGE</span></div>
          <p style={s.tagline}>AI Script → Stock Footage Engine for Faceless YouTube Creators</p>
        </div>

        <div style={s.section}>
          <label style={s.sectionLabel}>YOUR SCRIPT</label>
          <textarea value={script} onChange={e => setScript(e.target.value)}
            placeholder="Paste your full faceless YouTube script here..." style={s.textarea} rows={12} />
        </div>

        <div style={s.section}>
          <label style={s.sectionLabel}>API KEYS</label>
          <div style={s.keysGrid}>
            <div>
              <div style={s.keyLabel}>GROQ API KEY <span style={s.required}>*REQUIRED — FREE</span></div>
              <input type="text" placeholder="gsk_..." value={groqKey} onChange={e => setGroqKey(e.target.value)} style={s.input} />
              <div style={s.hint}>console.groq.com → API Keys</div>
            </div>
            <div>
              <div style={s.keyLabel}>PEXELS API KEY <span style={s.required}>FREE</span></div>
              <input type="text" placeholder="Paste Pexels key..." value={pexelsKey} onChange={e => setPexelsKey(e.target.value)} style={s.input} />
              <div style={s.hint}>pexels.com/api</div>
            </div>
            <div>
              <div style={s.keyLabel}>PIXABAY API KEY <span style={s.required}>FREE</span></div>
              <input type="text" placeholder="Paste Pixabay key..." value={pixabayKey} onChange={e => setPixabayKey(e.target.value)} style={s.input} />
              <div style={s.hint}>pixabay.com/api/docs</div>
            </div>
            <div>
              <div style={s.keyLabel}>YOUTUBE API KEY <span style={s.optional}>OPTIONAL</span></div>
              <input type="text" placeholder="Paste YouTube key..." value={ytKey} onChange={e => setYtKey(e.target.value)} style={s.input} />
              <div style={s.hint}>console.cloud.google.com → YouTube Data API v3</div>
            </div>
            <div>
              <div style={s.keyLabel}>GOOGLE API KEY <span style={s.optional}>OPTIONAL</span></div>
              <input type="text" placeholder="Paste Google API key..." value={googleKey} onChange={e => setGoogleKey(e.target.value)} style={s.input} />
              <div style={s.hint}>console.cloud.google.com → Custom Search API</div>
            </div>
            <div>
              <div style={s.keyLabel}>GOOGLE SEARCH ENGINE ID <span style={s.optional}>OPTIONAL</span></div>
              <input type="text" placeholder="cx=..." value={googleCx} onChange={e => setGoogleCx(e.target.value)} style={s.input} />
              <div style={s.hint}>programmablesearchengine.google.com → create engine → get ID</div>
            </div>
          </div>
        </div>

        <div style={s.section}>
          <label style={s.sectionLabel}>OPTIONS</label>
          <div style={{ ...s.optionsGrid, gridTemplateColumns: "1fr 1fr 1fr" }}>
            <div>
              <div style={s.keyLabel}>RESULTS PER SENTENCE</div>
              <input type="number" min={2} max={20} value={resultsPerSentence} onChange={e => setResultsPerSentence(Number(e.target.value))} style={s.input} />
            </div>
            <div>
              <div style={s.keyLabel}>MIN SENTENCE LENGTH</div>
              <input type="number" min={10} max={200} value={minLength} onChange={e => setMinLength(Number(e.target.value))} style={s.input} />
            </div>
            <div>
              <div style={s.keyLabel}>BATCH SIZE</div>
              <input type="number" min={1} max={20} value={batchSize} onChange={e => setBatchSize(Number(e.target.value))} style={s.input} />
            </div>
          </div>
          <div style={s.checkRow}>
            <Checkbox checked={useVideos} onChange={setUseVideos} label="Videos" />
            <Checkbox checked={usePhotos} onChange={setUsePhotos} label="Photos" />
            <Checkbox checked={usePexels} onChange={setUsePexels} label="Pexels" />
            <Checkbox checked={usePixabay} onChange={setUsePixabay} label="Pixabay" />
            <Checkbox checked={useYT} onChange={setUseYT} label="YouTube Clips" />
            <Checkbox checked={useGoogle} onChange={setUseGoogle} label="Google Images" />
          </div>
        </div>

        {error && <div style={s.errorBox}>{error}</div>}

        <button style={{ ...s.runBtn, ...(loading ? s.runBtnDisabled : {}) }} onClick={run} disabled={loading}>
          {loading ? "⟳ PROCESSING..." : "ANALYSE SCRIPT & FIND FOOTAGE"}
        </button>

        {status && (
          <div style={{ ...s.statusBox, ...(status.startsWith("Done") ? s.statusDone : {}) }}>
            {status.startsWith("Done") ? "✓ " : ""}{status}
          </div>
        )}

        {scenes.length > 0 && (
          <div style={s.statsRow}>
            <span style={s.stat}>🎬 <strong>{scenes.reduce((a,s)=>a+s.results.length,0)}</strong> clips · <strong>{scenes.reduce((a,s)=>a+(s.googleResults?.length||0),0)}</strong> images · <strong>{scenes.length}</strong> scenes</span>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <button style={s.selAllGlobalBtn} onClick={selectAll}>✓ Select All</button>
              <button style={s.deselAllGlobalBtn} onClick={deselectAll}>✕ Deselect All</button>
              {totalSelected > 0 && (
                <button
                  style={{ ...s.zipBtn, ...(zipping ? s.zipBtnLoading : {}) }}
                  onClick={handleZipDownload}
                  disabled={zipping}
                >
                  {zipping ? `⟳ ${zipStatus || "Preparing ZIP..."}` : `↓ Download ZIP (${totalSelected} files)`}
                </button>
              )}
            </div>
          </div>
        )}

        {scenes.map((scene, i) => (
          <SceneCard key={i} scene={scene} index={i}
            selectedPerScene={selectedPerScene}
            setSelectedPerScene={setSelectedPerScene} />
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
  optional: { color: "rgba(232,220,200,0.3)", marginLeft: "6px" },
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
  statsRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", background: goldDim, border: `1px solid ${goldBorder}`, borderRadius: "3px", marginBottom: "24px", flexWrap: "wrap", gap: "10px" },
  stat: { fontSize: "13px" },
  selAllGlobalBtn: { background: "rgba(201,168,76,0.1)", border: `1px solid ${goldBorder}`, color: gold, padding: "6px 14px", fontSize: "11px", cursor: "pointer", borderRadius: "3px", fontFamily: "'Courier New', monospace", letterSpacing: "0.1em" },
  deselAllGlobalBtn: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(232,220,200,0.5)", padding: "6px 14px", fontSize: "11px", cursor: "pointer", borderRadius: "3px", fontFamily: "'Courier New', monospace", letterSpacing: "0.1em" },
  zipBtn: { background: `linear-gradient(135deg, ${gold}, #a07830)`, border: "none", color: "#0d0d0d", padding: "8px 20px", fontSize: "12px", fontWeight: "bold", letterSpacing: "0.12em", cursor: "pointer", borderRadius: "3px", fontFamily: "'Courier New', monospace" },
  zipBtnLoading: { opacity: 0.7, cursor: "not-allowed" },
  sceneCard: { background: "rgba(15,13,10,0.98)", border: `1px solid ${goldBorder}`, borderRadius: "3px", marginBottom: "20px", overflow: "hidden" },
  sceneTop: { display: "flex", alignItems: "center", gap: "10px", padding: "12px 18px", background: goldDim, borderBottom: `1px solid ${goldBorder}`, flexWrap: "wrap" },
  sceneLabel: { fontSize: "10px", letterSpacing: "0.2em", color: gold, background: "rgba(201,168,76,0.1)", border: `1px solid ${goldBorder}`, padding: "3px 10px", borderRadius: "2px" },
  eventBadge: { fontSize: "10px", background: "rgba(255,100,100,0.15)", border: "1px solid rgba(255,100,100,0.4)", color: "#ff8888", padding: "3px 8px", borderRadius: "2px" },
  placeBadge: { fontSize: "10px", background: "rgba(100,200,100,0.15)", border: "1px solid rgba(100,200,100,0.4)", color: "#88cc88", padding: "3px 8px", borderRadius: "2px" },
  sceneQuery: { fontSize: "14px", color: "#e8dcc8", fontWeight: "bold", flex: 1 },
  sceneCount: { fontSize: "11px", color: "rgba(232,220,200,0.4)" },
  sceneSentence: { margin: 0, padding: "10px 18px", fontSize: "12px", color: "rgba(232,220,200,0.45)", fontStyle: "italic", borderBottom: `1px solid rgba(201,168,76,0.07)`, lineHeight: "1.6" },
  subHeader: { display: "flex", alignItems: "center", gap: "12px", padding: "8px 14px", background: "rgba(0,0,0,0.2)", flexWrap: "wrap" },
  subLabel: { fontSize: "10px", letterSpacing: "0.15em", color: gold, flex: 1 },
  selectAllBtn: { background: "rgba(201,168,76,0.1)", border: `1px solid ${goldBorder}`, color: gold, padding: "4px 12px", fontSize: "10px", letterSpacing: "0.1em", cursor: "pointer", borderRadius: "3px", fontFamily: "'Courier New', monospace" },
  selCount: { fontSize: "10px", color: "rgba(232,220,200,0.4)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px", padding: "12px" },
  card: { border: "2px solid transparent", borderRadius: "3px", overflow: "hidden", cursor: "pointer", background: "#111" },
  cardSelected: { borderColor: gold, boxShadow: `0 0 14px rgba(201,168,76,0.3)` },
  cardSelectedBlue: { borderColor: "#4a9eff", boxShadow: "0 0 14px rgba(74,158,255,0.3)" },
  imgWrap: { position: "relative", paddingTop: "56.25%", background: "#1a1a1a", overflow: "hidden" },
  img: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" },
  vidBadge: { position: "absolute", top: "6px", left: "6px", background: "rgba(201,168,76,0.88)", color: "#0d0d0d", fontSize: "8px", fontWeight: "bold", padding: "2px 7px", borderRadius: "2px" },
  srcBadge: { position: "absolute", bottom: "6px", right: "6px", background: "rgba(0,0,0,0.65)", color: "rgba(232,220,200,0.7)", fontSize: "8px", padding: "2px 7px", borderRadius: "2px" },
  overlay: { position: "absolute", inset: 0, background: "rgba(201,168,76,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", color: gold, fontWeight: "bold" },
  overlayBlue: { position: "absolute", inset: 0, background: "rgba(74,158,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", color: "#4a9eff", fontWeight: "bold" },
  imgTitle: { padding: "6px 8px", fontSize: "10px", color: "rgba(232,220,200,0.5)", lineHeight: "1.3", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" },
  dlBtn: { display: "block", width: "100%", textAlign: "center", padding: "7px", background: "rgba(201,168,76,0.07)", color: "rgba(201,168,76,0.85)", fontSize: "10px", letterSpacing: "0.08em", border: "none", borderTop: `1px solid rgba(201,168,76,0.1)`, cursor: "pointer", fontFamily: "'Courier New', monospace" },
  dlBtnLoading: { opacity: 0.5, cursor: "not-allowed" },
  ytCard: { display: "block", textDecoration: "none", background: "#111", border: "1px solid rgba(255,68,68,0.2)", borderRadius: "3px", overflow: "hidden" },
  ytPlayBadge: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", color: "rgba(255,255,255,0.8)", background: "rgba(0,0,0,0.3)" },
  ytTitle: { padding: "8px 10px 4px", fontSize: "11px", color: "#e8dcc8", lineHeight: "1.4", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" },
  ytChannel: { padding: "0 10px 8px", fontSize: "10px", color: "rgba(232,220,200,0.4)" },
};
