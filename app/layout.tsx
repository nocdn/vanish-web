import type { Metadata } from 'next';
import { Geist, Geist_Mono, Inter } from 'next/font/google';
import localFont from 'next/font/local';

import './globals.css';

import { ConvexClientProvider } from './ConvexClientProvider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const ppSupplyMono = localFont({
  src: './fonts/PPSupplyMono-Variable.woff2',
  variable: '--font-pp-supply-mono',
});

export const metadata: Metadata = {
  title: 'Temp Emails AGAIN',
  description: 'Temp Emails AGAIN',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${ppSupplyMono.variable} antialiased`}
      >
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
