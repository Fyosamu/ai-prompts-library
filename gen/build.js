#!/usr/bin/env node
/*
 * Build the static site for the free prompt library.
 *
 *   node gen/build.js
 *
 * Reads README.md (the contents table) plus the ten topic files, and emits a
 * dependency-free site at the repository root: an index that lists every
 * category, one page per category with all eighteen prompts rendered out of
 * their fences, robots.txt, sitemap.xml and llms.txt. No markdown library, no
 * bundler — the parser below knows exactly the two shapes this repository uses
 * and nothing else.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BASE = "https://fyosamu.github.io/ai-prompts-library";
const STORE = "https://www.getly.store/store/dreamer-prompt-lab-muifdken";
const PREVIEW = "https://dreamerpromptlab.getly.page";
const SHOP = "https://fyosamu.github.io/fashion-store/";
const PRICING = "https://fyosamu.github.io/pricing/";
const TOTAL = 180;

/* ---------------------------------------------------------------- helpers */

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* README's contents table is the single source of truth for which categories
   exist, how many prompts each holds and which keywords it should rank for. */
function readCategories() {
  const md = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
  const row = /^\|\s*\[([^\]]+)\]\((\w+)\.md\)\s*\|\s*(\d+)\s*\|\s*([^|]+)\|/gm;
  const out = [];
  let m;
  while ((m = row.exec(md))) {
    out.push({ title: m[1].trim(), slug: m[2], count: +m[3], keys: m[4].trim() });
  }
  if (!out.length) throw new Error("README contents table parsed to zero categories");
  return out;
}

/* Each topic file is:  # title,  > blockquote,  housekeeping lines,  then a
   run of `## n. Name` headers each owning one ```text fence. */
