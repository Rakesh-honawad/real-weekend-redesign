"use client"
import Link from "next/link"
import { FOOTER_TEXT } from "../config"
import { stars, TAG_LABEL, pct } from "../lib/format"
import type { Summary, Tag } from "../types"

export const Header = () => (
  <header className="top"><Link className="brand" href="/"><span className="brand-mark">rw</span> real weekend<span className="dot">.</span></Link></header>
)
export const Footer = () => <footer className="footer">{FOOTER_TEXT}</footer>
export const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button type="button" className={"chip" + (on ? " on" : "")} aria-pressed={on} onClick={onClick}>{children}</button>
)
export const Skeleton = ({ n = 4 }: { n?: number }) => <div className="grid" aria-busy="true">{Array.from({ length: n }, (_, i) => <div key={i} className="card skel" />)}</div>
export const ErrorBox = ({ msg, retry }: { msg: string; retry?: () => void }) => (
  <div className="notice" role="alert"><p>{msg}</p>{retry && <button className="btn" onClick={retry}>Retry</button>}</div>
)
export const Sample = () => <span className="tag sample">Sample</span>

export function Stars({ avg, count }: { avg: number; count: number }) {
  if (!count) return <span className="muted">Not yet rated by travellers</span>
  const s = stars(avg)
  return <span className="stars" aria-label={`${s} out of 5 from ${count} ratings`}><b>★ {s.toFixed(1)}</b> <span className="muted">({count})</span>{process.env.NEXT_PUBLIC_USE_MOCK === "true" && <span className="tag sample">Sample</span>}</span>
}
export function TopTags({ s, n = 2 }: { s: Summary; n?: number }) {
  const rows = (Object.entries(s.tags) as [Tag, number][]).sort((a, b) => b[1] - a[1]).slice(0, n)
  if (!s.count || !rows.length) return null
  return <span className="tags">{rows.map(([t, c]) => <span key={t} className={"tag " + (t === "unsafe_night" || t === "crowded" || t === "pricey" ? "warn" : "good")}>{TAG_LABEL[t]} {pct(c, s.count)}%</span>)}</span>
}
export function Dist({ s }: { s: Summary }) {
  const labels = ["Great", "Okay", "Bad"], vals = [s.dist[2], s.dist[1], s.dist[0]]
  return <div className="dist">{labels.map((l, i) => <div key={l} className="dist-row"><span>{l}</span><div className="bar"><i style={{ width: pct(vals[i], s.count) + "%" }} /></div><span className="muted">{pct(vals[i], s.count)}%</span></div>)}</div>
}
export function Share({ text, onShared, className = "btn" }: { text: string; onShared?: () => void; className?: string }) {
  const go = async () => {
    const url = location.href
    try { if (navigator.share) await navigator.share({ title: "Real Weekend", text, url }); else { await navigator.clipboard.writeText(url); alert("Link copied") } onShared?.() } catch {}
  }
  return <button className={className} onClick={go}>Share</button>
}
