// ═══════════════════════════════════════════════════════════
// 🔥 FLINT — Job Scraper
// Runs in GitHub Actions every 8 hours
// Sources: LinkedIn, Adzuna, Apify, Greenhouse, Lever,
//          Ashby, Workable, HackerNews, Naukri
// ═══════════════════════════════════════════════════════════

const { chromium } = require("playwright");

// ── Env vars (from GitHub Secrets) ──
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADZUNA_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_KEY = process.env.ADZUNA_APP_KEY;
const APIFY_TOKEN = process.env.APIFY_TOKEN;

// ── Search config ──
const SEARCH_QUERIES = [
  "Site Reliability Engineer",
  "Platform Engineer",
  "Cloud Engineer",
  "DevSecOps Engineer",
  "Security Engineer",
  "DevOps Engineer",
  "Infrastructure Engineer",
  "Cloud Security Engineer",
  "SRE",
  "Production Engineer",
];

const ADZUNA_COUNTRIES = ["in", "gb", "de", "fr", "us", "ca", "au", "pl", "at", "nz"];

// ── Role keyword filter (for board scraping) ──
const ROLE_REGEX =
  /\b(sre|site.?reliab|platform|infra|devops|devsecops|cloud|secur|production.?eng|reliability)/i;

// ═══════════════════════════════════════════════════════════
// GREENHOUSE BOARDS
// API: https://boards-api.greenhouse.io/v1/boards/{slug}/jobs
// To find a company's slug, try the URL above with their name
// ═══════════════════════════════════════════════════════════
const GREENHOUSE_BOARDS = [
  // Global tech
  { slug: "cloudflare", name: "Cloudflare" },
  { slug: "datadog", name: "Datadog" },
  { slug: "gitlab", name: "GitLab" },
  { slug: "grafanalabs", name: "Grafana Labs" },
  { slug: "elastic", name: "Elastic" },
  { slug: "cockroachlabs", name: "CockroachDB" },
  { slug: "hashicorp", name: "HashiCorp" },
  { slug: "snaborern", name: "Snyk" },
  { slug: "mongodb", name: "MongoDB" },
  { slug: "confluent", name: "Confluent" },
  { slug: "aaborern", name: "Aiven" },
  { slug: "planetscale", name: "PlanetScale" },
  { slug: "timescale", name: "Timescale" },
  { slug: "tailscale", name: "Tailscale" },
  { slug: "fly", name: "Fly.io" },
  { slug: "render", name: "Render" },
  { slug: "postman", name: "Postman" },
  { slug: "sentry", name: "Sentry" },
  { slug: "laaborern", name: "LaunchDarkly" },
  { slug: "pagerduty", name: "PagerDuty" },
  { slug: "newrelic", name: "New Relic" },
  { slug: "circleci", name: "CircleCI" },
  { slug: "yugabyte", name: "YugabyteDB" },
  { slug: "cncf", name: "CNCF" },
  // Indian companies on Greenhouse
  { slug: "razorpay", name: "Razorpay" },
  { slug: "meesho", name: "Meesho" },
  { slug: "caborern", name: "CRED" },
  { slug: "groww", name: "Groww" },
  { slug: "gojek", name: "GoJek" },
];

// ═══════════════════════════════════════════════════════════
// LEVER BOARDS
// API: https://api.lever.co/v0/postings/{slug}?mode=json
// ═══════════════════════════════════════════════════════════
const LEVER_BOARDS = [
  { slug: "vercel", name: "Vercel" },
  { slug: "neondb", name: "Neon" },
  { slug: "temporal", name: "Temporal" },
  { slug: "supabase", name: "Supabase" },
  { slug: "netlify", name: "Netlify" },
  { slug: "prisma", name: "Prisma" },
  { slug: "denoland", name: "Deno" },
  { slug: "upstash", name: "Upstash" },
  { slug: "bitwarden", name: "Bitwarden" },
];

// ═══════════════════════════════════════════════════════════
// ASHBY BOARDS
// API: https://api.ashbyhq.com/posting-api/job-board/{slug}
// ═══════════════════════════════════════════════════════════
const ASHBY_BOARDS = [
  { slug: "notion", name: "Notion" },
  { slug: "ramp", name: "Ramp" },
  { slug: "linear", name: "Linear" },
  { slug: "anthropic", name: "Anthropic" },
  { slug: "openai", name: "OpenAI" },
  { slug: "mistral", name: "Mistral AI" },
  { slug: "perplexity", name: "Perplexity" },
  { slug: "replicate", name: "Replicate" },
  { slug: "resend", name: "Resend" },
];

