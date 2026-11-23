"use client"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { listDestinations, trackEvent } from "../src/lib/api"
import { scoreFor } from "../src/lib/rank"
import { cap, rupees, timeAgo } from "../src/lib/format"
import { Chip, ErrorBox, Footer, Header, Skeleton, Stars, TopTags } from "../src/components/ui"
import { GROUPS, type Destination, type Group } from "../src/types"

const VIBES = ["chill", "adventure", "party", "soul", "culture"], TYPES = ["mountain", "forest", "city", "beach", "heritage"], REGIONS = ["north", "south", "west", "east", "central"]
const SPEND = [["Under ₹5k", 0, 5000], ["₹5k to ₹8k", 5000, 8000], ["₹8k and up", 8000, 1e9]] as const
const SORTS = ["Top rated", "Most reviewed", "Recently updated", "Lowest spend"]
function Card({ d, group }: { d: Destination; group: Group | null }) {
  const sc = scoreFor(d.summary, group), good = d.bestMonths.includes(new Date().getMonth() + 1), note = group && sc.fallback ? `Not enough ${group} ratings yet` : ""
  const bestTag = Object.entries(d.summary.tags).filter(([tag]) => tag === "worth_it" || tag === "hidden_gem").sort((a, b) => b[1] - a[1])[0]
  return <Link href={`/place?s=${d.slug}`} className="dest-card">
    <div className={`dest-image art-${d.type}`}>{d.cover ? <img src={d.cover} alt={`${d.name}, ${d.state}`} loading="lazy" /> : <div className="cover-art" aria-hidden="true"><span>{d.type}</span></div>}<span className="image-state">{d.region}</span></div>
    <div className="dest-copy"><div className="dest-title"><div><h3>{d.name}</h3><p className="muted">{d.state}</p></div><span className="good-dot" aria-label={good ? "Good this month" : "Not in season"} title={good ? "Good this month" : "Not in season"} /></div>
      <Stars avg={sc.value} count={sc.count} />{note && <p className="muted small">{note}{d.suits.includes(group!) && <span className="tag pick">Our pick</span>}</p>}
      {bestTag && d.summary.count > 0 && <span className="tag good">{bestTag[0] === "worth_it" ? "Worth it" : "Hidden gem"}</span>}
      <div className="dest-meta"><span>{rupees(d.spendLow)}–{rupees(d.spendHigh)} <span className="muted">rough</span></span><span className={good ? "season good" : "season"}>{good ? "Good this month" : "All year"}</span></div>
      {!sc.count && <span className="sr-only">Not yet rated by travellers</span>}
    </div>
  </Link>
}
function Row({ title, items, group }: { title: string; items: Destination[]; group: Group | null }) { if (!items.length) return null; return <section className="curated"><div className="section-heading"><h2>{title}</h2><span className="muted small">Swipe to explore</span></div><div className="hscroll">{items.map(d => <Card key={d.slug} d={d} group={group} />)}</div></section> }
export default function Home() {
  const [all, setAll] = useState<Destination[] | null>(null), [error, setError] = useState("")
  const [q, setQ] = useState(""), [group, setGroup] = useState<Group | null>(null), [vibe, setVibe] = useState(""), [type, setType] = useState(""), [region, setRegion] = useState("")
  const [spend, setSpend] = useState(-1), [month, setMonth] = useState(false), [sort, setSort] = useState(SORTS[0]), [open, setOpen] = useState(false)
  const load = useCallback(() => { setError(""); setAll(null); listDestinations().then(setAll).catch(e => setError(e.message)) }, [])
  useEffect(() => { load(); trackEvent("visit") }, [load])
  useEffect(() => { if (!q) return; const t = setTimeout(() => trackEvent("search"), 800); return () => clearTimeout(t) }, [q])
  const active = [type, region, spend >= 0, month].filter(Boolean).length, filtered = !!(q || group || vibe || active)
  const list = useMemo(() => {
    const m = new Date().getMonth() + 1
    const r = (all || []).filter(d => d.name.toLowerCase().includes(q.toLowerCase()) && (!vibe || d.vibes.includes(vibe as never)) && (!type || d.type === type) && (!region || d.region === region) && (spend < 0 || (d.spendLow < SPEND[spend][2] && d.spendHigh >= SPEND[spend][1])) && (!month || d.bestMonths.includes(m)))
    const key = (d: Destination) => scoreFor(d.summary, group)
    return r.sort((a, b) => { if (sort === "Most reviewed") return b.summary.count - a.summary.count; if (sort === "Recently updated") return (b.lastUpdated || "").localeCompare(a.lastUpdated || ""); if (sort === "Lowest spend") return a.spendLow - b.spendLow
      const ka = key(a), kb = key(b); if (!!ka.count !== !!kb.count) return kb.count ? 1 : -1; if (kb.value !== ka.value) return kb.value - ka.value; if (group) { const sa = a.suits.includes(group) ? 1 : 0, sb = b.suits.includes(group) ? 1 : 0; if (sa !== sb) return sb - sa }; return a.name.localeCompare(b.name) })
  }, [all, q, group, vibe, type, region, spend, month, sort])
  const clear = () => { setQ(""); setGroup(null); setVibe(""); setType(""); setRegion(""); setSpend(-1); setMonth(false) }
  const pick = <T,>(cur: T, v: T, set: (x: T) => void, none: T) => { set(cur === v ? none : v); trackEvent("filter") }
  const by = (f: (d: Destination) => number, n = 6) => [...(all || [])].sort((a, b) => f(b) - f(a)).slice(0, n)
  return <><Header /><main className="home-wrap">
    <section className="hero"><p className="eyebrow">REAL NOTES. REAL WEEKENDS.</p><h1>Know a place<br className="desktop-break"/> before you go<span className="dot">.</span></h1><p className="hero-sub">Honest ratings, recent photos and local tips from people who have actually been.</p>
      <label className="search-pill"><span aria-hidden="true">⌕</span><input type="search" aria-label="Search places by name" placeholder="Where are you thinking?" value={q} onChange={e => setQ(e.target.value)} /><kbd>⌘ K</kbd></label>
    </section>
    <div className="filter-toolbar"><section className="chip-strip"><span className="toolbar-label">The mood</span>{VIBES.map(v => <Chip key={v} on={vibe === v} onClick={() => pick(vibe, v, setVibe, "")}>{cap(v)}</Chip>)}</section>
      <section className="travelling"><span className="toolbar-label">Travelling as</span><div className="segmented">{GROUPS.map(g => <button key={g} className={group === g ? "selected" : ""} aria-pressed={group === g} onClick={() => pick(group, g, setGroup, null)}>{cap(g)}</button>)}</div></section>
      <details className="more-filters" open={open} onToggle={e => setOpen(e.currentTarget.open)}><summary>More filters {active ? <span className="count-badge">{active}</span> : null}</summary><div className="filter-popover">
        <label>Type<select value={type} onChange={e => setType(e.target.value)}><option value="">Any type</option>{TYPES.map(v => <option key={v} value={v}>{cap(v)}</option>)}</select></label>
        <label>Region<select value={region} onChange={e => setRegion(e.target.value)}><option value="">Anywhere</option>{REGIONS.map(v => <option key={v} value={v}>{cap(v)}</option>)}</select></label>
        <fieldset><legend>Weekend spend</legend>{SPEND.map((s, i) => <button key={s[0]} className={spend === i ? "filter-choice on" : "filter-choice"} onClick={() => pick(spend, i, setSpend, -1)}>{s[0]}</button>)}</fieldset>
        <label className="month-check"><input type="checkbox" checked={month} onChange={e => { setMonth(e.target.checked); trackEvent("filter") }} /> Good this month</label>
        <button className="link" onClick={clear}>Clear filters</button></div></details>
    </div>
    {error ? <ErrorBox msg={error} retry={load} /> : !all ? <Skeleton /> : <>
      {!filtered && <><Row title="Top rated" items={by(d => d.summary.count ? d.summary.average * 100 + d.summary.count : -1).filter(d => d.summary.count)} group={null} /><Row title="Best for solo" items={[...all].filter(d => d.suits.includes("solo")).sort((a, b) => scoreFor(b.summary, "solo").value - scoreFor(a.summary, "solo").value).slice(0, 6)} group="solo" /><Row title="Best on a budget" items={[...all].sort((a, b) => a.spendLow - b.spendLow).slice(0, 6)} group={null} /><Row title="Newly updated" items={all.filter(d => d.lastUpdated).sort((a, b) => b.lastUpdated!.localeCompare(a.lastUpdated!)).slice(0, 6)} group={null} /></>}
      <div className="listhead"><div><p className="eyebrow">FIND YOUR NEXT</p><h2>{filtered ? `${list.length} place${list.length === 1 ? "" : "s"}` : "All places"}</h2></div><label className="sort">Sort <select value={sort} onChange={e => setSort(e.target.value)}>{SORTS.map(s => <option key={s}>{s}</option>)}</select></label></div>
      {list.length ? <div className="directory-grid">{list.map(d => <Card key={d.slug} d={d} group={group} />)}</div> : <div className="notice"><p>No places match. Clear a filter.</p><button className="btn" onClick={clear}>Clear</button></div>}
    </>}
  </main><Footer /></>
}
