"use client"
import { useCallback, useEffect, useState } from "react"
import * as api from "../lib/api"
import { Chip, ErrorBox } from "./ui"
import { GROUPS, type Destination, type Service, type Spot, type Update } from "../types"

const TABS = ["Services", "Updates", "Reported photos", "Spots", "Stats"]
const CATS = ["weather", "road", "closure", "transport", "event", "upcoming"]
const KINDS = ["bike taxi", "scooter rental", "airport shuttle", "cafes", "laundry", "atm"]

export default function Admin({ start = "Services" }: { start?: string }) {
  const [authed, setAuthed] = useState(false), [pw, setPw] = useState(""), [msg, setMsg] = useState("")
  const [tab, setTab] = useState(start), [dests, setDests] = useState<Destination[]>([]), [dest, setDest] = useState("")
  useEffect(() => { setAuthed(api.adminLoggedIn()); api.listDestinations().then(d => { setDests(d); setDest(d[0]?.slug || "") }).catch(() => {}) }, [])
  const login = async () => { try { await api.adminLogin(pw); setAuthed(true); setMsg("") } catch (e: any) { setMsg(e.message) } }
  if (!authed) return (
    <main className="wrap narrow"><h1>Backstage</h1><div className="card"><label>Password<input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} /></label>
      {msg && <p className="err" role="alert">{msg}</p>}<button className="btn primary block" onClick={login}>Log in</button></div></main>)
  return (
    <main className="wrap">
      <div className="listhead"><h1>Backstage</h1><button className="link" onClick={() => { api.adminLogout(); setAuthed(false) }}>Log out</button></div>
      <div className="chips">{TABS.map(t => <Chip key={t} on={tab === t} onClick={() => setTab(t)}>{t}</Chip>)}</div>
      {["Services", "Updates", "Spots"].includes(tab) && <label className="small">Destination <select value={dest} onChange={e => setDest(e.target.value)}>{dests.map(d => <option key={d.slug} value={d.slug}>{d.name}</option>)}</select></label>}
      {tab === "Reported photos" ? <Reports /> : tab === "Stats" ? <Stats /> : dest && <Manage key={tab + dest} tab={tab} dest={dest} />}
    </main>)
}

