export type Group = "solo" | "couple" | "friends" | "family"
export type Vibe = "chill" | "adventure" | "party" | "soul" | "culture"
export type PlaceType = "mountain" | "forest" | "city" | "beach" | "heritage"
export type Tag = "worth_it" | "crowded" | "pricey" | "hidden_gem" | "unsafe_night"
export const GROUPS: Group[] = ["solo", "couple", "friends", "family"]
export const TAGS: Tag[] = ["worth_it", "crowded", "pricey", "hidden_gem", "unsafe_night"]
export interface Summary { count: number; average: number; dist: [number, number, number]; byGroup: Partial<Record<Group, { count: number; average: number }>>; tags: Partial<Record<Tag, number>> }
export interface Destination { cover?: string | null; slug: string; name: string; state: string; region: string; type: PlaceType; emoji: string; vibes: Vibe[]; bestMonths: number[]; spendLow: number; spendHigh: number; suits: Group[]; staysUrl: string; summary: Summary; lastUpdated: string | null }
export interface Spot { id: string; name: string; category: string; durationMin: number; travelMin: number; indoor: boolean; suits: Group[]; priority: number; summary: Summary }
export interface Review { id: string; group: Group; score: number; comment: string | null; createdAt: string; helpful: number; sample: boolean }
export interface Photo { id: string; url: string; spotId: string | null; takenAt: string | null; uploadedAt: string; verified: boolean; sample: boolean }
export interface Service { id: string; destination: string; kind: string; name: string; note: string | null; updatedAt: string }
export interface Update { id: string; destination: string; category: string; text: string; createdAt: string; expiresAt: string }
export interface ForecastDay { date: string; tempMin: number; tempMax: number; rainChance: number; snowCm: number; label: string }
export interface PlaceData { destination: Destination; spots: Spot[]; reviews: Review[]; photos: Photo[]; services: Service[]; updates: Update[]; forecast: ForecastDay[] }
