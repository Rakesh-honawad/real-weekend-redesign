"use client"
import Link from "next/link"
import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { getPlace, markHelpful, reportPhoto, trackEvent } from "../../src/lib/api"
import { scoreFor } from "../../src/lib/rank"
import { cap, pct, rupees, timeAgo, TAG_LABEL, stars } from "../../src/lib/format"
import { MIN_GROUP_RATINGS } from "../../src/config"
import { Chip, Dist, ErrorBox, Footer, Header, Sample, Share, Skeleton, Stars, TopTags } from "../../src/components/ui"
import { GROUPS, type Group, type PlaceData, type Spot } from "../../src/types"

const TIMES = [["Half day", 240], ["Full day", 540], ["2 days", 960]] as const
const FACE = ["", "😕", "🙂", "😍"]
const ICON: Record<string, string> = { weather: "🌦️", road: "🚧", closure: "⛔", transport: "🚌", event: "🎉", upcoming: "🗓️" }

function SpotRow({ s, group, skip }: { s: Spot; group: Group | null; skip: boolean }) {
  const sc = scoreFor(s.summary, group), mins = s.durationMin + s.travelMin * 2
  return (
    <article className={"spot" + (skip ? " dim" : "")}>
      <div><h4>{s.name}</h4><p className="muted small">{(mins / 60).toFixed(1)}h with travel · {s.category}{s.indoor ? " · indoor" : ""}</p><TopTags s={s.summary} /></div>
      <div className="spot-r"><Stars avg={sc.value} count={sc.count} />
        {group && sc.fallback && <span className="muted small">Not enough {group} ratings yet{s.suits.includes(group) && <span className="tag pick">Our pick</span>}</span>}
        {skip && <span className="tag warn">Skip if you&apos;re short on time</span>}</div>
    </article>
  )
}

