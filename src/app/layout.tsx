import type { Metadata, Viewport } from "next"
import "./globals.css"
import type React from "react"
import MidLayout from "./mid-layout"
import { ElectronClassProvider } from "./electron-class-provider"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export const metadata: Metadata = {
  title: "TMDB维护助手",
  description: "管理和维护TMDB词条的专业工具",
  generator: 'v0.dev',
  icons: {
    icon: '/tmdb-helper-logo.png',
    shortcut: '/tmdb-helper-logo.png',
    apple: '/tmdb-helper-logo.png',
  }
}

const themeApplyScript = `
(function() {
  try {
    var saved = localStorage.getItem('theme_engine_state');
    if (!saved) return;
    var state = JSON.parse(saved);
    if (!state || !state.themeId) return;

    var themes = {
      'default-dark': { bg:'222.2 84% 4.9%', fg:'210 40% 98%', card:'222.2 84% 4.9%', cardFg:'210 40% 98%', primary:'217.2 91.2% 59.8%', primaryFg:'222.2 84% 4.9%', secondary:'217.2 32.6% 17.5%', secondaryFg:'210 40% 98%', muted:'217.2 32.6% 17.5%', mutedFg:'215 20.2% 65.1%', accent:'217.2 32.6% 17.5%', accentFg:'210 40% 98%', destructive:'0 62.8% 30.6%', destructiveFg:'210 40% 98%', border:'217.2 32.6% 17.5%', input:'217.2 32.6% 17.5%', ring:'224.3 76.3% 94.1%', radius:'0.5rem', appearance:'dark' },
      'default-light': { bg:'0 0% 100%', fg:'222.2 84% 4.9%', card:'0 0% 100%', cardFg:'222.2 84% 4.9%', primary:'221.2 83.2% 53.3%', primaryFg:'210 40% 98%', secondary:'210 40% 96%', secondaryFg:'222.2 84% 4.9%', muted:'210 40% 96%', mutedFg:'215.4 16.3% 46.9%', accent:'210 40% 96%', accentFg:'222.2 84% 4.9%', destructive:'0 84.2% 60.2%', destructiveFg:'210 40% 98%', border:'214.3 31.8% 91.4%', input:'214.3 31.8% 91.4%', ring:'221.2 83.2% 53.3%', radius:'0.5rem', appearance:'light' },
      'nord': { bg:'220 13% 18%', fg:'180 20% 95%', card:'220 13% 22%', cardFg:'180 20% 95%', primary:'210 40% 60%', primaryFg:'220 13% 18%', secondary:'220 13% 25%', secondaryFg:'180 20% 95%', muted:'220 13% 25%', mutedFg:'210 15% 65%', accent:'220 13% 28%', accentFg:'180 20% 95%', destructive:'0 60% 50%', destructiveFg:'180 20% 95%', border:'220 13% 28%', input:'220 13% 28%', ring:'210 40% 60%', radius:'0.5rem', appearance:'dark' },
      'dracula': { bg:'240 10% 6%', fg:'240 10% 95%', card:'240 8% 12%', cardFg:'240 10% 95%', primary:'270 76% 68%', primaryFg:'240 10% 6%', secondary:'240 6% 18%', secondaryFg:'240 10% 95%', muted:'240 6% 18%', mutedFg:'240 5% 60%', accent:'320 60% 50%', accentFg:'240 10% 95%', destructive:'0 70% 55%', destructiveFg:'240 10% 95%', border:'240 6% 20%', input:'240 6% 20%', ring:'270 76% 68%', radius:'0.75rem', appearance:'dark' },
      'catppuccin-mocha': { bg:'240 21% 12%', fg:'225 20% 92%', card:'240 21% 15%', cardFg:'225 20% 92%', primary:'267 70% 68%', primaryFg:'240 21% 12%', secondary:'240 18% 20%', secondaryFg:'225 20% 95%', muted:'240 18% 20%', mutedFg:'240 12% 60%', accent:'340 50% 65%', accentFg:'240 21% 12%', destructive:'0 65% 60%', destructiveFg:'225 20% 92%', border:'240 18% 22%', input:'240 18% 22%', ring:'267 70% 68%', radius:'0.75rem', appearance:'dark' },
      'tokyo-night': { bg:'232 25% 10%', fg:'225 25% 90%', card:'232 25% 14%', cardFg:'225 25% 90%', primary:'218 60% 70%', primaryFg:'232 25% 10%', secondary:'232 20% 18%', secondaryFg:'225 25% 90%', muted:'232 20% 18%', mutedFg:'225 15% 58%', accent:'330 50% 65%', accentFg:'225 25% 90%', destructive:'0 60% 55%', destructiveFg:'225 25% 90%', border:'232 20% 20%', input:'232 20% 20%', ring:'218 60% 70%', radius:'0.5rem', appearance:'dark' },
      'monokai-pro': { bg:'240 8% 12%', fg:'240 14% 90%', card:'240 8% 16%', cardFg:'240 14% 90%', primary:'35 92% 62%', primaryFg:'240 8% 12%', secondary:'240 6% 20%', secondaryFg:'240 14% 90%', muted:'240 6% 20%', mutedFg:'240 8% 55%', accent:'180 62% 55%', accentFg:'240 8% 12%', destructive:'0 72% 55%', destructiveFg:'240 14% 90%', border:'240 6% 22%', input:'240 6% 22%', ring:'35 92% 62%', radius:'0.5rem', appearance:'dark' },
      'github-dark': { bg:'220 13% 7%', fg:'210 40% 96%', card:'220 13% 10%', cardFg:'210 40% 96%', primary:'212 92% 55%', primaryFg:'220 13% 7%', secondary:'220 10% 16%', secondaryFg:'210 40% 96%', muted:'220 10% 16%', mutedFg:'215 15% 58%', accent:'212 92% 55%', accentFg:'220 13% 7%', destructive:'0 72% 55%', destructiveFg:'210 40% 96%', border:'220 10% 18%', input:'220 10% 18%', ring:'212 92% 55%', radius:'0.5rem', appearance:'dark' },
      'material-ocean': { bg:'210 22% 10%', fg:'198 50% 90%', card:'210 22% 14%', cardFg:'198 50% 90%', primary:'200 100% 55%', primaryFg:'210 22% 10%', secondary:'210 18% 18%', secondaryFg:'198 50% 90%', muted:'210 18% 18%', mutedFg:'200 15% 60%', accent:'160 60% 50%', accentFg:'210 22% 10%', destructive:'0 70% 55%', destructiveFg:'198 50% 90%', border:'210 18% 20%', input:'210 18% 20%', ring:'200 100% 55%', radius:'0.5rem', appearance:'dark' },
      'rose-pine': { bg:'240 20% 10%', fg:'230 20% 88%', card:'240 20% 14%', cardFg:'230 20% 88%', primary:'340 50% 65%', primaryFg:'240 20% 10%', secondary:'240 15% 18%', secondaryFg:'230 20% 88%', muted:'240 15% 18%', mutedFg:'230 12% 58%', accent:'170 45% 55%', accentFg:'240 20% 10%', destructive:'0 65% 55%', destructiveFg:'230 20% 88%', border:'240 15% 20%', input:'240 15% 20%', ring:'340 50% 65%', radius:'0.75rem', appearance:'dark' },
      'gruvbox-dark': { bg:'25 12% 10%', fg:'40 40% 85%', card:'25 12% 14%', cardFg:'40 40% 85%', primary:'35 80% 60%', primaryFg:'25 12% 10%', secondary:'25 10% 18%', secondaryFg:'40 40% 85%', muted:'25 10% 18%', mutedFg:'25 8% 55%', accent:'140 45% 50%', accentFg:'25 12% 10%', destructive:'0 65% 55%', destructiveFg:'40 40% 85%', border:'25 10% 20%', input:'25 10% 20%', ring:'35 80% 60%', radius:'0.5rem', appearance:'dark' },
      'sunset': { bg:'15 20% 10%', fg:'30 30% 90%', card:'15 20% 14%', cardFg:'30 30% 90%', primary:'15 85% 55%', primaryFg:'15 20% 10%', secondary:'15 15% 18%', secondaryFg:'30 30% 90%', muted:'15 15% 18%', mutedFg:'15 10% 55%', accent:'340 65% 55%', accentFg:'15 20% 10%', destructive:'0 70% 55%', destructiveFg:'30 30% 90%', border:'15 15% 20%', input:'15 15% 20%', ring:'15 85% 55%', radius:'0.75rem', appearance:'dark' },
      'ocean': { bg:'200 25% 8%', fg:'195 40% 90%', card:'200 25% 12%', cardFg:'195 40% 90%', primary:'190 80% 50%', primaryFg:'200 25% 8%', secondary:'200 18% 16%', secondaryFg:'195 40% 90%', muted:'200 18% 16%', mutedFg:'200 12% 55%', accent:'160 55% 48%', accentFg:'200 25% 8%', destructive:'0 70% 55%', destructiveFg:'195 40% 90%', border:'200 18% 18%', input:'200 18% 18%', ring:'190 80% 50%', radius:'0.5rem', appearance:'dark' },
      'forest': { bg:'140 15% 8%', fg:'130 20% 88%', card:'140 15% 12%', cardFg:'130 20% 88%', primary:'130 55% 45%', primaryFg:'140 15% 8%', secondary:'140 12% 16%', secondaryFg:'130 20% 88%', muted:'140 12% 16%', mutedFg:'140 10% 55%', accent:'45 60% 50%', accentFg:'140 15% 8%', destructive:'0 65% 55%', destructiveFg:'130 20% 88%', border:'140 12% 18%', input:'140 12% 18%', ring:'130 55% 45%', radius:'0.5rem', appearance:'dark' },
      'catppuccin-latte': { bg:'240 20% 98%', fg:'240 15% 15%', card:'240 20% 96%', cardFg:'240 15% 15%', primary:'267 55% 55%', primaryFg:'240 20% 98%', secondary:'240 12% 92%', secondaryFg:'240 15% 15%', muted:'240 12% 92%', mutedFg:'240 10% 55%', accent:'340 40% 55%', accentFg:'240 20% 98%', destructive:'0 55% 50%', destructiveFg:'240 20% 98%', border:'240 12% 90%', input:'240 12% 90%', ring:'267 55% 55%', radius:'0.75rem', appearance:'light' },
      'github-light': { bg:'210 20% 98%', fg:'210 15% 12%', card:'0 0% 100%', cardFg:'210 15% 12%', primary:'212 92% 45%', primaryFg:'0 0% 100%', secondary:'210 15% 94%', secondaryFg:'210 15% 12%', muted:'210 15% 94%', mutedFg:'210 10% 45%', accent:'212 92% 45%', accentFg:'0 0% 100%', destructive:'0 65% 50%', destructiveFg:'0 0% 100%', border:'210 12% 90%', input:'210 12% 90%', ring:'212 92% 45%', radius:'0.5rem', appearance:'light' }
    };

    var t = themes[state.themeId];
    if (!t) return;

    var root = document.documentElement;
    root.setAttribute('data-theme', state.themeId);
    if (t.appearance === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');

    var map = { bg:'--background', fg:'--foreground', card:'--card', cardFg:'--card-foreground', primary:'--primary', primaryFg:'--primary-foreground', secondary:'--secondary', secondaryFg:'--secondary-foreground', muted:'--muted', mutedFg:'--muted-foreground', accent:'--accent', accentFg:'--accent-foreground', destructive:'--destructive', destructiveFg:'--destructive-foreground', border:'--border', input:'--input', ring:'--ring', radius:'--radius' };
    Object.keys(map).forEach(function(k) { if (t[k]) root.style.setProperty(map[k], t[k]); });

    var c = state.customizations;
    if (c && c.border && c.border.radius) {
      var rMap = { none:'0', sm:'0.25rem', md:'0.5rem', lg:'0.75rem', xl:'1rem' };
      root.style.setProperty('--radius', rMap[c.border.radius] || t.radius);
    }
    if (c && c.typography && c.typography.fontSize) {
      var fMap = { small:'14px', medium:'16px', large:'18px' };
      root.style.setProperty('--font-size-base', fMap[c.typography.fontSize] || '16px');
    }

  } catch(e) {}
})();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeApplyScript }} />
      </head>
      <body>
        <ElectronClassProvider>
          <MidLayout>{children}</MidLayout>
        </ElectronClassProvider>
      </body>
    </html>
  )
}
