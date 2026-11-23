// node scripts/gen-seed.mjs        -> db/seed.sql (real places and spots, NO reviews)
// node scripts/gen-seed.mjs demo   -> db/demo.sql (clearly flagged SAMPLE reviews for local preview only; never run in production)
import { places, spots } from "../data/places.mjs"
import { writeFileSync } from "node:fs"
const q = v => v == null || v === "" ? "NULL" : typeof v === "number" ? String(v) : "'" + String(v).replace(/'/g, "''") + "'"
const out = []
for (const p of places) {
  const [slug, name, state, region, type, emoji, vibes, months, lo, hi, suits, lat, lon, stays] = p.split("|")
  out.push(`INSERT OR REPLACE INTO destinations VALUES (${[slug, name, state, region, type, emoji, vibes, months, +lo, +hi, suits, +lat, +lon, stays].map(q).join(",")});`)
  out.push(`INSERT OR REPLACE INTO properties VALUES (${q(slug)},${q("goSTOPS " + name)},${q(slug)});`)
}
spots.forEach(s => {
  const [dest, name, cat, tr, du, ind, suits, pr] = s.split("|")
  const id = dest + "-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  out.push(`INSERT OR REPLACE INTO spots VALUES (${[id, dest, name, cat, +tr, +du, +ind, suits, +pr].map(q).join(",")});`)
})
if (process.argv[2] === "demo") {
  const groups = ["solo", "couple", "friends", "family"], tags = ["worth_it", "crowded", "pricey", "hidden_gem", "unsafe_night", null, null]
  let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const demo = []
  for (const p of places) {
    const dest = p.split("|")[0], ds = spots.filter(s => s.startsWith(dest + "|"))
    for (let i = 0; i < 14; i++) {
      const id = `demo-${dest}-${i}`, g = groups[Math.floor(r() * 4)]
      demo.push(`INSERT INTO submissions VALUES ('${id}','${dest}','${g}',${i % 3 ? "NULL" : "'Sample review text'"},'demo','${new Date(Date.now() - r() * 20 * 86400000).toISOString()}',${Math.floor(r() * 6)},1);`)
      for (const s of ds) if (r() > .3) {
        const sid = dest + "-" + s.split("|")[1].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
        demo.push(`INSERT INTO ratings (submission_id,spot_id,score,tag) VALUES ('${id}','${sid}',${r() > .75 ? 1 : r() > .5 ? 2 : 3},${q(tags[Math.floor(r() * 7)])});`)
      }
    }
  }
  writeFileSync("db/demo.sql", demo.join("\n")); console.log("wrote db/demo.sql (SAMPLE data, flagged sample=1)")
} else { writeFileSync("db/seed.sql", out.join("\n")); console.log("wrote db/seed.sql:", places.length, "places,", spots.length, "spots") }
