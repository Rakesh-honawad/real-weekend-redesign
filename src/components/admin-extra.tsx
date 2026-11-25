"use client"
import { useState } from "react"
import * as api from "../lib/api"
import { compress } from "../lib/photo"
import { Chip } from "./ui"
import { GROUPS, type Destination } from "../types"

const VIBES = ["chill", "adventure", "party", "soul", "culture"], REGIONS = ["north", "south", "west", "east", "central"], TYPES = ["mountain", "forest", "city", "beach", "heritage"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter(x => x !== v) : [...list, v])

export function Covers({ dests, reload }: { dests: Destination[]; reload: () => void }) {
  const [msg, setMsg] = useState(""), [busy, setBusy] = useState(""), [links, setLinks] = useState<Record<string, string>>({})
  const run = async (slug: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(slug); setMsg("")
    try { await fn(); setMsg(ok); reload() } catch (e: any) { setMsg(e.message) } finally { setBusy("") }
  }
  return (
    <section className="stack">
      <h2>Cover photos</h2>
      <p className="muted small">Shown on each place card and banner. Upload a photo you own, or paste a direct image link (it must start with https://). Without a cover, the newest traveller photo is used, then generated art.</p>
      {msg && <p role="status" className="notice-line">{msg}</p>}
      {dests.map(d => (
        <div key={d.slug} className="card cover-row">
          <div className="cover-thumb">{d.cover ? <img src={d.cover} alt={`Cover of ${d.name}`} /> : <span className="muted small">No photo yet</span>}</div>
          <div className="stack">
            <b>{d.name}</b>
            <label className="field">Upload a photo
              <input type="file" accept="image/*" disabled={busy === d.slug} onChange={e => { const f = e.target.files?.[0]; if (f) run(d.slug, async () => api.adminCoverUpload(d.slug, await compress(f, 1600)), "Saved " + d.name) }} />
            </label>
            <div className="field">
              <label htmlFor={"u-" + d.slug}>Or paste an image link</label>
              <div className="inline">
                <input id={"u-" + d.slug} placeholder="https://…" value={links[d.slug] || ""} onChange={e => setLinks({ ...links, [d.slug]: e.target.value })} />
                <button className="btn" disabled={busy === d.slug || !links[d.slug]} onClick={() => run(d.slug, () => api.adminCoverUrl(d.slug, links[d.slug]), "Saved " + d.name)}>Use link</button>
              </div>
            </div>
            <button className="link" onClick={() => run(d.slug, () => api.adminCoverClear(d.slug), "Cover removed")}>Remove cover</button>
          </div>
        </div>
      ))}
    </section>
  )
}

export function NewPlace({ reload }: { reload: () => void }) {
  const blank = { name: "", state: "", region: "", type: "", emoji: "📍", vibes: [] as string[], bestMonths: [] as number[], suits: [] as string[], spendLow: "", spendHigh: "", lat: "", lon: "", staysSlug: "" }
  const [f, setF] = useState(blank), [msg, setMsg] = useState(""), [done, setDone] = useState("")
  const set = (k: string, v: unknown) => setF({ ...f, [k]: v })
  const save = async () => {
    setMsg(""); setDone("")
    try { const r = await api.adminAddPlace(f); setDone(r.slug); setF(blank); reload() } catch (e: any) { setMsg(e.message) }
  }
  return (
    <section className="stack">
      <h2>Add a new place</h2>
      <p className="muted small">After saving, add its spots in the Spots tab and a cover in the Covers tab. Latitude and longitude are only needed for the weather forecast.</p>
      <div className="card form-grid">
        <label className="field">Place name<input value={f.name} onChange={e => set("name", e.target.value)} /></label>
        <label className="field">State<input value={f.state} onChange={e => set("state", e.target.value)} /></label>
        <label className="field">Region<select value={f.region} onChange={e => set("region", e.target.value)}><option value="">Choose…</option>{REGIONS.map(r => <option key={r}>{r}</option>)}</select></label>
        <label className="field">Type<select value={f.type} onChange={e => set("type", e.target.value)}><option value="">Choose…</option>{TYPES.map(r => <option key={r}>{r}</option>)}</select></label>
        <label className="field">Emoji<input value={f.emoji} onChange={e => set("emoji", e.target.value)} /></label>
        <label className="field">goSTOPS page name (optional)<input placeholder="e.g. Goa" value={f.staysSlug} onChange={e => set("staysSlug", e.target.value)} /></label>
        <label className="field">Weekend spend from (₹)<input type="number" inputMode="numeric" value={f.spendLow} onChange={e => set("spendLow", e.target.value)} /></label>
        <label className="field">Weekend spend to (₹)<input type="number" inputMode="numeric" value={f.spendHigh} onChange={e => set("spendHigh", e.target.value)} /></label>
        <label className="field">Latitude (optional)<input inputMode="decimal" value={f.lat} onChange={e => set("lat", e.target.value)} /></label>
        <label className="field">Longitude (optional)<input inputMode="decimal" value={f.lon} onChange={e => set("lon", e.target.value)} /></label>
      </div>
      <fieldset className="field"><legend>Vibes</legend><div className="chips">{VIBES.map(v => <Chip key={v} on={f.vibes.includes(v)} onClick={() => set("vibes", toggle(f.vibes, v))}>{v}</Chip>)}</div></fieldset>
      <fieldset className="field"><legend>Best months</legend><div className="chips">{MONTHS.map((m, i) => <Chip key={m} on={f.bestMonths.includes(i + 1)} onClick={() => set("bestMonths", toggle(f.bestMonths, i + 1))}>{m}</Chip>)}</div></fieldset>
      <fieldset className="field"><legend>Our pick for</legend><div className="chips">{GROUPS.map(g => <Chip key={g} on={f.suits.includes(g)} onClick={() => set("suits", toggle(f.suits, g))}>{g}</Chip>)}</div></fieldset>
      {msg && <p role="alert" className="err">{msg}</p>}
      {done && <p role="status" className="notice-line">Saved. Place link: /place?s={done} · Rating link: /rate?p={done}</p>}
      <button className="btn primary" disabled={!f.name || !f.region || !f.type} onClick={save}>Save place</button>
    </section>
  )
}