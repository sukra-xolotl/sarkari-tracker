// netlify/functions/sarkari-proxy.js
export const handler = async () => {
  const RSS_SOURCES = [
    "https://www.govtjobsblog.in/feed",
    "https://indiajoblive.com/feed",
    "https://sarkarinaukriblog.com/feed",
  ];
  const TELEGRAM_API = process.env.TELEGRAM_SCRAPER_URL;

  // ── Fetch Telegram first ───────────────────────────────────────────────────
  let telegramItems = [];
  if (TELEGRAM_API) {
    try {
      const res = await fetch(`${TELEGRAM_API}/messages`, {
        signal: AbortSignal.timeout(8000), // 8s timeout
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          telegramItems = data.items;
        }
      }
    } catch (e) {
      console.error("Telegram fetch error:", e.message);
    }
  }

  // ── Fetch RSS ──────────────────────────────────────────────────────────────
  let xml = null;
  for (const url of RSS_SOURCES) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(6000),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/rss+xml, application/xml, text/xml, */*",
        },
      });
      if (res.ok) {
        const text = await res.text();
        if (text.includes("<item>")) { xml = text; break; }
      }
    } catch (_) { continue; }
  }

  // ── Parse RSS ──────────────────────────────────────────────────────────────
  const rssItems = [];
  if (xml) {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 5); // 5-day filter

      const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
      for (const match of itemMatches) {
        const block = match[1];
        const get = (tag) => {
          const m =
            block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`)) ||
            block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
          return m ? m[1].trim() : "";
        };

        const title   = get("title");
        const link    = get("link");
        const pubDate = get("pubDate");
        const desc    = get("description").replace(/<[^>]+>/g, "").slice(0, 200);

        if (!title) continue;

        const posted = pubDate ? new Date(pubDate) : null;
        if (posted && posted < cutoff) continue; // skip older than 5 days

        const t = title.toLowerCase();
        let type = "Other";
        if (t.includes("upsc") || t.includes("ias"))                                              type = "UPSC";
        else if (t.includes("ssc") || t.includes("cgl") || t.includes("chsl"))                   type = "SSC";
        else if (t.includes("bank") || t.includes("rbi") || t.includes("ibps") || t.includes("sbi")) type = "Banking";
        else if (t.includes("railway") || t.includes("rrb"))                                      type = "Railway";
        else if (t.includes("defence") || t.includes("army") || t.includes("navy"))               type = "Defence";
        else if (t.includes("teacher") || t.includes("ugc") || t.includes("net"))                 type = "Teaching";
        else if (t.includes("psc") || t.includes("state"))                                        type = "State PSC";

        const ageDays = posted ? (Date.now() - posted) / 86400000 : 999;
        let status = "Ongoing";
        if (ageDays < 3) status = "New";
        if (t.includes("last date") || t.includes("closing")) status = "Last Few Days";

        const lastDateMatch = (title + " " + desc).match(
          /last\s+date[:\s]+(\d{1,2}[\s\-\/]\w+[\s\-\/]\d{2,4})/i
        );

        rssItems.push({
          id:          link || title, // unique identifier
          title,
          link,
          body:        extractOrg(title),
          posts:       extractPosts(title),
          eligibility: extractEligibility(title + " " + desc),
          postedOn:    posted ? posted.toISOString().split("T")[0] : null,
          lastDate:    lastDateMatch ? lastDateMatch[1] : "Check notification",
          examDate:    null,
          formStart:   null,
          type,
          status,
          desc,
          source:      "RSS",
          fromTelegram: false,
        });

        if (rssItems.length >= 30) break;
      }
    } catch (e) {
      console.error("RSS parse error:", e.message);
    }
  }

  // ── Merge + deduplicate by title ───────────────────────────────────────────
  const seen = new Set();
  const allItems = [...telegramItems, ...rssItems].filter(item => {
    // Normalise title for dedup: lowercase, remove punctuation, trim
    const key = (item.title || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort newest first
  allItems.sort((a, b) => {
    if (!a.postedOn) return 1;
    if (!b.postedOn) return -1;
    return b.postedOn.localeCompare(a.postedOn);
  });

  // Cap at 50
  const items = allItems.slice(0, 50);

  if (items.length === 0) {
    return {
      statusCode: 502,
      body: JSON.stringify({ success: false, error: "All sources returned no data" }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      success:   true,
      items,
      fetchedAt: new Date().toISOString(),
      sources:   { rss: rssItems.length, telegram: telegramItems.length },
    }),
  };
};

function extractOrg(title) {
  const orgs = ["UPSC","SSC","IBPS","SBI","RBI","SEBI","NABARD","LIC","DSSSB","DRDO","ISRO","AIIMS","Railway"];
  for (const org of orgs) {
    if (title.toUpperCase().includes(org.toUpperCase())) return org;
  }
  const m = title.match(/^([A-Z][A-Za-z\s]+?)(?:\s+Recruitment|\s+Notification|\s+\d)/);
  return m ? m[1].trim() : "Government";
}

function extractPosts(title) {
  const n = title.match(/(\d[\d,]*)\s*(post|vacanc|seat)/i);
  if (n) return `${n[1]} ${n[2]}s`;
  const r = title.match(/(Officer|Inspector|Constable|Clerk|Engineer|Teacher|Assistant|Manager)/i);
  return r ? r[1] : "Various Posts";
}

function extractEligibility(text) {
  const t = text.toLowerCase();
  if (t.includes("10th") || t.includes("matriculation"))  return "10th Pass";
  if (t.includes("12th") || t.includes("intermediate"))   return "12th Pass";
  if (t.includes("b.tech") || t.includes("engineering"))  return "B.Tech";
  if (t.includes("graduate") || t.includes("degree"))     return "Any Graduate";
  if (t.includes("post graduate") || t.includes("msc"))   return "Post Graduate";
  return "See notification";
}