// ═══════════════════════════════════════════════════════════
// WORKABLE BOARDS
// API: https://apply.workable.com/api/v1/widget/accounts/{slug}
// ═══════════════════════════════════════════════════════════
const WORKABLE_BOARDS = [
  { slug: "zerodha", name: "Zerodha" },
  { slug: "phonepe", name: "PhonePe" },
  { slug: "swiggy", name: "Swiggy" },
  { slug: "freshworks", name: "Freshworks" },
  { slug: "zoho", name: "Zoho" },
  { slug: "browserstack", name: "BrowserStack" },
  { slug: "moengage", name: "MoEngage" },
];

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function categorize(title) {
  const t = title.toLowerCase();
  if (/sre|site.?reliab/.test(t)) return "SRE";
  if (/platform/.test(t)) return "Platform";
  if (/devsecops|appsec/.test(t)) return "DevSecOps";
  if (/secur/.test(t)) return "Security";
  if (/devops/.test(t)) return "DevOps";
  if (/infra/.test(t)) return "Infrastructure";
  if (/cloud/.test(t)) return "Cloud";
  if (/production.?eng/.test(t)) return "SRE";
  return "Engineering";
}

function detectCountry(loc) {
  const l = (loc || "").toLowerCase();
  if (/india|bengal|mumbai|delhi|hyderab|pune|chennai|gurgaon|noida|kolkata/.test(l)) return "in";
  if (/\buk\b|london|england|manchester|bristol|edinburgh|cambridge/.test(l)) return "gb";
  if (/germany|berlin|munich|frankfurt|hamburg/.test(l)) return "de";
  if (/france|paris|lyon/.test(l)) return "fr";
  if (/\bus\b|\busa\b|new york|san francisco|seattle|austin|boston|chicago/.test(l)) return "us";
  if (/canada|toronto|vancouver|montreal/.test(l)) return "ca";
  if (/australia|sydney|melbourne/.test(l)) return "au";
  if (/ireland|dublin/.test(l)) return "ie";
  if (/singapore/.test(l)) return "sg";
  if (/remote|worldwide|anywhere/.test(l)) return "remote";
  return "other";
}

function stripHtml(html) {
  return (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}

function makeId(prefix, ...parts) {
  const raw = parts.join("-").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30);
  return `${prefix}-${raw}-${Date.now().toString(36).slice(-4)}`;
}

function today() {
  return new Date().toISOString().split("T")[0];
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Supabase upsert ──
async function upsertJobs(jobs) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log("  ⚠ No Supabase creds — skipping DB write");
    return;
  }
  for (let i = 0; i < jobs.length; i += 50) {
    const batch = jobs.slice(i, i + 50);
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/jobs`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify(batch),
      });
      if (!r.ok) console.error("  DB error:", (await r.text()).slice(0, 200));
      else console.log(`  ✓ Upserted batch ${i / 50 + 1} (${batch.length} jobs)`);
    } catch (e) {
      console.error("  DB error:", e.message);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// SOURCE 1: LINKEDIN (Playwright — public guest pages)
// ═══════════════════════════════════════════════════════════

async function scrapeLinkedIn(browser) {
  console.log("\n🔗 [LinkedIn] Scraping public job listings...");
  const all = [];

  for (const query of SEARCH_QUERIES.slice(0, 5)) {
    try {
      const page = await browser.newPage({
        userAgent:
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      });
      const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&f_TPR=r604800&position=1&pageNum=0`;

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await sleep(2000);

      // Scroll to load more results
      for (let i = 0; i < 4; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await sleep(1500);
      }

      const jobs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll(".base-card"))
          .slice(0, 20)
          .map((c) => ({
            title: c.querySelector(".base-search-card__title")?.textContent?.trim() || "",
            company: c.querySelector(".base-search-card__subtitle")?.textContent?.trim() || "",
            location: c.querySelector(".job-search-card__location")?.textContent?.trim() || "",
            url: c.querySelector("a")?.href || "",
            posted: c.querySelector("time")?.getAttribute("datetime") || "",
          }))
          .filter((j) => j.title);
      });

      for (const j of jobs) {
        all.push({
          id: makeId("li", j.title, j.company),
          title: j.title,
          company: j.company,
          location: j.location,
          country: detectCountry(j.location),
          description: "",
          url: j.url.split("?")[0],
          salary: "—",
          source: "LinkedIn",
          posted: j.posted || today(),
          category: categorize(j.title),
          remote: /remote/i.test(j.location),
        });
      }

      await page.close();
      console.log(`  ✓ "${query}" → ${jobs.length} jobs`);
      await sleep(3000); // Rate limit courtesy
    } catch (e) {
      console.error(`  ✗ "${query}": ${e.message}`);
    }
  }

  return all;
}

