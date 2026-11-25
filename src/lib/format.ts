export const rupees = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN")
export function timeAgo(iso: string | null | undefined) {
  if (!iso) return ""
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d <= 0) return "today"
  if (d === 1) return "yesterday"
  if (d < 30) return `${d} days ago`
  if (d < 365) return `${Math.floor(d / 30)} mo ago`
  return `${Math.floor(d / 365)} yr ago`
}
export const stars = (avg: number) => (avg ? Math.round((1 + (avg - 1) * 2) * 10) / 10 : 0) // 1-3 scale -> 1-5 stars
export const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0)
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
export const TAG_LABEL: Record<string, string> = { worth_it: "Worth it", crowded: "Crowded", pricey: "Pricey", hidden_gem: "Hidden gem", unsafe_night: "Unsafe at night" }