function Place() {
  const slug = useSearchParams().get("s") || ""
  const [data, setData] = useState<PlaceData | null>(null), [error, setError] = useState("")
  const [group, setGroup] = useState<Group | null>(null), [time, setTime] = useState(0), [sort, setSort] = useState("helpful"), [shown, setShown] = useState(5)
  const [lightbox, setLightbox] = useState(""), [helped, setHelped] = useState<string[]>([]), [reported, setReported] = useState<string[]>([])
  const load = useCallback(() => { setError(""); setData(null); getPlace(slug).then(setData).catch(e => setError(e.message)) }, [slug])
  useEffect(() => { if (slug) { load(); trackEvent("visit") } }, [slug, load])

  const ordered = useMemo(() => {
    if (!data) return { fit: [] as Spot[], skip: [] as Spot[], rain: [] as Spot[] }
    const rated = data.spots.some(s => s.summary.count)
    const sorted = [...data.spots].sort((a, b) => {
      const A = scoreFor(a.summary, group), B = scoreFor(b.summary, group)
      if (!!A.count !== !!B.count) return B.count ? 1 : -1
      return B.value - A.value || b.priority - a.priority
    })
    let fit = sorted, skip: Spot[] = []
    if (time) { let used = 0; fit = []; sorted.forEach(s => { const c = s.durationMin + s.travelMin * 2; if (used + c <= TIMES[time - 1][1] * .75) { fit.push(s); used += c } else skip.push(s) }) }
    else if (rated) { const cut = Math.floor(sorted.length * 2 / 3); fit = sorted.slice(0, cut); skip = sorted.slice(cut) }
    return { fit, skip, rain: sorted.filter(s => s.indoor) }
  }, [data, group, time])

  if (!slug) return <ErrorBox msg="Pick a place from the home page." />
  if (error) return <ErrorBox msg={error} retry={load} />
  if (!data) return <Skeleton n={3} />
  const d = data.destination, S = d.summary, sc = scoreFor(S, group), good = d.bestMonths.includes(new Date().getMonth() + 1)
  const reviews = data.reviews.filter(r => !group || r.group === group).sort((a, b) => sort === "helpful" ? b.helpful - a.helpful : b.createdAt.localeCompare(a.createdAt))
  const shareText = `${d.name} on Real Weekend: ${S.count ? stars(S.average).toFixed(1) + "/5 from travellers" : "check it before you go"}.`
  const summaryCard = (
    <div className="card sum">
      <Stars avg={S.average} count={S.count} />
      {S.count > 0 && <><Dist s={S} /><div className="tagbars">{(Object.keys(TAG_LABEL) as (keyof typeof TAG_LABEL)[]).map(t => <div key={t} className="dist-row"><span>{TAG_LABEL[t]}</span><div className="bar"><i style={{ width: pct((S.tags as any)[t] || 0, S.count) + "%" }} /></div><span className="muted">{pct((S.tags as any)[t] || 0, S.count)}%</span></div>)}</div>
        <p className="muted small">Who rated: {GROUPS.map(g => `${cap(g)} ${S.byGroup[g]?.count || 0}`).join(" · ")}</p></>}
      <div className="side-actions"><Link className="btn primary" href={`/rate?p=${d.slug}`}>Rate this place</Link><Share text={shareText} onShared={() => trackEvent("share")} /><a className="link" href={d.staysUrl} target="_blank" rel="noopener noreferrer">See stays for this weekend</a></div>
    </div>
  )
  return (
    <>
      <main className="wrap place">
        <Link href="/" className="back">← All places</Link>
        <header className="place-banner" style={d.cover ? { backgroundImage: `linear-gradient(90deg, rgba(14,24,23,.78), rgba(14,24,23,.12)), url("${d.cover}")` } : undefined}>
          <div className="banner-copy"><p className="eyebrow">A TRAVELLER&apos;S FIELD GUIDE</p><h1>{d.name}</h1><p>{d.state} · typical weekend {rupees(d.spendLow)} to {rupees(d.spendHigh)} <span className="tag">rough</span></p><Stars avg={S.average} count={S.count} /><span className={"tag " + (good ? "good" : "warn")}>{good ? "Good this month" : "Off season"}</span><Share text={`${d.name} on Real Weekend: ${S.count ? stars(S.average).toFixed(1) + "/5 from travellers" : "check it before you go"}.`} onShared={() => trackEvent("share")} /></div>
        </header>
        <nav className="place-nav" aria-label="On this page">{[["Overview", "overview"], ["Spots", "spots"], ["Reviews", "reviews"], ["Photos", "photos"], ["Things to know", "things"]].map(([label, id]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
        <div className="pgrid">
          <div className="pmain">
            <div className="mobile-only">{summaryCard}</div>
            <section id="overview"><h2>Who is it for?</h2><div className="chips"><Chip on={!group} onClick={() => setGroup(null)}>All</Chip>{GROUPS.map(g => <Chip key={g} on={group === g} onClick={() => { setGroup(group === g ? null : g); trackEvent("filter") }}>{cap(g)}</Chip>)}</div>
              {group && sc.fallback && <p className="muted small">Not enough {group} ratings yet (needs {MIN_GROUP_RATINGS} per spot). Showing overall ratings.{d.suits.includes(group) && <span className="tag pick">Our pick for {group}</span>}</p>}</section>
            <section id="spots"><h2>Where to spend your time</h2>
              <div className="chips"><span className="muted small">How long do you have?</span>{TIMES.map((t, i) => <Chip key={t[0]} on={time === i + 1} onClick={() => setTime(time === i + 1 ? 0 : i + 1)}>{t[0]}</Chip>)}</div>
              {ordered.fit.map(s => <SpotRow key={s.id} s={s} group={group} skip={false} />)}
              {ordered.skip.length > 0 && <details open={!time}><summary>Skip if short on time ({ordered.skip.length})</summary>{ordered.skip.map(s => <SpotRow key={s.id} s={s} group={group} skip />)}</details>}
              {ordered.rain.length > 0 && <details><summary>Plan B for rain or crowds</summary>{ordered.rain.map(s => <SpotRow key={s.id} s={s} group={group} skip={false} />)}</details>}
            </section>
            <section id="reviews"><div className="listhead"><h2>Reviews</h2><label className="sort">Sort <select value={sort} onChange={e => setSort(e.target.value)}><option value="helpful">Most helpful</option><option value="new">Newest</option></select></label></div>
              {reviews.length ? reviews.slice(0, shown).map(r => (
                <article key={r.id} className="card review"><p><span className="face">{FACE[r.score]}</span> <b>{cap(r.group)} traveller</b> <span className="muted small">{timeAgo(r.createdAt)}</span> {r.sample && <Sample />}</p>
                  {r.comment && <p>{r.comment}</p>}
                  <button className="link" disabled={helped.includes(r.id)} onClick={() => { markHelpful(r.id); setHelped([...helped, r.id]) }}>Helpful ({r.helpful + (helped.includes(r.id) ? 1 : 0)})</button></article>
              )) : <p className="muted">No reviews yet. Been here? Be the first, it takes 2 minutes.</p>}
              {reviews.length > shown && <button className="btn" onClick={() => setShown(shown + 5)}>Load more</button>}
              <Link className="btn primary block" href={`/rate?p=${d.slug}`}>Been here? Rate it in 2 minutes</Link></section>
            <section id="photos"><h2>Recent photos</h2>
              {data.photos.length ? <div className="photos">{[...data.photos].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)).map(p => (
                <figure key={p.id}><button className="ph" onClick={() => setLightbox(p.url)} aria-label="Open photo"><img src={p.url} alt={`Recent photo of ${d.name}`} loading="lazy" /></button>
                  <figcaption><span className={"tag " + (p.verified ? "good" : "")}>{p.verified && p.takenAt ? `Taken ${timeAgo(p.takenAt)}` : "Unverified date"}{p.sample && <span className="tag sample">Sample</span>}</span>
                    <button className="link small" disabled={reported.includes(p.id)} onClick={() => { reportPhoto(p.id); setReported([...reported, p.id]) }}>{reported.includes(p.id) ? "Reported" : "Report"}</button></figcaption></figure>))}</div>
                : <p className="muted">No photos yet. Add yours after you rate a place.</p>}</section>
            <section id="things"><h2>Things to know</h2>
              <div className="things-grid">
                {data.forecast.length > 0 && <article className="things-card"><h3><span className="thing-icon" aria-hidden="true">☼</span>5-day forecast</h3><div className="forecast">{data.forecast.map(f => <div key={f.date} className="fday"><b>{new Date(f.date).toLocaleDateString("en-IN", { weekday: "short" })}</b><span>{f.label}</span><span>{f.tempMin}° / {f.tempMax}°</span><span className="muted small">Rain {f.rainChance}%{f.snowCm > 0 ? ` · Snow ${f.snowCm}cm` : ""}</span></div>)}</div></article>}
                <article className="things-card"><h3><span className="thing-icon" aria-hidden="true">↗</span>Latest updates</h3>{data.updates.filter(u => u.category !== "upcoming").map(u => <p key={u.id} className="upd">{ICON[u.category]} {u.text} <span className="muted small">{timeAgo(u.createdAt)}</span></p>)}{!data.updates.some(u => u.category !== "upcoming") && <p className="muted">Nothing unusual reported right now.</p>}</article>
                <article className="things-card"><h3><span className="thing-icon" aria-hidden="true">⌁</span>Services here</h3>{data.services.length ? Object.entries(data.services.reduce((m: Record<string, typeof data.services>, s) => ((m[s.kind] ||= []).push(s), m), {})).map(([k, v]) => <p key={k}><b>{cap(k)}:</b> {v.map(s => s.name + (s.note ? ` (${s.note})` : "")).join(", ")}</p>) : <p className="muted">Services will be listed here soon.</p>}</article>
                <article className="things-card"><h3><span className="thing-icon" aria-hidden="true">✳</span>Coming up</h3>{data.updates.filter(u => u.category === "upcoming").map(u => <p key={u.id} className="upd">{u.text}</p>)}{!data.updates.some(u => u.category === "upcoming") && <p className="muted">Nothing planned that we know of.</p>}</article>
              </div>
            </section>
            <a className="link" href={d.staysUrl} target="_blank" rel="noopener noreferrer">See stays for this weekend</a>
          </div>
          <aside className="pside desktop-only">{summaryCard}</aside>
        </div>
      </main>
      <div className="bar-fixed"><Share text={shareText} onShared={() => trackEvent("share")} /><Link className="btn primary" href={`/rate?p=${d.slug}`}>Rate this place</Link></div>
      {lightbox && <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setLightbox("")}><img src={lightbox} alt="Enlarged photo" /><button className="btn">Close</button></div>}
    </>
  )
}
export default function Page() { return <><Header /><Suspense fallback={<Skeleton n={3} />}><Place /></Suspense><Footer /></> }
