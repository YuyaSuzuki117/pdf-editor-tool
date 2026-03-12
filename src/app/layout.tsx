import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { dotGothicFont, notoSansJpFont } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "はかいしんのPDF工房 | ダンジョン文書管理",
  description: "ダンジョンの奥深くで文書を掘削・編集するPDFツール",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⛏</text></svg>",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PDF工房",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0d0804",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${dotGothicFont.variable} ${notoSansJpFont.variable} antialiased`}>
        {children}
        <Script id="sw-register" strategy="lazyOnload">{`
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(function() {});
          }
        `}</Script>
      </body>
    </html>
  );
}
