// Reads the date a photo was taken (EXIF) BEFORE compressing. Re-encoding through canvas then strips location data.
export async function exifDate(file: File): Promise<string | null> {
  try {
    const buf = await file.slice(0, 131072).arrayBuffer()
    const v = new DataView(buf)
    if (v.getUint16(0) !== 0xffd8) return null
    let off = 2
    while (off < v.byteLength - 4) {
      const marker = v.getUint16(off)
      const len = v.getUint16(off + 2)
      if (marker === 0xffe1 && v.getUint32(off + 4) === 0x45786966) {
        const t = off + 10
        const le = v.getUint16(t) === 0x4949
        const u16 = (o: number) => v.getUint16(t + o, le)
        const u32 = (o: number) => v.getUint32(t + o, le)
        const read = (ifd: number, want: number): number | null => {
          const n = u16(ifd)
          for (let i = 0; i < n; i++) {
            const e = ifd + 2 + i * 12
            if (u16(e) === want) return u32(e + 8)
          }
          return null
        }
        const ifd0 = u32(4)
        const exif = read(ifd0, 0x8769)
        if (exif == null) return null
        const p = read(exif, 0x9003) ?? read(exif, 0x9004)
        if (p == null) return null
        let s = ""
        for (let i = 0; i < 19; i++) s += String.fromCharCode(v.getUint8(t + p + i))
        const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(s)
        if (!m) return null
        const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])
        return isNaN(d.getTime()) ? null : d.toISOString()
      }
      if ((marker & 0xff00) !== 0xff00) break
      off += 2 + len
    }
  } catch {}
  return null
}
export async function compress(file: File, maxW = 1280): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, maxW / bmp.width)
  const c = document.createElement("canvas")
  c.width = Math.round(bmp.width * scale)
  c.height = Math.round(bmp.height * scale)
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height)
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error("Could not read that photo"))), "image/jpeg", 0.72))
}
