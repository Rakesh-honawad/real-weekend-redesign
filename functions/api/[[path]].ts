// Cloudflare Pages Function: the whole backend. Bindings: DB (D1), PHOTOS (R2). Secrets: ADMIN_PASSWORD, TOKEN_SECRET.
/* eslint-disable @typescript-eslint/no-explicit-any */
const GROUPS = ["solo", "couple", "friends", "family"]
const TAGS = ["worth_it", "crowded", "pricey", "hidden_gem", "unsafe_night"]
const EVENTS = ["visit", "search", "filter", "rating_done", "share"]
const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...extra } })
const err = (message: string, status = 400) => json({ error: message }, status)
const now = () => new Date().toISOString()
const csv = (s: string | null) => (s ? s.split(",").filter(Boolean) : [])
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("")
async function sha(text: string) { return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))) }
async function hmac(secret: string, text: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  return hex(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(text)))
}
async function isAdmin(req: Request, env: any) {
  const t = (req.headers.get("authorization") || "").replace("Bearer ", "")
  const [exp, sig] = t.split(".")
  if (!exp || !sig || +exp < Date.now()) return false
  return sig === (await hmac(env.TOKEN_SECRET || "dev-secret", exp))
}
const device = async (req: Request, env: any) => sha((req.headers.get("x-device") || "anon") + (env.TOKEN_SECRET || "dev-secret"))

// ---- rating summaries (grouped by destination or by spot) ----
async function summaries(db: any, by: "dest" | "spot", only?: string) {
  const key = by === "dest" ? "sp.dest" : "sp.id"
  const where = only ? `WHERE ${key} = ?` : ""
  const args = only ? [only] : []
  const [g, t] = await Promise.all([
    db.prepare(`SELECT ${key} k, sub.grp grp, r.score score, COUNT(*) c FROM ratings r JOIN submissions sub ON sub.id=r.submission_id JOIN spots sp ON sp.id=r.spot_id ${where} GROUP BY k, grp, score`).bind(...args).all(),
    db.prepare(`SELECT ${key} k, r.tag tag, COUNT(*) c FROM ratings r JOIN spots sp ON sp.id=r.spot_id ${where ? where + " AND" : "WHERE"} r.tag IS NOT NULL GROUP BY k, tag`).bind(...args).all()
  ])
  const m: Record<string, any> = {}
  const blank = () => ({ count: 0, average: 0, dist: [0, 0, 0], byGroup: {} as any, tags: {} as any, _sum: 0, _g: {} as any })
  for (const row of g.results) {
    const s = (m[row.k] ||= blank())
    s.count += row.c; s._sum += row.score * row.c; s.dist[row.score - 1] += row.c
    const x = (s._g[row.grp] ||= { c: 0, sum: 0 }); x.c += row.c; x.sum += row.score * row.c
  }
  for (const row of t.results) { (m[row.k] ||= blank()).tags[row.tag] = row.c }
  for (const s of Object.values(m)) {
    s.average = s.count ? s._sum / s.count : 0
    for (const [grp, x] of Object.entries<any>(s._g)) s.byGroup[grp] = { count: x.c, average: x.sum / x.c }
    delete s._sum; delete s._g
  }
  return { get: (k: string) => m[k] || blank() }
}
const dest = (r: any, summary: any, lastUpdated: string | null, cover: string | null = null) => ({
  cover,
  slug: r.slug, name: r.name, state: r.state, region: r.region, type: r.type, emoji: r.emoji, vibes: csv(r.vibes),
  bestMonths: csv(r.best_months).map(Number), spendLow: r.spend_low, spendHigh: r.spend_high, suits: csv(r.suits),
  staysUrl: `https://gostops.com/stay/${r.stays_slug || "home"}`, summary, lastUpdated
})