// ═══════════════════════════════════════════════════════════
// SOURCE 2: APIFY (LinkedIn fallback — more reliable)
// ═══════════════════════════════════════════════════════════

async function scrapeApify() {
  if (!APIFY_TOKEN) {
    console.log("\n⏭  [Apify] No token, skipping");
    return [];
  }

  console.log("\n🤖 [Apify] Fetching LinkedIn jobs via actor...");
  const all = [];
  const locations = ["India", "United Kingdom", "Germany", "Remote"];

  for (const loc of locations) {
    for (const query of SEARCH_QUERIES.slice(0, 3)) {
      try {
        const input = {
          searchUrl: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(loc)}&f_TPR=r604800`,
          maxItems: 15,
          proxy: { useApifyProxy: true },
        };

        const r = await fetch(
          `https://api.apify.com/v2/acts/harvestapi~linkedin-job-search/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=60`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          }
        );

        if (!r.ok) {
          console.error(`  ✗ Apify ${query}/${loc}: HTTP ${r.status}`);
          continue;
        }

        const data = await r.json();
        for (const j of data || []) {
          const title = j.title || j.jobTitle || "";
          const company = j.company || j.companyName || "";
          if (!title) continue;

          all.push({
            id: makeId("ap", title, company),
            title,
            company,
            location: j.location || j.jobLocation || loc,
            country: detectCountry(j.location || loc),
            description: (j.description || j.jobDescription || "").slice(0, 2000),
            url: j.url || j.jobUrl || j.link || "",
            salary: j.salary || "—",
            source: "LinkedIn",
            posted: j.postedAt || j.publishedAt || today(),
            category: categorize(title),
            remote: /remote/i.test(j.location || ""),
          });
        }

        console.log(`  ✓ "${query}" / ${loc} → ${(data || []).length} jobs`);
        await sleep(2000);
      } catch (e) {
        console.error(`  ✗ Apify ${query}/${loc}: ${e.message}`);
      }
    }
  }

  return all;
}

// ═══════════════════════════════════════════════════════════
// SOURCE 3: ADZUNA API
// ═══════════════════════════════════════════════════════════

async function scrapeAdzuna() {
  if (!ADZUNA_ID || !ADZUNA_KEY) {
    console.log("\n⏭  [Adzuna] No API keys, skipping");
    return [];
  }

  console.log("\n📊 [Adzuna] Fetching across", ADZUNA_COUNTRIES.length, "countries...");
  const all = [];

  for (const query of SEARCH_QUERIES.slice(0, 6)) {
    for (const cc of ADZUNA_COUNTRIES) {
      try {
        const url = `https://api.adzuna.com/v1/api/jobs/${cc}/search/1?app_id=${ADZUNA_ID}&app_key=${ADZUNA_KEY}&results_per_page=15&what=${encodeURIComponent(query)}&max_days_old=7&content-type=application/json`;
        const r = await fetch(url);
        if (!r.ok) continue;
        const data = await r.json();

        for (const j of data.results || []) {
          all.push({
            id: `az-${j.id}`,
            title: j.title,
            company: j.company?.display_name || "—",
            location: j.location?.display_name || cc.toUpperCase(),
            country: cc,
            description: (j.description || "").slice(0, 2000),
            url: j.redirect_url || "",
            salary: j.salary_min
              ? `${Math.round(j.salary_min).toLocaleString()}`
              : "—",
            source: "Adzuna",
            posted: j.created ? j.created.split("T")[0] : today(),
            category: categorize(j.title),
            remote: /remote/i.test(j.title) || /remote/i.test(j.description || ""),
          });
        }
      } catch {}
    }
    console.log(`  ✓ "${query}" done`);
  }

  return all;
}

