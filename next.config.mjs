// Export statique (GitHub Pages) : `next build` écrit le site dans out/. Le moteur 3D (src/engine) n'a aucune dépendance à React ; Next ne sert ici que de support.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';   // ex. /space-discover pour https://<user>.github.io/space-discover/

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
  devIndicators: { position: 'bottom-right' },   // pastille « N » du mode dev
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*'],   // test depuis un téléphone du réseau local en mode dev
};

export default nextConfig;
