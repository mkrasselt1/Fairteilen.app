/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Belegfotos werden im Browser verkleinert; die Grenze lässt Luft für PDFs.
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