// ═══════════════════════════════════════════════════════════
// SOURCE 4: GREENHOUSE
// ═══════════════════════════════════════════════════════════

async function scrapeGreenhouse() {
  console.log("\n🌿 [Greenhouse] Fetching", GREENHOUSE_BOARDS.length, "boards...");
  const all = [];

  for (const board of GREENHOUSE_BOARDS) {
    try {
      const r = await fetch(
        `https://boards-api.greenhouse.io/v1/boards/${board.slug}/jobs`
      );
      if (!r.ok) {
        console.log(`  · ${board.name}: not found (${r.status})`);
        continue;
      }
      const data = await r.json();
      let count = 0;

      for (const j of data.jobs || []) {
        if (!ROLE_REGEX.test(j.title)) continue;
        const loc = j.location?.name || "Unknown";
        count++;

        all.push({
          id: `gh-${j.id}`,
          title: j.title,
          company: board.name,
          location: loc,
          country: detectCountry(loc),
          description: stripHtml(j.content || ""),
          url: j.absolute_url || "",
          salary: "—",
          source: "Greenhouse",
          posted: j.updated_at ? j.updated_at.split("T")[0] : today(),
          category: categorize(j.title),
          remote: /remote/i.test(loc),
        });
      }

      if (count > 0) console.log(`  ✓ ${board.name} → ${count} matching`);
    } catch (e) {
      console.error(`  ✗ ${board.name}: ${e.message}`);
    }
  }

  return all;
}

// ═══════════════════════════════════════════════════════════
// SOURCE 5: LEVER
// ═══════════════════════════════════════════════════════════

async function scrapeLever() {
  console.log("\n🔧 [Lever] Fetching", LEVER_BOARDS.length, "boards...");
  const all = [];

  for (const board of LEVER_BOARDS) {
    try {
      const r = await fetch(
        `https://api.lever.co/v0/postings/${board.slug}?mode=json`
      );
      if (!r.ok) continue;
      const data = await r.json();
      let count = 0;

      for (const j of data) {
        if (!ROLE_REGEX.test(j.text)) continue;
        const loc = j.categories?.location || "Unknown";
        count++;

        all.push({
          id: `lv-${j.id}`,
          title: j.text,
          company: board.name,
          location: loc,
          country: detectCountry(loc),
          description: stripHtml(j.descriptionPlain || j.description || ""),
          url: j.hostedUrl || "",
          salary: "—",
          source: "Lever",
          posted: j.createdAt
            ? new Date(j.createdAt).toISOString().split("T")[0]
            : today(),
          category: categorize(j.text),
          remote: /remote/i.test(loc),
        });
      }

      if (count > 0) console.log(`  ✓ ${board.name} → ${count} matching`);
    } catch (e) {
      console.error(`  ✗ ${board.name}: ${e.message}`);
    }
  }

  return all;
}

// ═══════════════════════════════════════════════════════════
// SOURCE 6: ASHBY
// ═══════════════════════════════════════════════════════════

async function scrapeAshby() {
  console.log("\n🟣 [Ashby] Fetching", ASHBY_BOARDS.length, "boards...");
  const all = [];

  for (const board of ASHBY_BOARDS) {
    try {
      const r = await fetch(
        `https://api.ashbyhq.com/posting-api/job-board/${board.slug}`
      );
      if (!r.ok) continue;
      const data = await r.json();
      let count = 0;

      for (const j of data.jobs || []) {
        if (!ROLE_REGEX.test(j.title)) continue;
        const loc = j.location || j.locationName || "Unknown";
        count++;

        all.push({
          id: `ab-${j.id}`,
          title: j.title,
          company: board.name,
          location: loc,
          country: detectCountry(loc),
          description: stripHtml(j.descriptionHtml || j.description || ""),
          url: j.jobUrl || j.applyUrl || "",
          salary: "—",
          source: "Ashby",
          posted: j.publishedAt
            ? new Date(j.publishedAt).toISOString().split("T")[0]
            : today(),
          category: categorize(j.title),
          remote: /remote/i.test(loc) || j.isRemote === true,
        });
      }

      if (count > 0) console.log(`  ✓ ${board.name} → ${count} matching`);
    } catch (e) {
      console.error(`  ✗ ${board.name}: ${e.message}`);
    }
  }

  return all;
}