function readCategory(slug) {
  const md = fs.readFileSync(path.join(ROOT, slug + ".md"), "utf8");
  const lines = md.split("\n");

  const title = ((md.match(/^# (.+)$/m) || [])[1] || "").trim();

  const quote = [];
  for (const l of lines) {
    if (l.startsWith(">")) quote.push(l.replace(/^>\s?/, "").trim());
    else if (quote.length) break;
  }

  const heads = [];
  const re = /^##\s+(\d+)\.\s+(.+)$/gm;
  let m;
  while ((m = re.exec(md))) heads.push({ n: +m[1], title: m[2].trim(), at: m.index, end: re.lastIndex });

  const prompts = heads.map((h, i) => {
    const seg = md.slice(h.end, i + 1 < heads.length ? heads[i + 1].at : md.length);
    const fence = seg.match(/```[a-z]*\n([\s\S]*?)```/);
    return { n: h.n, title: h.title, body: (fence ? fence[1] : seg).replace(/\s+$/, "") };
  });

  return { slug, title, quote, prompts };
}

/* ------------------------------------------------------------------- head */

function jsonld(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;
}

function head(title, desc, canonical, extraLd) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Dreamer Prompt Lab">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230b0d12'/%3E%3Cpath d='M10 11l-4 5 4 5M22 11l4 5-4 5M18 9l-4 14' stroke='%237dd3a0' stroke-width='2.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E">
<link rel="stylesheet" href="assets/style.css">
${extraLd}
</head>`;
}

const header = `<header class="top">
  <a class="brand" href="./"><span class="glyph">&lt;/&gt;</span> Dreamer Prompt Lab</a>
  <nav>
    <a href="./#categories">All categories</a>
    <a href="${PRICING}" target="_blank" rel="noopener">Work with us</a>
    <a class="cta" href="${STORE}" target="_blank" rel="noopener">Get all ${TOTAL.toLocaleString("en-US")}</a>
  </nav>
</header>`;

const footer = `<footer class="foot">
  <div class="cols">
    <div>
      <h3>The free library</h3>
      <p>${TOTAL} copy-paste prompts across ten categories. No signup, no email, no account. Everything on this site is free to use in your own work, personal or commercial.</p>
    </div>
    <div>
      <h3>The full set</h3>
      <ul>
        <li><a href="${STORE}" target="_blank" rel="noopener">Dreamer Prompt Lab store</a> — 10,481 prompts, from $4.99</li>
        <li><a href="${PREVIEW}" target="_blank" rel="noopener">Free preview of the full catalogue</a></li>
        <li>USDT (BEP-20) or card · instant ZIP · one-time, no subscription</li>
      </ul>
    </div>
    <div>
      <h3>Also from dazo</h3>
      <ul>
        <li><a href="${SHOP}" target="_blank" rel="noopener">150 clothing store templates</a> — static HTML, paid in USDT</li>
        <li><a href="${PRICING}" target="_blank" rel="noopener">Websites, apps and automation</a> — fixed prices published</li>
      </ul>
    </div>
  </div>
  <div class="badges">
    <a href="https://www.neura.market/directories/ai-tools" title="Featured on Neura Market — the AI tools & companies directory" target="_blank" rel="noopener" data-neura-market-badge="tool">
      <img src="https://ykpiumpcqlgqzgslxicn.supabase.co/storage/v1/object/public/brand-assets/featured-badge.png" alt="Featured on Neura Market" width="240" height="80" loading="lazy" style="max-width:100%;height:auto;border-radius:8px;" />
    </a>
  </div>
  <p class="fine">Prompts are free to use and to build on. Please don't resell this collection as-is.</p>
</footer>
</body>
</html>
`;

/* ------------------------------------------------------------------ index */

function renderIndex(cats) {
  const list = cats
    .map(
      (c) => `      <li>
        <a href="${c.slug}.html">
          <span class="ct">${esc(c.title)}</span>
          <span class="ck">${esc(c.keys)}</span>
          <span class="cn">${c.count} free prompts</span>
        </a>
      </li>`
    )
    .join("\n");

  const desc = `${TOTAL} free copy-paste AI prompts for ChatGPT, Claude, Gemini and Midjourney — resumes, Etsy and Amazon listings, SaaS positioning, real estate, food, fashion, fitness and video scripts. No signup, no email.`;

  return `${head(`Free AI Prompts — ${TOTAL} copy-paste prompts for ChatGPT, Claude & Gemini`, desc, `${BASE}/`, jsonld([
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Dreamer Prompt Lab — Free AI Prompts",
      url: `${BASE}/`,
      description: desc,
      inLanguage: "en",
      isAccessibleForFree: true,
      potentialAction: {
        "@type": "SearchAction",
        target: `${BASE}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Free AI prompt categories (${TOTAL} prompts)`,
      numberOfItems: cats.length,
      itemListElement: cats.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.title,
        url: `${BASE}/${c.slug}.html`,
      })),
    },
  ]))}
<body>
${header}
<main>
  <section class="hero">
    <p class="eyebrow">Free · no signup · no email</p>
    <h1>${TOTAL} AI prompts you can paste straight into ChatGPT</h1>
    <p class="lede">Tested prompts for business, marketing and content — each one states the word limit and the rules the target platform actually enforces, so the output comes back usable instead of needing a rewrite.</p>
    <div class="btns">
      <a class="primary" href="#categories">Browse the ${cats.length} categories</a>
      <a class="ghost" href="${STORE}" target="_blank" rel="noopener">Get all ${TOTAL.toLocaleString("en-US")} prompts</a>
    </div>
    <dl class="stats">
      <div><dt>${TOTAL}</dt><dd>free prompts</dd></div>
      <div><dt>${cats.length}</dt><dd>categories</dd></div>
      <div><dt>4</dt><dd>models: GPT, Claude, Gemini, Midjourney</dd></div>
      <div><dt>$0</dt><dd>to use any of them</dd></div>
    </dl>
  </section>

  <section id="categories">
    <h2>Every category</h2>
    <p class="sec">Each page holds its whole set — open one, copy what you need, replace the <code>[BRACKETS]</code>.</p>
    <ul class="grid">
