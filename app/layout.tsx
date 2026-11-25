import type { Metadata, Viewport } from "next"
import "./globals.css"
export const metadata: Metadata = {
  title: "Real Weekend: know a place before you go",
  description: "Short, honest, recent ratings, photos and local updates for weekend destinations in India."
}
export const viewport: Viewport = {
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f3e9" },
    { media: "(prefers-color-scheme: dark)", color: "#161a18" }
  ]
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
