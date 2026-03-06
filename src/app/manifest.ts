import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'はかいしんのPDF工房',
    short_name: 'PDF工房',
    description: 'ダンジョン風PDF編集ツール',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d0804',
    theme_color: '#0d0804',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