async function forecast(r: any) {
  if (!r.lat || !r.lon) return []
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${r.lat}&longitude=${r.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,snowfall_sum,weathercode&timezone=auto&forecast_days=5`
    const d: any = await (await fetch(u, { cf: { cacheTtl: 10800, cacheEverything: true } } as any)).json()
    const label = (c: number) => (c === 0 ? "Clear" : c < 4 ? "Partly cloudy" : c < 50 ? "Fog or haze" : c < 70 ? "Rain" : c < 80 ? "Snow" : c < 90 ? "Showers" : "Thunderstorm")
    return d.daily.time.map((t: string, i: number) => ({ date: t, tempMax: Math.round(d.daily.temperature_2m_max[i]), tempMin: Math.round(d.daily.temperature_2m_min[i]), rainChance: d.daily.precipitation_probability_max[i] ?? 0, snowCm: d.daily.snowfall_sum[i] ?? 0, label: label(d.daily.weathercode[i]) }))
  } catch { return [] }
}

export const onRequest = async ({ request, env }: any) => {
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean)
  const db = env.DB
  const method = request.method
  try {
    // ---------- public ----------
    if (method === "GET" && path[0] === "destinations") {
      const [rows, sums, last, covers, adminCovers] = await Promise.all([
        db.prepare("SELECT * FROM destinations ORDER BY name").all(), summaries(db, "dest"),
        db.prepare(`SELECT d, MAX(t) t FROM (SELECT dest d, MAX(created_at) t FROM submissions GROUP BY dest UNION ALL SELECT dest, MAX(uploaded_at) FROM photos WHERE hidden=0 GROUP BY dest UNION ALL SELECT dest, MAX(created_at) FROM updates GROUP BY dest) GROUP BY d`).all(),
        db.prepare("SELECT dest, r2_key, MAX(COALESCE(taken_at, uploaded_at)) t FROM photos WHERE hidden=0 GROUP BY dest").all(),
        db.prepare("SELECT dest, url, updated_at FROM covers").all()
      ])
      const cv: Record<string, string> = {}; for (const x of covers.results) cv[x.dest] = "/api/img/" + x.r2_key
      for (const x of adminCovers.results) cv[x.dest] = x.url || "/api/cover/" + x.dest + "?v=" + encodeURIComponent(x.updated_at)
      const lu: Record<string, string> = {}; for (const x of last.results) lu[x.d] = x.t
      return json(rows.results.map((r: any) => dest(r, sums.get(r.slug), lu[r.slug] || null, cv[r.slug] || null)), 200, { "cache-control": "public, max-age=60" })
    }
    if (method === "GET" && path[0] === "destination" && path[1]) {
      const slug = path[1]
      const d = await db.prepare("SELECT * FROM destinations WHERE slug=?").bind(slug).first()
      if (!d) return err("We couldn't find that place.", 404)
      const [ds, ss, spots, subs, photos, services, updates, fc, ac] = await Promise.all([
        summaries(db, "dest", slug), summaries(db, "spot", undefined), db.prepare("SELECT * FROM spots WHERE dest=?").bind(slug).all(),
        db.prepare(`SELECT s.*, (SELECT AVG(score) FROM ratings WHERE submission_id=s.id) avg FROM submissions s WHERE dest=? ORDER BY created_at DESC LIMIT 60`).bind(slug).all(),
        db.prepare("SELECT * FROM photos WHERE dest=? AND hidden=0 ORDER BY COALESCE(taken_at, uploaded_at) DESC LIMIT 24").bind(slug).all(),
        db.prepare("SELECT * FROM services WHERE dest=? ORDER BY kind, name").bind(slug).all(),
        db.prepare("SELECT * FROM updates WHERE dest=? AND expires_at > ? ORDER BY created_at DESC").bind(slug, now()).all(),
        forecast(d),
        db.prepare("SELECT url, updated_at FROM covers WHERE dest=?").bind(slug).first()
      ])
      return json({
        destination: dest(d, ds.get(slug), null, ac ? ac.url || "/api/cover/" + slug + "?v=" + encodeURIComponent(ac.updated_at) : photos.results[0] ? "/api/img/" + photos.results[0].r2_key : null),
        spots: spots.results.map((s: any) => ({ id: s.id, name: s.name, category: s.category, durationMin: s.duration_min, travelMin: s.travel_min, indoor: !!s.indoor, suits: csv(s.suits), priority: s.priority, summary: ss.get(s.id) })),
        reviews: subs.results.filter((s: any) => s.comment || s.avg).map((s: any) => ({ id: s.id, group: s.grp, score: Math.round(s.avg || 2), comment: s.comment, createdAt: s.created_at, helpful: s.helpful, sample: !!s.sample })),
        photos: photos.results.map((p: any) => ({ id: p.id, url: "/api/img/" + p.r2_key, spotId: p.spot_id, takenAt: p.taken_at, uploadedAt: p.uploaded_at, verified: !!p.verified, sample: !!p.sample })),
        services: services.results.map((s: any) => ({ id: s.id, destination: s.dest, kind: s.kind, name: s.name, note: s.note, updatedAt: s.updated_at })),
        updates: updates.results.map((u: any) => ({ id: u.id, destination: u.dest, category: u.category, text: u.text, createdAt: u.created_at, expiresAt: u.expires_at })),
        forecast: fc
      })
    }
    if (method === "GET" && path[0] === "property" && path[1]) {
      const p = await db.prepare("SELECT p.name, d.slug, d.name dname FROM properties p JOIN destinations d ON d.slug=p.dest WHERE p.slug=?").bind(path[1]).first()
      if (!p) return err("This rating link isn't valid.", 404)
      const spots = await db.prepare("SELECT * FROM spots WHERE dest=? ORDER BY priority DESC").bind(p.slug).all()
      return json({ propertyName: p.name, destination: { slug: p.slug, name: p.dname }, spots: spots.results.map((s: any) => ({ id: s.id, name: s.name, category: s.category, durationMin: s.duration_min, travelMin: s.travel_min, indoor: !!s.indoor, suits: csv(s.suits), priority: s.priority, summary: { count: 0, average: 0, dist: [0, 0, 0], byGroup: {}, tags: {} } })) })
    }
    if (method === "GET" && path[0] === "img" && path[1]) {
      const o: any = await db.prepare("SELECT data FROM photos WHERE r2_key=? AND hidden=0").bind(path[1]).first()
      if (!o || !o.data) return new Response("Not found", { status: 404 })
      const bytes = o.data instanceof ArrayBuffer ? new Uint8Array(o.data) : new Uint8Array(o.data as number[])
      return new Response(bytes, { headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } })
    }
    if (method === "GET" && path[0] === "cover" && path[1]) {
      const c: any = await db.prepare("SELECT data FROM covers WHERE dest=?").bind(path[1]).first()
      if (!c || !c.data) return new Response("Not found", { status: 404 })
      const bytes = c.data instanceof ArrayBuffer ? new Uint8Array(c.data) : new Uint8Array(c.data as number[])
      return new Response(bytes, { headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } })
    }
    const dev = await device(request, env)
    if (method === "POST" && path[0] === "event") {
      const { name } = (await request.json()) as any
      if (EVENTS.includes(name)) await db.prepare("INSERT INTO events (name, device, day) VALUES (?,?,?)").bind(name, dev, now().slice(0, 10)).run()
      return json({ ok: true })
    }
    if (method === "POST" && path[0] === "helpful") {
      const { id } = (await request.json()) as any
      const ins = await db.prepare("INSERT OR IGNORE INTO helpful VALUES (?,?)").bind(id, dev).run()
      if (ins.meta.changes) await db.prepare("UPDATE submissions SET helpful=helpful+1 WHERE id=?").bind(id).run()
      return json({ ok: true })
    }
    if (method === "POST" && path[0] === "report") {
      const { id } = (await request.json()) as any
      const ins = await db.prepare("INSERT OR IGNORE INTO reports VALUES (?,?)").bind(id, dev).run()
      if (ins.meta.changes) await db.prepare("UPDATE photos SET reports=reports+1, hidden=CASE WHEN reports+1>=3 THEN 1 ELSE hidden END WHERE id=?").bind(id).run()
      return json({ ok: true })
    }
    if (method === "POST" && path[0] === "rate") {
      const form = await request.formData()
      const p = JSON.parse(String(form.get("payload") || "{}"))
      if (form.get("website")) return json({ ok: true }) // honeypot: silently drop bots
      if (!GROUPS.includes(p.group)) return err("Please tell us who you travelled with.")
      const place = await db.prepare("SELECT slug FROM destinations WHERE slug=?").bind(p.destination).first()
      if (!place) return err("Unknown place.")
      const dup = await db.prepare("SELECT 1 FROM submissions WHERE device=? AND dest=? AND created_at > ?")
        .bind(dev, p.destination, new Date(Date.now() - 30 * 86400000).toISOString()).first()
      if (dup) return err("You've already reviewed this place recently. Thanks! You can review again in a few weeks.")
      const valid = new Set((await db.prepare("SELECT id FROM spots WHERE dest=?").bind(p.destination).all()).results.map((s: any) => s.id))
      const ratings = (p.ratings || []).filter((r: any) => valid.has(r.spotId) && [1, 2, 3].includes(r.score)).slice(0, 12)
      const files = form.getAll("photos").filter((f: any) => typeof f !== "string") as any[]
      if (!ratings.length && !files.length) return err("Rate at least one spot, or add a photo.")
      const recent = await db.prepare("SELECT COUNT(*) c FROM submissions WHERE device=? AND created_at > ?").bind(dev, new Date(Date.now() - 3600000).toISOString()).first()
      if (recent.c >= 5) return err("Too many submissions. Please try again later.", 429)
      const have = await db.prepare("SELECT COUNT(*) c FROM photos WHERE device=? AND dest=?").bind(dev, p.destination).first()
      if (have.c + files.length > 3) return err("You can add up to 3 photos per place.")
      const id = crypto.randomUUID(), t = now()
      const comment = String(p.comment || "").trim().slice(0, 140) || null
      const stmts = [db.prepare("INSERT INTO submissions (id,dest,grp,comment,device,created_at) VALUES (?,?,?,?,?,?)").bind(id, p.destination, p.group, comment, dev, t)]
      for (const r of ratings) stmts.push(db.prepare("INSERT INTO ratings (submission_id,spot_id,score,tag) VALUES (?,?,?,?)").bind(id, r.spotId, r.score, TAGS.includes(r.tag) ? r.tag : null))
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        if (f.size > 1000000 || !String(f.type).startsWith("image/")) return err("Photos must be images under 1 MB.")
        const key = crypto.randomUUID() + ".jpg", meta = (p.photos || [])[i] || {}
        const bytes = new Uint8Array(await f.arrayBuffer())
        const taken = meta.takenAt && !isNaN(Date.parse(meta.takenAt)) && Date.parse(meta.takenAt) <= Date.now() ? meta.takenAt : null
        stmts.push(db.prepare("INSERT INTO photos (id,dest,spot_id,r2_key,taken_at,uploaded_at,verified,device,data) VALUES (?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), p.destination, valid.has(meta.spotId) ? meta.spotId : null, key, taken, t, taken ? 1 : 0, dev, bytes))
      }
      await db.batch(stmts)
      return json({ ok: true })
    }

    // ---------- admin ----------
    if (path[0] === "admin") {
      if (method === "POST" && path[1] === "login") {
        const { password } = (await request.json()) as any
        if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) return err("Wrong password.", 401)
        const exp = String(Date.now() + 12 * 3600000)
        return json({ token: exp + "." + (await hmac(env.TOKEN_SECRET || "dev-secret", exp)) })
      }
      if (!(await isAdmin(request, env))) return err("Please log in.", 401)
      if (method === "GET" && path[1] === "data") {
        const d = url.searchParams.get("dest") || ""
        const [sv, up, sp] = await Promise.all([db.prepare("SELECT * FROM services WHERE dest=? ORDER BY kind,name").bind(d).all(), db.prepare("SELECT * FROM updates WHERE dest=? ORDER BY created_at DESC").bind(d).all(), db.prepare("SELECT * FROM spots WHERE dest=? ORDER BY priority DESC").bind(d).all()])
        return json({
          services: sv.results.map((s: any) => ({ id: s.id, destination: s.dest, kind: s.kind, name: s.name, note: s.note, updatedAt: s.updated_at })),
          updates: up.results.map((u: any) => ({ id: u.id, destination: u.dest, category: u.category, text: u.text, createdAt: u.created_at, expiresAt: u.expires_at })),
          spots: sp.results.map((s: any) => ({ id: s.id, name: s.name, category: s.category, durationMin: s.duration_min, travelMin: s.travel_min, indoor: !!s.indoor, suits: csv(s.suits), priority: s.priority }))
        })
      }
      if (method === "GET" && path[1] === "reports") {
        const r = await db.prepare("SELECT id, r2_key, dest, reports, hidden FROM photos WHERE reports>0 OR hidden=1 ORDER BY reports DESC LIMIT 60").all()
        return json(r.results.map((p: any) => ({ id: p.id, url: "/api/img/" + p.r2_key, destination: p.dest, reports: p.reports, hidden: !!p.hidden })))
      }
      if (method === "GET" && path[1] === "stats") {
        const c = async (n: string) => (await db.prepare("SELECT COUNT(*) c FROM events WHERE name=?").bind(n).first()).c
        const v = await db.prepare("SELECT COUNT(DISTINCT device) c FROM events WHERE name='visit'").first()
        const days = await db.prepare("SELECT day, COUNT(DISTINCT device) visitors FROM events WHERE name='visit' GROUP BY day ORDER BY day DESC LIMIT 14").all()
        return json({ visitors: v.c, searches: await c("search"), ratings: await c("rating_done"), shares: await c("share"), days: days.results.reverse() })
      }
      if (method === "POST" && path[1] === "cover") {
        const ct = request.headers.get("content-type") || ""
        if (ct.includes("multipart")) {
          const form = await request.formData(), file: any = form.get("file"), d = String(form.get("dest") || "")
          if (!file || typeof file === "string" || file.size > 1500000 || !String(file.type).startsWith("image/")) return err("Choose an image under 1.5 MB.")
          if (!(await db.prepare("SELECT slug FROM destinations WHERE slug=?").bind(d).first())) return err("Unknown place.")
          await db.prepare("INSERT OR REPLACE INTO covers (dest,url,data,updated_at) VALUES (?,NULL,?,?)").bind(d, new Uint8Array(await file.arrayBuffer()), now()).run()
          return json({ ok: true })
        }
        const b = (await request.json()) as any
        if (b.clear) { await db.prepare("DELETE FROM covers WHERE dest=?").bind(b.dest).run(); return json({ ok: true }) }
        if (!/^https:\/\/[^\s]+$/i.test(String(b.url || ""))) return err("Paste a full image link starting with https://")
        await db.prepare("INSERT OR REPLACE INTO covers (dest,url,data,updated_at) VALUES (?,?,NULL,?)").bind(b.dest, String(b.url).slice(0, 600), now()).run()
        return json({ ok: true })
      }
      if (method === "POST") {
        const b = (await request.json()) as any
        if (path[1] === "destination") {
          const slug = String(b.slug || b.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
          if (!slug || !String(b.name || "").trim()) return err("Please enter the place name.")
          if (!["north", "south", "west", "east", "central"].includes(b.region) || !["mountain", "forest", "city", "beach", "heritage"].includes(b.type)) return err("Choose a region and a type.")
          if (await db.prepare("SELECT slug FROM destinations WHERE slug=?").bind(slug).first()) return err("A place with this name already exists.")
          const n = (x: any) => (x === "" || x == null || isNaN(+x) ? null : +x)
          await db.prepare("INSERT INTO destinations (slug,name,state,region,type,emoji,vibes,best_months,spend_low,spend_high,suits,lat,lon,stays_slug) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(slug, String(b.name).trim().slice(0, 60), String(b.state || "").slice(0, 60), b.region, b.type, String(b.emoji || "📍").slice(0, 8), (b.vibes || []).join(","), (b.bestMonths || []).join(","), n(b.spendLow) ?? 0, n(b.spendHigh) ?? 0, (b.suits || []).join(","), n(b.lat), n(b.lon), b.staysSlug ? String(b.staysSlug).slice(0, 80) : null).run()
          await db.prepare("INSERT OR IGNORE INTO properties VALUES (?,?,?)").bind(slug, "goSTOPS " + String(b.name).trim(), slug).run()
          return json({ ok: true, slug })
        }
        if (path[1] === "photo") { await db.prepare("UPDATE photos SET hidden=? WHERE id=?").bind(b.hidden ? 1 : 0, b.id).run(); return json({ ok: true }) }
        if (path[1] === "service" && path[2] === "delete") { await db.prepare("DELETE FROM services WHERE id=?").bind(b.id).run(); return json({ ok: true }) }
        if (path[1] === "update" && path[2] === "delete") { await db.prepare("DELETE FROM updates WHERE id=?").bind(b.id).run(); return json({ ok: true }) }
        if (path[1] === "service") { await db.prepare("INSERT OR REPLACE INTO services VALUES (?,?,?,?,?,?)").bind(b.id || crypto.randomUUID(), b.destination, String(b.kind).slice(0, 40), String(b.name).slice(0, 80), b.note ? String(b.note).slice(0, 160) : null, now()).run(); return json({ ok: true }) }
        if (path[1] === "update") { await db.prepare("INSERT OR REPLACE INTO updates VALUES (?,?,?,?,?,?)").bind(b.id || crypto.randomUUID(), b.destination, b.category, String(b.text).slice(0, 200), b.createdAt || now(), b.expiresAt).run(); return json({ ok: true }) }
        if (path[1] === "spot") {
          const id = b.id || b.destination + "-" + String(b.name).toLowerCase().replace(/[^a-z0-9]+/g, "-")
          await db.prepare("INSERT OR REPLACE INTO spots VALUES (?,?,?,?,?,?,?,?,?)").bind(id, b.destination, b.name, b.category || "sight", +b.travelMin || 15, +b.durationMin || 60, b.indoor ? 1 : 0, (b.suits || []).join(","), +b.priority || 2).run()
          return json({ ok: true })
        }
      }
    }
    return err("Not found", 404)
  } catch (e: any) {
    console.error(e)
    return err("Server error: " + (e?.message || String(e)), 500)
  }
}