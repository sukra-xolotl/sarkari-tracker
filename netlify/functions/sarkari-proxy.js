// netlify/functions/sarkari-proxy.js
export const handler = async () => {
  const RSS_SOURCES = [
    "https://www.govtjobsblog.in/feed",
    "https://indiajoblive.com/feed",
    "https://sarkarinaukriblog.com/feed",
  ];

  let xml = null;

  for (const url of RSS_SOURCES) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
          Accept: "application/rss+xml, application/xml, text/xml, */*",
        },
      });
      if (res.ok) {
        const text = await res.text();
        if (text.includes("<item>")) { xml = text; break; }
      }
    } catch (_) { continue; }
  }

  if (!xml) {
    return {
      statusCode: 502,
      body: JSON.stringify({ success: false, error: "All RSS sources failed" }),
    };
  }

  try {
    const items = [];
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

      const t = title.toLowerCase();
      let type = "Other";
      if (t.includes("upsc") || t.includes("ias") || t.includes("ifs"))                        type = "UPSC";
      else if (t.includes("ssc") || t.includes("cgl") || t.includes("chsl"))                  type = "SSC";
      else if (t.includes("bank") || t.includes("rbi") || t.includes("ibps") ||
               t.includes("sbi") || t.includes("nabard") || t.includes("sebi"))               type = "Banking";
      else if (t.includes("railway") || t.includes("rrb") || t.includes("ntpc"))              type = "Railway";
      else if (t.includes("defence") || t.includes("army") || t.includes("navy") ||
               t.includes("air force") || t.includes("crpf") || t.includes("bsf"))            type = "Defence";
      else if (t.includes("teacher") || t.includes("ugc") || t.includes("net") ||
               t.includes("tet") || t.includes("ctet"))                                        type = "Teaching";
      else if (t.includes("psc") || t.includes("state"))                                       type = "State PSC";

      const posted  = pubDate ? new Date(pubDate) : null;
      const ageDays = posted ? (Date.now() - posted) / 86400000 : 999;
      let status = "Ongoing";
      if (ageDays < 3) status = "New";
      if (t.includes("last date") || t.includes("closing")) status = "Last Few Days";

      const lastDateMatch = (title + " " + desc).match(
        /last\s+date[:\s]+(\d{1,2}[\s\-\/]\w+[\s\-\/]\d{2,4})/i
      );

      items.push({
        title,
        link,
        body:        extractOrg(title),
        posts:       extractPosts(title),
        eligibility: extractEligibility(title + " " + desc),
        postedOn:    posted ? posted.toISOString().split("T")[0] : null,
        lastDate:    lastDateMatch ? lastDateMatch[1] : "Check notification",
        type,
        status,
        desc,
      });

      if (items.length >= 25) break;
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ success: true, items, fetchedAt: new Date().toISOString() }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};

function extractOrg(title) {
  const orgs = ["UPSC","SSC","IBPS","SBI","RBI","SEBI","NABARD","LIC","DSSSB","DRDO","ISRO","NHM","AIIMS","ESIC","Railway","High Court"];
  for (const org of orgs) {
    if (title.toUpperCase().includes(org.toUpperCase())) return org;
  }
  const m = title.match(/^([A-Z][A-Za-z\s]+?)(?:\s+Recruitment|\s+Notification|\s+\d)/);
  return m ? m[1].trim() : "Government";
}

function extractPosts(title) {
  const numMatch = title.match(/(\d[\d,]*)\s*(post|vacanc|seat)/i);
  if (numMatch) return `${numMatch[1]} ${numMatch[2]}s`;
  const roleMatch = title.match(/(Officer|Inspector|Constable|Clerk|Engineer|Teacher|Assistant|Manager|Analyst)/i);
  return roleMatch ? roleMatch[1] : "Various Posts";
}

function extractEligibility(text) {
  const t = text.toLowerCase();
  if (t.includes("10th") || t.includes("matriculation"))                         return "10th Pass";
  if (t.includes("12th") || t.includes("intermediate"))                          return "12th Pass";
  if (t.includes("b.tech") || t.includes("engineering"))                         return "B.Tech/Engineering";
  if (t.includes("graduate") || t.includes("degree") || t.includes("b.a") || t.includes("b.sc")) return "Any Graduate";
  if (t.includes("post graduate") || t.includes("m.a") || t.includes("msc"))    return "Post Graduate";
  return "See notification";
}