import { useState, useRef, useEffect, useCallback } from "react";

// ─── EXAM DATA ────────────────────────────────────────────────────────────────
const exams = [
  { id: 1, name: "UPSC Civil Services (IAS/IFS/IPS)", category: "Central", body: "UPSC", payScale: "₹56,100 – ₹2,50,000", eligibility: "Any Graduate", difficulty: "Very High", notifMonth: "Feb", link: "https://upsc.gov.in", tags: ["IAS", "IFS", "IPS", "Prestigious"], desc: "India's most prestigious exam. Economics optional is highly popular and scoring." },
  { id: 2, name: "RBI Grade B Officer", category: "Banking/Finance", body: "RBI", payScale: "₹55,200 – ₹1,01,500", eligibility: "60% in Graduation", difficulty: "High", notifMonth: "Mar–Apr", link: "https://rbi.org.in", tags: ["Finance", "Banking", "Economics"], desc: "Dream job for Economics graduates. Phase 2 has dedicated Economics paper." },
  { id: 3, name: "SEBI Grade A Officer", category: "Banking/Finance", body: "SEBI", payScale: "₹44,500 – ₹89,150", eligibility: "60% in Graduation", difficulty: "High", notifMonth: "Jun–Jul", link: "https://sebi.gov.in", tags: ["Finance", "Markets", "Economics"], desc: "Securities regulator. Economics stream gets dedicated paper advantage." },
  { id: 4, name: "NABARD Grade A/B", category: "Banking/Finance", body: "NABARD", payScale: "₹42,020 – ₹51,490", eligibility: "60% in Graduation", difficulty: "High", notifMonth: "May–Jun", link: "https://nabard.org", tags: ["Agriculture", "Rural", "Development"], desc: "Rural development bank. Economics, Agriculture background highly preferred." },
  { id: 5, name: "SSC CGL (Group B/C Posts)", category: "Central", body: "SSC", payScale: "₹35,400 – ₹1,12,400", eligibility: "Any Graduate", difficulty: "Medium", notifMonth: "Apr–May", link: "https://ssc.gov.in", tags: ["Inspector", "Auditor", "Tax"], desc: "Wide range of posts. Income Tax Inspector, Auditor posts suit Economics grads." },
  { id: 6, name: "IBPS PO/SO (Economics Officer)", category: "Banking/Finance", body: "IBPS", payScale: "₹36,000 – ₹63,840", eligibility: "Any Graduate", difficulty: "Medium", notifMonth: "Aug", link: "https://ibps.in", tags: ["Banking", "PO", "Specialist Officer"], desc: "Specialist Officer stream has Economics Officer post with direct advantage." },
  { id: 7, name: "Delhi Subordinate Services (DSSSB)", category: "State/UT", body: "DSSSB", payScale: "₹25,500 – ₹81,100", eligibility: "Any Graduate", difficulty: "Medium", notifMonth: "Varies", link: "https://dsssb.delhi.gov.in", tags: ["Delhi", "State", "Teacher", "Clerk"], desc: "Delhi-based posts including Economics teachers, administrative roles." },
  { id: 8, name: "UPSC EPFO Enforcement Officer", category: "Central", body: "UPSC", payScale: "₹44,900 – ₹1,42,400", eligibility: "Any Graduate", difficulty: "High", notifMonth: "Varies", link: "https://upsc.gov.in", tags: ["EPFO", "Labor", "Social Security"], desc: "Enforcement/Accounts Officer role. Industrial relations & economics background useful." },
  { id: 9, name: "Indian Economic Service (IES)", category: "Central", body: "UPSC", payScale: "₹56,100 – ₹2,50,000", eligibility: "PG in Economics", difficulty: "Very High", notifMonth: "Apr–May", link: "https://upsc.gov.in", tags: ["Economics", "Policy", "Research", "PG Preferred"], desc: "Exclusively for Economics graduates. Direct policymaking roles in govt ministries." },
  { id: 10, name: "LIC AAO / NPS Trust", category: "Banking/Finance", body: "Multiple", payScale: "₹32,795 – ₹62,315", eligibility: "Any Graduate", difficulty: "Medium", notifMonth: "Nov–Dec", link: "https://licindia.in", tags: ["Insurance", "Finance", "AAO"], desc: "LIC AAO Finance/Accounts stream well suited for Economics graduates." },
];

