// The ONLY file that talks to the backend (Cloudflare Pages Functions under /api).
import type { Destination, PlaceData, Service, Spot, Update } from "../types"
import * as mock from "./mock"
const BASE = process.env.NEXT_PUBLIC_API_BASE || "/api"
export function deviceId() {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") return "mock-device"
  try {
    let id = localStorage.getItem("rw_device")
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("rw_device", id) }
    return id
  } catch { return "anon" }
}
function adminToken() { try { return sessionStorage.getItem("rw_admin") || "" } catch { return "" } }
async function call<T>(path: string, init: RequestInit = {}, admin = false): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set("x-device", deviceId())
  if (admin) headers.set("authorization", "Bearer " + adminToken())
  if (typeof init.body === "string") headers.set("content-type", "application/json")
  const res = await fetch(BASE + path, { ...init, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as any).error || "Something went wrong. Please try again.")
  return data as T
}
const post = (path: string, body: unknown, admin = false) => call<any>(path, { method: "POST", body: JSON.stringify(body) }, admin)

export const listDestinations = () => {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") return Promise.resolve(mock.mockDestinations())
  return call<Destination[]>("/destinations")
}
export const getPlace = (slug: string) => {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") return Promise.resolve(mock.mockPlace(slug))
  return call<PlaceData>("/destination/" + encodeURIComponent(slug))
}
export const getRatePage = (slug: string) => {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") return Promise.resolve(mock.mockRate(slug))
  return call<{ propertyName: string; destination: { slug: string; name: string }; spots: Spot[] }>("/property/" + encodeURIComponent(slug))
}
export const submitRating = (form: FormData) => {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") return Promise.resolve({ ok: true })
  return call<{ ok: boolean }>("/rate", { method: "POST", body: form })
}
export const markHelpful = (id: string) => {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") return Promise.resolve({ ok: true })
  return post("/helpful", { id })
}
export const reportPhoto = (id: string) => {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") return Promise.resolve({ ok: true })
  return post("/report", { id })
}
export function trackEvent(name: "visit" | "search" | "filter" | "rating_done" | "share") {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") return
  try {
    const body = JSON.stringify({ name })
    fetch(BASE + "/event", { method: "POST", body, headers: { "content-type": "application/json", "x-device": deviceId() }, keepalive: true })
  } catch {}
}
// admin
export async function adminLogin(password: string) {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") return
  const r = await post("/admin/login", { password })
  sessionStorage.setItem("rw_admin", r.token)
}
export const adminLoggedIn = () => {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") return true
  return !!adminToken()
}
export const adminLogout = () => {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") return
  return sessionStorage.removeItem("rw_admin")
}
export const adminData = (dest: string) => {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") { const data = mock.mockPlace(dest); return Promise.resolve({ services: data.services, updates: data.updates, spots: data.spots }) }
  return call<{ services: Service[]; updates: Update[]; spots: Spot[] }>("/admin/data?dest=" + dest, {}, true)
}
export const adminSave = (kind: "service" | "update" | "spot", item: unknown) => {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") return Promise.resolve({ ok: true })
  return post(`/admin/${kind}`, item, true)
}
export const adminDelete = (kind: "service" | "update", id: string) => {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") return Promise.resolve({ ok: true })
  return post(`/admin/${kind}/delete`, { id }, true)
}
export const adminReports = () => {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") return Promise.resolve([] as { id: string; url: string; destination: string; reports: number; hidden: boolean }[])
  return call<{ id: string; url: string; destination: string; reports: number; hidden: boolean }[]>("/admin/reports", {}, true)
}
export const adminHidePhoto = (id: string, hidden: boolean) => {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") return Promise.resolve({ ok: true })
  return post("/admin/photo", { id, hidden }, true)
}
export const adminStats = () => {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") return Promise.resolve(mock.mockStats())
  return call<{ visitors: number; searches: number; ratings: number; shares: number; days: { day: string; visitors: number }[] }>("/admin/stats", {}, true)
}

export const adminCoverUpload = (dest: string, file: Blob) => { const f = new FormData(); f.set("dest", dest); f.set("file", file, "cover.jpg"); return call<any>("/admin/cover", { method: "POST", body: f }, true) }
export const adminCoverUrl = (dest: string, url: string) => post("/admin/cover", { dest, url }, true)
export const adminCoverClear = (dest: string) => post("/admin/cover", { dest, clear: true }, true)
export const adminAddPlace = (place: unknown) => post("/admin/destination", place, true)