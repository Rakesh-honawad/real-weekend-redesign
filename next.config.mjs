const dev = process.env.NODE_ENV === "development"
/** @type {import('next').NextConfig} */
export default {
  images: { unoptimized: true },
  allowedDevOrigins: ["192.168.0.168", "localhost"], // add your own LAN IP here if it changes
  // Production: fully static export. Dev: send /api calls to the local backend (wrangler, port 8788).
  ...(dev ? { async rewrites() { return [{ source: "/api/:path*", destination: "http://127.0.0.1:8788/api/:path*" }] } } : { output: "export" })
}
