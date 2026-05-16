/** @type {import('next').NextConfig} */
const nextConfig = {
  // 开发环境不带 basePath，生产环境使用 /docFlow
  basePath: process.env.NODE_ENV === "production" ? "/docFlow" : "",
  output: "export",
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_URL || "http://localhost:8000"}/api/:path*`,
      },
    ]
  },
  images: {
    domains: ["localhost"],
  },
}

export default nextConfig