const NOTIF_FILTERS = ["All", "UPSC", "SSC", "Banking", "State PSC", "Railway", "Defence", "Teaching"];
const categories = ["All", "Central", "Banking/Finance", "State/UT"];
const difficulties = ["All", "Medium", "High", "Very High"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function DiffBadge({ level }) {
  const colors = { "Medium": "#22c55e", "High": "#f59e0b", "Very High": "#ef4444" };
  return <span style={{ background: colors[level] + "22", color: colors[level], border: `1px solid ${colors[level]}44`, borderRadius: 4, fontSize: 11, padding: "2px 8px", fontWeight: 600 }}>{level}</span>;
}

function TypeBadge({ type }) {
  const map = { UPSC: "#818cf8", SSC: "#34d399", Banking: "#60a5fa", "State PSC": "#f472b6", Railway: "#fbbf24", Defence: "#f87171", Teaching: "#a78bfa", Other: "#94a3b8" };
  const color = map[type] || map.Other;
  return <span style={{ background: color + "18", color, border: `1px solid ${color}33`, borderRadius: 4, fontSize: 11, padding: "2px 9px", fontWeight: 700 }}>{type}</span>;
}

function timeSince(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── ENRICHMENT HELPERS ───────────────────────────────────────────────────────
async function enrichJobWithGemini(job) {
  const needsEnrichment = !job.examDate || job.lastDate === "Check notification" || !job.formStart;
  if (!needsEnrichment) return job;
  try {
    const res = await fetch("/.netlify/functions/gemini-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobTitle: job.title, link: job.link }),
    });
    const data = await res.json();
    if (data.success && data.enriched) {
      const e = data.enriched;
      return { ...job, formStart: e.formStart || null, lastDate: e.lastDate || job.lastDate, examDate: e.examDate || null, vacancies: e.vacancies || job.posts, eligibility: e.eligibility || job.eligibility, applyLink: e.applyLink || job.link, confirmed: e.confirmed ?? false, enriched: true };
    }
  } catch (err) { console.warn("Enrichment failed:", job.title, err.message); }
  return job;
}

async function fetchAndEnrich() {
  const res  = await fetch("/.netlify/functions/sarkari-proxy");
  const data = await res.json();
  if (!data.success || !data.items?.length) throw new Error(data.error || "No notifications found. Try again.");
  const enriched = await Promise.all(
    data.items.map((item, i) =>
      item.fromTelegram
        ? new Promise(r => setTimeout(r, i * 200)).then(() => enrichJobWithGemini(item))
        : Promise.resolve(item)
    )
  );
  const today = new Date().toISOString().split("T")[0];
  return {
    all:      enriched,
    upcoming: enriched.filter(item => item.examDate && item.examDate > today),
    active:   enriched.filter(item => !item.examDate || item.examDate <= today),
  };
}

// ─── LIVE NOTIFICATIONS TAB ───────────────────────────────────────────────────
function LiveNotificationsTab({ saffron, savedLinks = [] }) {
  const [notifications, setNotifications] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { all, upcoming: upcomingItems } = await fetchAndEnrich();
      setNotifications(all);
      setUpcoming(upcomingItems);
      setLastFetched(new Date());
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotifications(); }, []);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchNotifications, 15 * 60 * 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, fetchNotifications]);

  const filtered = (filter === "All" ? notifications : notifications.filter(n => n.type === filter))
  .filter(n => !savedLinks.includes(n.link));
  const statusColor = { New: "#22c55e", Ongoing: "#60a5fa", "Last Few Days": "#f97316" };

  return (
    <div>
      {/* Controls */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
          {NOTIF_FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, background: filter === f ? saffron : "#1e293b", color: filter === f ? "#fff" : "#64748b", border: filter === f ? "none" : "1px solid #334155" }}>{f}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setAutoRefresh(a => !a)} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "inherit", background: autoRefresh ? "#0a2a1a" : "#1e293b", color: autoRefresh ? "#22c55e" : "#64748b", border: `1px solid ${autoRefresh ? "#22c55e55" : "#334155"}`, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: autoRefresh ? "#22c55e" : "#475569", display: "inline-block", boxShadow: autoRefresh ? "0 0 5px #22c55e" : "none" }} />
            {autoRefresh ? "Auto ON" : "Auto OFF"}
          </button>
          <button onClick={fetchNotifications} disabled={loading} style={{ padding: "6px 18px", borderRadius: 8, fontSize: 12, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 700, background: loading ? "#334155" : saffron, color: "#fff", border: "none" }}>
            {loading ? "⏳ Fetching…" : "🔄 Refresh"}
          </button>
        </div>
      </div>

      {/* Status */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 4 }}>
        <span style={{ fontSize: 11, color: "#475569" }}>
          {lastFetched ? `⏱ Last updated: ${lastFetched.toLocaleTimeString("en-IN")}` : ""}
          {autoRefresh ? " · Auto-refresh every 15 min" : ""}
        </span>
        {!loading && notifications.length > 0 && (
          <span style={{ fontSize: 11, color: "#475569" }}>Showing {filtered.length} / {notifications.length}</span>
        )}
      </div>
      {/* Upcoming Exams */}
      {upcoming.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#f97316", marginBottom: 8, letterSpacing: 0.5 }}>📅 UPCOMING EXAMS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {upcoming.map((n, i) => (
              <div key={i} style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 10, padding: "12px 16px", borderLeft: "4px solid #f97316" }}>
                <div style={{ fontSize: 13, fontWeight: "bold", color: "#f1f5f9", marginBottom: 6 }}>{n.title}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {n.formStart  && <span style={{ background: "#0d2d1a", border: "1px solid #22c55e33", color: "#86efac", borderRadius: 4, fontSize: 11, padding: "2px 8px" }}>📝 Form opens: {n.formStart}</span>}
                  {n.lastDate   && <span style={{ background: "#1f0d0d", border: "1px solid #7f1d1d33", color: "#fca5a5", borderRadius: 4, fontSize: 11, padding: "2px 8px" }}>⏳ Last date: {n.lastDate}</span>}
                  {n.examDate   && <span style={{ background: "#0d1f35", border: "1px solid #1e3a5f", color: "#93c5fd", borderRadius: 4, fontSize: 11, padding: "2px 8px" }}>🗓 Exam: {n.examDate}</span>}
                  {n.confirmed  && <span style={{ background: "#0a2a1a", border: "1px solid #22c55e44", color: "#4ade80", borderRadius: 4, fontSize: 11, padding: "2px 8px" }}>✅ Confirmed</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Source info */}
      <div style={{ background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 8, padding: "9px 14px", marginBottom: 16, fontSize: 12, color: "#475569", display: "flex", gap: 8 }}>
        <span>🌐</span>
        <span>
          <b style={{ color: "#60a5fa" }}>Live from SarkariResult RSS feed</b> — fetched server-side via a Netlify Function proxy. Click 🔗 to open the official notification page.
        </span>
      </div>

      {/* Skeletons */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ background: "#1e293b", borderRadius: 12, padding: "16px 18px", border: "1px solid #334155", borderLeft: "4px solid #2d3f55" }}>
              <div style={{ height: 13, background: "#2d3f55", borderRadius: 4, marginBottom: 10, width: `${50 + i * 9}%` }} />
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <div style={{ height: 20, width: 60, background: "#243347", borderRadius: 12 }} />
                <div style={{ height: 20, width: 50, background: "#243347", borderRadius: 12 }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ height: 22, width: 100, background: "#1a2d42", borderRadius: 4 }} />
                <div style={{ height: 22, width: 130, background: "#1a2d42", borderRadius: 4 }} />
              </div>
            </div>
          ))}
          <div style={{ textAlign: "center", color: "#475569", fontSize: 13, padding: "12px 0" }}>
            🔍 Fetching latest government job notifications from SarkariResult…
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
          <div style={{ color: "#f87171", fontSize: 14, marginBottom: 14 }}>{error}</div>
          <button onClick={fetchNotifications} style={{ background: saffron, color: "#fff", border: "none", borderRadius: 8, padding: "9px 22px", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>Try Again</button>
        </div>
      )}

      {/* Cards */}
      {!loading && !error && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((n, i) => (
            <div key={i} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "14px 18px", borderLeft: `4px solid ${statusColor[n.status] || "#334155"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: "bold", color: "#f1f5f9", lineHeight: 1.45, marginBottom: 7 }}>{n.title}</div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginBottom: 9 }}>
                    <TypeBadge type={n.type || "Other"} />
                    {n.status && (
                      <span style={{ background: (statusColor[n.status] || "#94a3b8") + "18", color: statusColor[n.status] || "#94a3b8", border: `1px solid ${(statusColor[n.status] || "#94a3b8")}33`, borderRadius: 4, fontSize: 11, padding: "2px 8px", fontWeight: 600 }}>
                        {n.status === "New" ? "🆕 New" : n.status === "Last Few Days" ? "⏰ Last Few Days" : "✅ Ongoing"}
                      </span>
                    )}
                    {n.postedOn && <span style={{ fontSize: 11, color: "#475569" }}>🕐 {timeSince(n.postedOn)}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                    {n.body && <span style={{ background: "#0d1f35", border: "1px solid #1e3a5f", color: "#60a5fa", borderRadius: 4, fontSize: 12, padding: "3px 9px" }}>🏛️ {n.body}</span>}
                    {n.posts && <span style={{ background: "#0d1f35", border: "1px solid #1e3a5f", color: "#94a3b8", borderRadius: 4, fontSize: 12, padding: "3px 9px" }}>📋 {n.posts}</span>}
                    {n.eligibility && <span style={{ background: "#0d1f35", border: "1px solid #1e3a5f", color: "#94a3b8", borderRadius: 4, fontSize: 12, padding: "3px 9px" }}>🎓 {n.eligibility}</span>}
                    {n.lastDate && <span style={{ background: "#1f0d0d", border: "1px solid #7f1d1d33", color: "#fca5a5", borderRadius: 4, fontSize: 12, padding: "3px 9px" }}>⏳ {n.lastDate}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {n.link && (
                    <a href={n.link} target="_blank" rel="noopener noreferrer"
                      style={{ background: "#1a56db22", border: "1px solid #1a56db44", color: "#60a5fa", borderRadius: 8, width: 36, height: 36, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, textDecoration: "none" }}>🔗</a>
                  )}
                  <button
                    onClick={() => {
                      const updated = [...savedNotifs, n];
                      setSavedNotifs(updated);
                      localStorage.setItem("saved_notifs", JSON.stringify(updated));
                    }}
                    title="Save job"
                    style={{ background: "#0a2a1a", border: "1px solid #22c55e44", color: "#22c55e", borderRadius: 8, width: 36, height: 36, cursor: "pointer", fontSize: 14 }}>🔖</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && notifications.length > 0 && (
        <div style={{ textAlign: "center", color: "#64748b", padding: 40, fontSize: 14 }}>No notifications for "{filter}". Try "All".</div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function GovtExamTracker() {
  const [bookmarks, setBookmarks] = useState([]);
  const [savedNotifs, setSavedNotifs] = useState(
    JSON.parse(localStorage.getItem("saved_notifs") || "[]")
  );
  const [catFilter, setCatFilter] = useState("All");
  const [diffFilter, setDiffFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("exams");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Namaste! 🙏 I'm your Government Exam Assistant powered by Gemini. I know all about exams relevant to your B.A. (Hons.) Economics background. Ask me anything — eligibility, syllabus, strategy, salary, or which exam to prioritise!" }
  ]);
  const [input, setInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const toggleBookmark = (id) => setBookmarks(b => b.includes(id) ? b.filter(x => x !== id) : [...b, id]);

  const filtered = exams.filter(e => {
    const matchCat = catFilter === "All" || e.category === catFilter;
    const matchDiff = diffFilter === "All" || e.difficulty === diffFilter;
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchDiff && matchSearch;
  });

  const sendMessage = async () => {
    if (!input.trim() || aiLoading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setAiLoading(true);
    try {
      // ── Calls our Netlify Function — API key stays server-side ─────────────
      const res = await fetch("/.netlify/functions/gemini-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: "You are an expert Indian Government Exam counsellor. The user has completed B.A. (Hons.) Economics and is based in Delhi. Help them with exam strategies, syllabi, pay scales, eligibility, timelines. Be concise, practical, encouraging. Use bullet points when listing multiple things.",
          messages: [...messages, { role: "user", content: userMsg }]
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.text || "Sorry, no response." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Network error. Please try again." }]);
    }
    setAiLoading(false);
  };

  const saffron = "#f97316";
  const accent = "#1a56db";
  const TABS = [
    { key: "exams", label: `📋 All Exams (${exams.length})` },
    { key: "saved", label: `🔖 Saved (${bookmarks.length})` },
    { key: "live", label: "🔴 Live Feed" },
    { key: "ai", label: "🤖 AI Counsellor" },
  ];

  return (
    <div style={{ fontFamily: "'Georgia', 'Times New Roman', serif", background: "#0f172a", minHeight: "100vh", color: "#e2e8f0" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 65%)", borderBottom: "3px solid " + saffron, padding: "22px 28px 18px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -30, top: -30, width: 180, height: 180, borderRadius: "50%", background: saffron + "09", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
          <div style={{ background: saffron, color: "#fff", width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🏛️</div>
          <div>
            <div style={{ fontSize: 21, fontWeight: "bold", color: "#fff" }}>Sarkari Exam Tracker</div>
            <div style={{ fontSize: 11, color: "#94a3b8", letterSpacing: 1.2 }}>B.A. ECONOMICS · LIVE GOVT JOB NAVIGATOR · DELHI</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, background: "#0a2a1a", border: "1px solid #22c55e44", borderRadius: 20, padding: "4px 12px" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block", boxShadow: "0 0 6px #22c55e", animation: "livepulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, letterSpacing: 0.8 }}>LIVE</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "7px 16px", borderRadius: 8, background: tab === t.key ? saffron : "transparent", color: tab === t.key ? "#fff" : "#94a3b8", border: tab === t.key ? "none" : "1px solid #334155", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600 }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 900, margin: "0 auto" }}>

        {/* Exams / Saved */}
        {(tab === "exams" || tab === "saved") && (
          <>
            {tab === "exams" && (
              <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search exam or tag..."
                  style={{ flex: 1, minWidth: 180, padding: "9px 14px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", fontFamily: "inherit", fontSize: 13, outline: "none" }} />
                <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ padding: "9px 12px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", fontFamily: "inherit", fontSize: 13 }}>
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
                <select value={diffFilter} onChange={e => setDiffFilter(e.target.value)} style={{ padding: "9px 12px", borderRadius: 8, background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", fontFamily: "inherit", fontSize: 13 }}>
                  {difficulties.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            )}
            {(tab === "exams" ? filtered : exams.filter(e => bookmarks.includes(e.id))).length === 0 && (
              <div style={{ textAlign: "center", color: "#64748b", padding: 40 }}>
                {tab === "saved" ? "No exams saved yet. Click 🔖 on any exam." : "No exams match your filters."}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(tab === "exams" ? filtered : exams.filter(e => bookmarks.includes(e.id))).map(exam => (
                <div key={exam.id} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "16px 18px", borderLeft: `4px solid ${bookmarks.includes(exam.id) ? saffron : accent}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: "bold", color: "#f1f5f9" }}>{exam.name}</span>
                        <DiffBadge level={exam.difficulty} />
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{exam.body} · {exam.category} · Notification: {exam.notifMonth}</div>
                      <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 10 }}>{exam.desc}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ background: "#0d1f35", border: "1px solid #1e40af44", color: "#60a5fa", borderRadius: 4, fontSize: 12, padding: "2px 10px" }}>💰 {exam.payScale}</span>
                        <span style={{ background: "#0d1f35", border: "1px solid #334155", color: "#94a3b8", borderRadius: 4, fontSize: 12, padding: "2px 10px" }}>🎓 {exam.eligibility}</span>
                        {exam.tags.map(t => <span key={t} style={{ background: "#0f2027", color: "#475569", borderRadius: 4, fontSize: 11, padding: "2px 7px", border: "1px solid #1e2d3d" }}>#{t}</span>)}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <button onClick={() => toggleBookmark(exam.id)} style={{ background: bookmarks.includes(exam.id) ? saffron + "22" : "#334155", border: `1px solid ${bookmarks.includes(exam.id) ? saffron : "#475569"}`, color: bookmarks.includes(exam.id) ? saffron : "#94a3b8", borderRadius: 8, width: 36, height: 36, cursor: "pointer", fontSize: 16 }}>🔖</button>
                      <a href={exam.link} target="_blank" rel="noopener noreferrer" style={{ background: accent + "22", border: `1px solid ${accent}44`, color: "#60a5fa", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, textDecoration: "none" }}>🔗</a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Live Feed */}
        {tab === "live" && (
          <LiveNotificationsTab
            saffron={saffron}
            savedLinks={savedNotifs.map(n => n.link)}
          />
        )}

        {/* AI Chat */}
        {tab === "ai" && (
          <div style={{ display: "flex", flexDirection: "column", height: "62vh" }}>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingBottom: 12 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "80%", padding: "12px 16px", borderRadius: 12, background: m.role === "user" ? `linear-gradient(135deg, ${accent}, #1e40af)` : "#1e293b", color: "#e2e8f0", fontSize: 14, lineHeight: 1.65, border: m.role === "assistant" ? "1px solid #334155" : "none", borderTopRightRadius: m.role === "user" ? 2 : 12, borderTopLeftRadius: m.role === "assistant" ? 2 : 12, whiteSpace: "pre-wrap" }}>
                    {m.role === "assistant" && <div style={{ fontSize: 11, color: saffron, fontWeight: 700, marginBottom: 5, letterSpacing: 1 }}>🤖 GEMINI AI COUNSELLOR</div>}
                    {m.content}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div style={{ display: "flex" }}>
                  <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, borderTopLeftRadius: 2, padding: "12px 16px", color: "#64748b", fontSize: 13 }}>Thinking…</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {["Which exam should I start with?", "RBI Grade B syllabus?", "UPSC vs RBI for me?", "Economics optional strategy?"].map(q => (
                <button key={q} onClick={() => setInput(q)} style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 20, fontSize: 11, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit" }}>{q}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Ask about any exam, syllabus, strategy…"
                style={{ flex: 1, padding: "12px 16px", borderRadius: 10, background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", fontFamily: "inherit", fontSize: 14, outline: "none" }} />
              <button onClick={sendMessage} disabled={aiLoading || !input.trim()} style={{ background: aiLoading ? "#334155" : saffron, color: "#fff", border: "none", borderRadius: 10, padding: "12px 20px", cursor: aiLoading ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 700 }}>Send ➤</button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 24, padding: "11px 15px", background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 8, fontSize: 12, color: "#475569", display: "flex", gap: 8 }}>
          <span>💡</span>
          <span>
            <b style={{ color: "#64748b" }}>🔴 Live Feed</b> pulls from SarkariResult RSS via a server-side Netlify proxy. <b style={{ color: "#64748b" }}>🤖 AI Counsellor</b> is powered by Gemini 2.0 Flash with Google Search grounding. Always verify on official websites before applying.
          </span>
        </div>
      </div>
      <style>{`@keyframes livepulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} } select option { background: #1e293b; }`}</style>
    </div>
  );
}