function Manage({ tab, dest }: { tab: string; dest: string }) {
  const [d, setD] = useState<{ services: Service[]; updates: Update[]; spots: Spot[] } | null>(null), [error, setError] = useState("")
  const [f, setF] = useState<any>({})
  const load = useCallback(() => api.adminData(dest).then(setD).catch(e => setError(e.message)), [dest])
  useEffect(() => { load() }, [load])
  const save = async (kind: "service" | "update" | "spot", item: any) => { try { await api.adminSave(kind, { ...item, destination: dest }); setF({}); load() } catch (e: any) { setError(e.message) } }
  const del = async (kind: "service" | "update", id: string) => { await api.adminDelete(kind, id); load() }
  if (error) return <ErrorBox msg={error} />
  if (!d) return <p>Loading…</p>
  if (tab === "Services") return <section><h2>Services (plain text, no links)</h2>
    {d.services.map(s => <p key={s.id} className="row">{s.kind}: <b>{s.name}</b> {s.note} <button className="link" onClick={() => del("service", s.id)}>Delete</button></p>)}
    <div className="card form"><select value={f.kind || ""} onChange={e => setF({ ...f, kind: e.target.value })}><option value="">Kind…</option>{KINDS.map(k => <option key={k}>{k}</option>)}</select>
      <input placeholder="Name" value={f.name || ""} onChange={e => setF({ ...f, name: e.target.value })} /><input placeholder="Short note (optional)" value={f.note || ""} onChange={e => setF({ ...f, note: e.target.value })} />
      <button className="btn primary" disabled={!f.kind || !f.name} onClick={() => save("service", f)}>Add service</button></div></section>
  if (tab === "Updates") return <section><h2>Updates (they expire)</h2>
    {d.updates.map(u => <p key={u.id} className={"row" + (u.expiresAt < new Date().toISOString() ? " dim" : "")}>[{u.category}] {u.text} <span className="muted small">until {u.expiresAt.slice(0, 10)}</span> <button className="link" onClick={() => del("update", u.id)}>Delete</button></p>)}
    <div className="card form"><select value={f.category || ""} onChange={e => setF({ ...f, category: e.target.value })}><option value="">Category…</option>{CATS.map(k => <option key={k}>{k}</option>)}</select>
      <textarea maxLength={200} rows={2} placeholder="What is happening? (max 200)" value={f.text || ""} onChange={e => setF({ ...f, text: e.target.value })} />
      <label className="small">Expires on<input type="date" value={f.exp || ""} onChange={e => setF({ ...f, exp: e.target.value })} /></label>
      <button className="btn primary" disabled={!f.category || !f.text || !f.exp} onClick={() => save("update", { category: f.category, text: f.text, expiresAt: new Date(f.exp + "T23:59:00").toISOString() })}>Post update</button></div></section>
  return <section><h2>Spots</h2>{d.spots.map(s => <div key={s.id} className="card form">
    <b>{s.name}</b><div className="row small">
      <label>Travel min<input type="number" defaultValue={s.travelMin} onBlur={e => save("spot", { ...s, travelMin: +e.target.value })} /></label>
      <label>Stay min<input type="number" defaultValue={s.durationMin} onBlur={e => save("spot", { ...s, durationMin: +e.target.value })} /></label>
      <label>Priority 1-3<input type="number" min={1} max={3} defaultValue={s.priority} onBlur={e => save("spot", { ...s, priority: +e.target.value })} /></label>
      <label><input type="checkbox" defaultChecked={s.indoor} onChange={e => save("spot", { ...s, indoor: e.target.checked })} /> Indoor</label></div>
    <div className="chips">{GROUPS.map(g => <Chip key={g} on={s.suits.includes(g)} onClick={() => save("spot", { ...s, suits: s.suits.includes(g) ? s.suits.filter(x => x !== g) : [...s.suits, g] })}>Suits {g}</Chip>)}</div></div>)}
    <div className="card form"><b>Add a spot</b><input placeholder="Name" value={f.name || ""} onChange={e => setF({ ...f, name: e.target.value })} /><button className="btn primary" disabled={!f.name} onClick={() => save("spot", { name: f.name, suits: [] })}>Add spot</button></div></section>
}

function Reports() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof api.adminReports>> | null>(null)
  const load = useCallback(() => api.adminReports().then(setRows).catch(() => setRows([])), [])
  useEffect(() => { load() }, [load])
  if (!rows) return <p>Loading…</p>
  return <section><h2>Reported photos</h2><p className="muted small">Hide only spam, abuse, personal info or off-topic photos. Opinions and ratings can never be deleted here.</p>
    {rows.length ? <div className="photos">{rows.map(p => <figure key={p.id}><img src={p.url} alt="Reported" /><figcaption className="small">{p.reports} reports · {p.hidden ? "hidden" : "visible"}<button className="link" onClick={() => api.adminHidePhoto(p.id, !p.hidden).then(load)}>{p.hidden ? "Unhide" : "Hide"}</button></figcaption></figure>)}</div> : <p className="muted">Nothing reported.</p>}</section>
}

function Stats() {
  const [s, setS] = useState<Awaited<ReturnType<typeof api.adminStats>> | null>(null)
  useEffect(() => { api.adminStats().then(setS).catch(() => {}) }, [])
  if (!s) return <p>Loading…</p>
  const max = Math.max(1, ...s.days.map(d => d.visitors))
  return <section><div className="statgrid">{([["Visitors", s.visitors], ["Searches", s.searches], ["Ratings completed", s.ratings], ["Shares", s.shares]] as const).map(([l, v]) => <div key={l} className="card stat"><b>{v}</b><span className="muted">{l}</span></div>)}</div>
    <h2>Visitors per day</h2><div className="chart" role="img" aria-label="Visitors per day">{s.days.map(d => <div key={d.day} title={`${d.day}: ${d.visitors}`}><i style={{ height: (d.visitors / max) * 100 + "%" }} /><span className="small muted">{d.day.slice(5)}</span></div>)}</div></section>
}
