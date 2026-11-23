import { MIN_GROUP_RATINGS } from "../config"
import type { Group, Summary } from "../types"
// Overall ranking, or a group ranking only when that group has enough ratings; otherwise fall back and say so.
export function scoreFor(s: Summary, group: Group | null) {
  if (group) {
    const g = s.byGroup[group]
    if (g && g.count >= MIN_GROUP_RATINGS) return { value: g.average, count: g.count, fallback: false }
    return { value: s.count ? s.average : 0, count: s.count, fallback: true }
  }
  return { value: s.count ? s.average : 0, count: s.count, fallback: false }
}
