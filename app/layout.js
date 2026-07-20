import { Fraunces, Inter } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://flashkhabar.example.com';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'FlashKhabar — Live India & World News, Updated Every 5 Minutes',
    template: '%s | FlashKhabar',
  },
  description:
    'Taaza khabrein — India, World, Business, Technology, Sports aur Entertainment. Auto-updated news, short summaries, direct source links.',
  openGraph: {
    type: 'website',
    siteName: 'FlashKhabar',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-IN" className={`${fraunces.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
