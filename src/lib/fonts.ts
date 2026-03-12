import { DotGothic16, Noto_Sans_JP } from 'next/font/google';

export const dotGothicFont = DotGothic16({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dot-gothic',
});

export const notoSansJpFont = Noto_Sans_JP({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sans-jp',
});

export const uiFontCssVar = 'var(--font-dot-gothic), var(--font-noto-sans-jp), monospace';

export const stampCanvasFontFamily = `${dotGothicFont.style.fontFamily}, ${notoSansJpFont.style.fontFamily}, sans-serif`;
export const notoSansCanvasFontFamily = `${notoSansJpFont.style.fontFamily}, sans-serif`;