${list}
    </ul>
  </section>

  <section class="how">
    <h2>How to use them</h2>
    <ol>
      <li><strong>Open a category.</strong> Every prompt is in its own copyable block.</li>
      <li><strong>Replace every <code>[BRACKET]</code></strong> with your own details.</li>
      <li><strong>Paste the whole block</strong> into ChatGPT, Claude or Gemini.</li>
      <li><strong>Keep what works.</strong> These are free for personal or commercial use.</li>
    </ol>
    <h2>Why these aren't the usual filler</h2>
    <ul class="why">
      <li><strong>Tested, not scraped.</strong> Each prompt carries a word limit, a structure and the rules its output must obey.</li>
      <li><strong>Platform-aware.</strong> Etsy titles are held to 140 characters, Amazon to 200, resumes to 450 words — the prompts enforce the real limits.</li>
      <li><strong>Narrow, not generic.</strong> A resume prompt is not "write me a resume": it specifies ATS rules, standard headings, and no tables or images.</li>
    </ul>
  </section>
</main>
${footer}`;
}

/* --------------------------------------------------------------- category */

function renderCategory(cat, meta) {
  const blocks = cat.prompts
    .map(
      (p) => `      <article class="prompt" id="p${p.n}">
        <h2><span class="n">${String(p.n).padStart(2, "0")}</span> ${esc(p.title)}</h2>
        <pre><code>${esc(p.body)}</code></pre>
        <button type="button" class="copy" data-copy>Copy prompt</button>
      </article>`
    )
    .join("\n");

  const desc = `${cat.quote.join(" ").replace(/\*\*/g, "").slice(0, 165)} Free to copy and use — ${cat.prompts.length} prompts on this page, ${TOTAL} across the library.`;

  const siblings = readCategories()
    .filter((c) => c.slug !== cat.slug)
    .map((c) => `<li><a href="${c.slug}.html">${esc(c.title)}</a> <span>(${c.count})</span></li>`)
    .join("\n");

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: cat.title,
      url: `${BASE}/${cat.slug}.html`,
      description: desc,
      inLanguage: "en",
      isAccessibleForFree: true,
      numberOfItems: cat.prompts.length,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: cat.prompts.length,
        itemListElement: cat.prompts.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: `${p.n}. ${p.title}`,
          url: `${BASE}/${cat.slug}.html#p${p.n}`,
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Free AI Prompts", item: `${BASE}/` },
        { "@type": "ListItem", position: 2, name: cat.title, item: `${BASE}/${cat.slug}.html` },
      ],
    },
  ];

  return `${head(`${cat.title} — ${cat.prompts.length} Free AI Prompts`, desc, `${BASE}/${cat.slug}.html`, jsonld(ld))}
<body>
${header}
<main>
  <nav class="crumbs" aria-label="Breadcrumb"><a href="./">Free AI Prompts</a> <span>/</span> ${esc(cat.title)}</nav>

  <section class="hero tight">
    <p class="eyebrow">${cat.prompts.length} free prompts</p>
    <h1>${esc(cat.title)}</h1>
    <p class="lede">${cat.quote.map((l) => esc(l)).join(" ")}</p>
    <div class="btns">
      <button type="button" class="primary" data-copy-all>Copy all ${cat.prompts.length} prompts</button>
      <a class="ghost" href="${STORE}" target="_blank" rel="noopener">Get the full ${TOTAL.toLocaleString("en-US")}</a>
    </div>
  </section>

  <section class="list">
${blocks}
  </section>

  <section class="siblings">
    <h2>Other categories</h2>
    <ul>
${siblings}
    </ul>
  </section>
</main>
${footer}
<script>
document.addEventListener("click", function (e) {
  var b = e.target.closest("[data-copy],[data-copy-all]");
  if (!b) return;
  var text;
  if (b.hasAttribute("data-copy-all")) {
    text = Array.prototype.map.call(document.querySelectorAll(".prompt"), function (a) {
      return "## " + a.querySelector("h2").textContent.trim() + "\\n\\n" + a.querySelector("code").textContent;
    }).join("\\n\\n");
  } else {
    text = b.parentNode.querySelector("code").textContent;
  }
  var done = function () {
    var old = b.textContent;
    b.textContent = "Copied";
    b.classList.add("ok");
    setTimeout(function () { b.textContent = old; b.classList.remove("ok"); }, 1400);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, function () {});
  }
});
</script>`;
}

/* ------------------------------------------------------------ xml / text */

