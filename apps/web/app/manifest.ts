import type { MetadataRoute } from 'next';

/** The web manifest: the ingot icons and the forge's colors for installs and home screens. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'StylusForge',
    short_name: 'StylusForge',
    description: 'Learn Arbitrum Stylus smart contracts in Rust, in the browser, and earn on-chain certificates.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0c0f13',
    theme_color: '#0c0f13',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