// ═══════════════════════════════════════════════════════════
// SOURCE 7: WORKABLE
// ═══════════════════════════════════════════════════════════

async function scrapeWorkable() {
  console.log("\n💼 [Workable] Fetching", WORKABLE_BOARDS.length, "boards...");
  const all = [];

  for (const board of WORKABLE_BOARDS) {
    try {
      const r = await fetch(
        `https://apply.workable.com/api/v1/widget/accounts/${board.slug}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: "",
            query: "",
            location: [],
            department: [],
            worktype: [],
            remote: [],
          }),
        }
      );
      if (!r.ok) continue;
      const data = await r.json();
      let count = 0;

      for (const j of data.results || []) {
        if (!ROLE_REGEX.test(j.title)) continue;
        const loc = [j.city, j.state, j.country].filter(Boolean).join(", ");
        count++;

        all.push({
          id: `wk-${j.shortcode || j.id}`,
          title: j.title,
          company: board.name,
          location: loc || "Unknown",
          country: detectCountry(loc),
          description: stripHtml(j.description || ""),
          url: `https://apply.workable.com/${board.slug}/j/${j.shortcode}/`,
          salary: "—",
          source: "Workable",
          posted: j.published
            ? new Date(j.published).toISOString().split("T")[0]
            : today(),
          category: categorize(j.title),
          remote: j.telecommuting === true || /remote/i.test(loc),
        });
      }

      if (count > 0) console.log(`  ✓ ${board.name} → ${count} matching`);
    } catch (e) {
      console.error(`  ✗ ${board.name}: ${e.message}`);
    }
  }

  return all;
}

// ═══════════════════════════════════════════════════════════
// SOURCE 8: HACKER NEWS — Who's Hiring (monthly thread)
// ═══════════════════════════════════════════════════════════

async function scrapeHackerNews() {
  console.log("\n🟧 [HackerNews] Fetching Who's Hiring thread...");
  const all = [];

  try {
    // Find the latest "Who is hiring?" thread
    const searchUrl =
      "https://hn.algolia.com/api/v1/search?query=who%20is%20hiring&tags=story,ask_hn&numericFilters=created_at_i>" +
      Math.floor(Date.now() / 1000 - 35 * 86400); // Last 35 days

    const r = await fetch(searchUrl);
    if (!r.ok) throw new Error(`Algolia ${r.status}`);
    const data = await r.json();

    const thread = data.hits?.find(
      (h) => /who is hiring/i.test(h.title) && h.num_comments > 50
    );
    if (!thread) {
      console.log("  · No recent hiring thread found");
      return [];
    }

    console.log(`  · Found thread: "${thread.title}" (${thread.num_comments} comments)`);

    // Fetch top-level comments (job postings)
    const commentsUrl = `https://hn.algolia.com/api/v1/search?tags=comment,story_${thread.objectID}&hitsPerPage=200`;
    const cr = await fetch(commentsUrl);
    if (!cr.ok) throw new Error(`Comments ${cr.status}`);
    const comments = await cr.json();

    for (const c of comments.hits || []) {
      const text = c.comment_text || "";
      if (!ROLE_REGEX.test(text)) continue;

      // Extract company name (usually first line)
      const firstLine = stripHtml(text).split(/[|\n]/)[0].trim();
      const company = firstLine.slice(0, 60);

      // Extract location
      const locMatch = text.match(
        /(?:location|based in|office in)[:\s]+([^<|\n]+)/i
      );
      const location = locMatch ? locMatch[1].trim().slice(0, 60) : "Various";

      // Extract URL
      const urlMatch = text.match(/href="(https?:\/\/[^"]+)"/);
      const url = urlMatch ? urlMatch[1] : `https://news.ycombinator.com/item?id=${c.objectID}`;

      const isRemote = /remote/i.test(text);

      all.push({
        id: `hn-${c.objectID}`,
        title: `${categorize(text)} Engineer`,
        company: company || "HN Listing",
        location: isRemote ? "Remote" : location,
        country: detectCountry(location),
        description: stripHtml(text).slice(0, 2000),
        url,
        salary: "—",
        source: "HackerNews",
        posted: c.created_at ? c.created_at.split("T")[0] : today(),
        category: categorize(text),
        remote: isRemote,
      });
    }

    console.log(`  ✓ ${all.length} matching jobs from thread`);
  } catch (e) {
    console.error(`  ✗ HN: ${e.message}`);
  }

  return all;
}

