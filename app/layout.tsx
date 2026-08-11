import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from '@/lib/theme-provider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Fleet Compliance — EDR/XDR Monitoring',
  description: 'Enterprise fleet compliance monitoring platform for SOC analysts and IT admins.',
  generator: 'v0.app',
  icons: [
    { rel: 'icon', url: '/icon.svg' },
    { rel: 'apple', url: '/apple-icon.png' },
  ],
}

export const viewport: Viewport = {
  colorScheme: 'dark light',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0A0D12' },
    { media: '(prefers-color-scheme: light)', color: '#F4F6F9' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark bg-background ${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="antialiased font-sans">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('fleet-theme');
                  if (stored === 'light') {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                  } else if (stored === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <ThemeProvider>
          {children}
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
