"use client"
import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { getRatePage, submitRating, trackEvent } from "../../src/lib/api"
import { compress, exifDate } from "../../src/lib/photo"
import { cap, TAG_LABEL } from "../../src/lib/format"
import { Chip, ErrorBox, Footer, Header, Share, Skeleton } from "../../src/components/ui"
import { GROUPS, TAGS, type Group, type Spot, type Tag } from "../../src/types"

const FACES = [["😕", "Bad", 1], ["🙂", "Okay", 2], ["😍", "Great", 3]] as const
type Pending = { blob: Blob; takenAt: string | null; preview: string }

function Flow() {
  const slug = useSearchParams().get("p") || ""
  const [info, setInfo] = useState<Awaited<ReturnType<typeof getRatePage>> | null>(null), [error, setError] = useState("")
  const [step, setStep] = useState(0), [group, setGroup] = useState<Group | null>(null)
  const [scores, setScores] = useState<Record<string, { score: number; tag?: Tag }>>({}), [photos, setPhotos] = useState<Pending[]>([])
  const [comment, setComment] = useState(""), [busy, setBusy] = useState(false), [done, setDone] = useState(false), [hp, setHp] = useState("")
  useEffect(() => { if (slug) getRatePage(slug).then(setInfo).catch(e => setError(e.message)) }, [slug])
  if (!slug) return <ErrorBox msg="This rating link isn't valid." />
  if (error) return <ErrorBox msg={error} />
  if (!info) return <Skeleton n={1} />
  const spots: Spot[] = info.spots, total = spots.length + 2, spot = spots[step - 1]
  const next = () => setStep(s => s + 1), back = () => setStep(s => Math.max(0, s - 1))
  const addPhotos = async (files: FileList | null) => {
    if (!files) return
    const out: Pending[] = []
    for (const f of Array.from(files).slice(0, 3 - photos.length)) {
      try { const takenAt = await exifDate(f), blob = await compress(f); out.push({ blob, takenAt, preview: URL.createObjectURL(blob) }) } catch { setError("") }
    }
    setPhotos([...photos, ...out].slice(0, 3))
  }
  const submit = async () => {
    setBusy(true); setError("")
    const form = new FormData()
    form.set("payload", JSON.stringify({ destination: info.destination.slug, group, ratings: Object.entries(scores).map(([spotId, v]) => ({ spotId, score: v.score, tag: v.tag })), comment, photos: photos.map(p => ({ takenAt: p.takenAt })) }))
    form.set("website", hp)
    photos.forEach((p, i) => form.append("photos", p.blob, `p${i}.jpg`))
    try { await submitRating(form); trackEvent("rating_done"); setDone(true) } catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }
  if (done) return (
    <main className="wrap flow"><div className="card center"><h1>Thanks. 🙌</h1><p>You just helped the next traveller.</p>
      <Share text={`I rated ${info.destination.name} on Real Weekend. Rate yours:`} onShared={() => trackEvent("share")} className="btn primary" /><Link className="link" href={`/place?s=${info.destination.slug}`}>See {info.destination.name}</Link></div></main>
  )
  return (
    <main className="wrap flow">
      <div className="progress" role="progressbar" aria-valuenow={step + 1} aria-valuemax={total}><i style={{ width: ((step + 1) / total) * 100 + "%" }} /></div>
      <p className="muted small">Ratings are about places, not the hostel. About 2 minutes.</p>
      <div className="card step">
        {step === 0 && <><h1>Who did you go with?</h1><div className="big-btns">{GROUPS.map(g => <button key={g} className={"btn big" + (group === g ? " primary" : "")} onClick={() => { setGroup(g); next() }}>{cap(g)}</button>)}</div></>}
        {spot && <><h1>Was {spot.name} worth your time?</h1>
          <div className="faces">{FACES.map(([e, l, v]) => <button key={l} className={"face-btn" + (scores[spot.id]?.score === v ? " on" : "")} onClick={() => setScores({ ...scores, [spot.id]: { ...scores[spot.id], score: v } })}><span>{e}</span>{l}</button>)}</div>
          <div className="chips">{TAGS.map(t => <Chip key={t} on={scores[spot.id]?.tag === t} onClick={() => scores[spot.id] && setScores({ ...scores, [spot.id]: { ...scores[spot.id], tag: scores[spot.id].tag === t ? undefined : t } })}>{TAG_LABEL[t]}</Chip>)}</div>
          <p className="muted small">Pick a face first, then an optional tag.</p>
          <div className="row"><button className="btn" onClick={() => { const c = { ...scores }; delete c[spot.id]; setScores(c); next() }}>Didn&apos;t visit</button><button className="btn primary" disabled={!scores[spot.id]} onClick={next}>Next</button></div></>}
        {step === total - 1 && <><h1>Add recent photos</h1><p className="muted">Up to 3. We read the date taken and strip hidden location data.</p>
          <input type="file" accept="image/*" multiple disabled={photos.length >= 3} aria-label="Add photos" onChange={e => addPhotos(e.target.files)} />
          <div className="photos">{photos.map((p, i) => <figure key={i}><img src={p.preview} alt="Preview" /><figcaption className="small">{p.takenAt ? "Date found" : "No date found"}</figcaption></figure>)}</div>
          <label className="small">One line about it (optional) <span className="muted">{comment.length}/140</span><textarea maxLength={140} rows={2} value={comment} onChange={e => setComment(e.target.value)} /></label>
          <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={hp} onChange={e => setHp(e.target.value)} />
          {error && <p role="alert" className="err">{error}</p>}
          <button className="btn primary block" disabled={busy || (!Object.keys(scores).length && !photos.length)} onClick={submit}>{busy ? "Sending…" : "Send my ratings"}</button></>}
      </div>
      {step > 0 && <div className="row"><button className="link" onClick={back}>Back</button>{step < total - 1 && step > 0 && <button className="link" onClick={next}>Skip</button>}</div>}
    </main>
  )
}
export default function Page() { return <><Header /><Suspense fallback={<Skeleton n={1} />}><Flow /></Suspense><Footer /></> }