function buildSitemap(cats) {
  const rows = [
    [`${BASE}/`, "1.0", "weekly"],
    ...cats.map((c) => [`${BASE}/${c.slug}.html`, "0.8", "monthly"]),
  ];
  const now = new Date().toISOString().slice(0, 10);
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    rows
      .map(([loc, pri, freq]) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${pri}</priority>\n  </url>`)
      .join("\n") +
    `\n</urlset>\n`;
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), xml);
  return rows.length;
}

function buildRobots() {
  fs.writeFileSync(
    path.join(ROOT, "robots.txt"),
    `User-agent: *\nAllow: /\nDisallow: /gen/\n\n` +
      `# ${TOTAL} free AI prompts across ${10} categories\n` +
      `Sitemap: ${BASE}/sitemap.xml\n`
  );
}

function buildLlms(cats) {
  const lines = [
    `# Dreamer Prompt Lab — ${TOTAL} free AI prompts`,
    ``,
    `> ${TOTAL} copy-paste prompts for ChatGPT, Claude, Gemini and Midjourney,`,
    `> split across ${cats.length} categories: ${cats.map((c) => c.keys.split(",")[0].trim()).join(", ")}.`,
    `> Every prompt states the character, word or structural limit the target`,
    `> platform actually enforces, so the output is usable without a rewrite.`,
    `> Free to use personally or commercially; no signup and no email gate.`,
    `> The complete set — ${TOTAL.toLocaleString("en-US")} prompts across 164 categories — is a paid product.`,
    ``,
    `## Free pages`,
    ``,
    `- [All ${TOTAL} free prompts](https://fyosamu.github.io/ai-prompts-library/): the index, every category listed.`,
    ...cats.map(
      (c) => `- [${c.title} (${c.count})](https://fyosamu.github.io/ai-prompts-library/${c.slug}.html): ${c.keys}.`
    ),
    ``,
    `## The paid set`,
    ``,
    `- [Dreamer Prompt Lab store](https://www.getly.store/store/dreamer-prompt-lab-muifdken): 10,481 prompts in 164 categories, from $4.99, paid in USDT and delivered as an instant ZIP.`,
    `- [Free preview of the full catalogue](https://dreamerpromptlab.getly.page).`,
    `- Also from the same studio: [150 clothing store templates](https://fyosamu.github.io/fashion-store/apparel.html) and the [fixed-price web studio](https://fyosamu.github.io/pricing/).`,
    ``,
    `## How a prompt is used`,
    ``,
    `Open a category page, copy the block, replace every [BRACKET] with your own`,
    `details, and paste it into ChatGPT, Claude or Gemini. Nothing here requires`,
    `an account, and no page sets a cookie.`,
    ``,
  ];
  fs.writeFileSync(path.join(ROOT, "llms.txt"), lines.join("\n"));
}

/* ------------------------------------------------------------------- main */

function main() {
  const cats = readCategories();
  const data = Object.fromEntries(cats.map((c) => [c.slug, readCategory(c.slug)]));

  for (const c of cats) {
    const d = data[c.slug];
    if (!d.title) throw new Error(`${c.slug}.md has no # heading`);
    if (!d.prompts.length) throw new Error(`${c.slug}.md parsed to zero prompts`);
    if (d.prompts.length !== c.count) {
      console.warn(`  warn  ${c.slug}: table says ${c.count}, file has ${d.prompts.length}`);
    }
  }

  fs.mkdirSync(path.join(ROOT, "assets"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "index.html"), renderIndex(cats));
  let bytes = 0;
  for (const c of cats) {
    const html = renderCategory(data[c.slug], c);
    fs.writeFileSync(path.join(ROOT, `${c.slug}.html`), html);
    bytes += html.length;
  }

  const urls = buildSitemap(cats);
  buildRobots();
  buildLlms(cats);
  fs.writeFileSync(path.join(ROOT, ".nojekyll"), "");

  const prompts = cats.reduce((n, c) => n + data[c.slug].prompts.length, 0);
  console.log(`index.html  ${cats.length} categories, ${prompts} prompts`);
  console.log(`pages       ${cats.length} x ${Math.round(bytes / cats.length / 1024)} KB`);
  console.log(`sitemap     ${urls} urls + robots.txt + llms.txt`);
  if (prompts !== TOTAL) console.log(`  note  README claims ${TOTAL}, pages hold ${prompts}`);
}

main();