// ═══════════════════════════════════════════════════════════
// SOURCE 9: NAUKRI (Playwright — India-specific)
// ═══════════════════════════════════════════════════════════

async function scrapeNaukri(browser) {
  console.log("\n🇮🇳 [Naukri] Scraping Indian job listings...");
  const all = [];
  const queries = ["SRE", "DevOps Engineer", "Cloud Engineer", "Platform Engineer"];

  for (const query of queries) {
    try {
      const page = await browser.newPage({
        userAgent:
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      });

      const url = `https://www.naukri.com/${query.toLowerCase().replace(/\s+/g, "-")}-jobs?k=${encodeURIComponent(query)}&experience=4&jobAge=7`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await sleep(3000);

      const jobs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll(".srp-jobtuple-wrapper, article.jobTuple"))
          .slice(0, 15)
          .map((c) => ({
            title: (c.querySelector(".title, .row1 a, a.title")?.textContent || "").trim(),
            company: (c.querySelector(".comp-name, .subTitle a, .companyInfo a")?.textContent || "").trim(),
            location: (c.querySelector(".loc-wrap .locWdth, .location .loc, .locWdth")?.textContent || "").trim(),
            url: c.querySelector("a.title, .row1 a, a")?.href || "",
            salary: (c.querySelector(".sal-wrap .salary, .ni-job-tuple-icon-srp-rupee + span")?.textContent || "").trim(),
          }))
          .filter((j) => j.title);
      });

      for (const j of jobs) {
        all.push({
          id: makeId("nk", j.title, j.company),
          title: j.title,
          company: j.company,
          location: j.location || "India",
          country: "in",
          description: "",
          url: j.url,
          salary: j.salary || "—",
          source: "Naukri",
          posted: today(),
          category: categorize(j.title),
          remote: /remote/i.test(j.location),
        });
      }

      await page.close();
      console.log(`  ✓ "${query}" → ${jobs.length} jobs`);
      await sleep(3000);
    } catch (e) {
      console.error(`  ✗ "${query}": ${e.message}`);
    }
  }

  return all;
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
  const start = Date.now();
  console.log("═".repeat(56));
  console.log("🔥 FLINT Scraper — Starting job collection");
  console.log(`   ${new Date().toISOString()}`);
  console.log("═".repeat(56));

  const browser = await chromium.launch({ headless: true });

  // Run all API-based scrapers in parallel, browser-based sequentially
  const [adzuna, greenhouse, lever, ashby, workable, hn, apify] =
    await Promise.allSettled([
      scrapeAdzuna(),
      scrapeGreenhouse(),
      scrapeLever(),
      scrapeAshby(),
      scrapeWorkable(),
      scrapeHackerNews(),
      scrapeApify(),
    ]);

  // Browser-based scrapers (sequential to avoid rate limits)
  const linkedin = await scrapeLinkedIn(browser).catch(() => []);
  const naukri = await scrapeNaukri(browser).catch(() => []);

  await browser.close();

  // Collect all results
  let allJobs = [];
  const sources = { adzuna, greenhouse, lever, ashby, workable, hn, apify };
  for (const [name, result] of Object.entries(sources)) {
    if (result.status === "fulfilled" && result.value?.length) {
      allJobs.push(...result.value);
      console.log(`\n  📦 ${name}: ${result.value.length} jobs`);
    }
  }
  allJobs.push(...(linkedin || []), ...(naukri || []));
  console.log(`  📦 linkedin: ${(linkedin || []).length} jobs`);
  console.log(`  📦 naukri: ${(naukri || []).length} jobs`);

  // Deduplicate by normalized title+company
  const seen = new Set();
  allJobs = allJobs.filter((j) => {
    const key = `${j.title}-${j.company}`.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log("\n" + "═".repeat(56));
  console.log(`📊 Total unique jobs: ${allJobs.length}`);
  console.log("═".repeat(56));

  // Write to Supabase
  await upsertJobs(allJobs);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n✅ Done in ${elapsed}s`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});