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

const ioskeleyMono = localFont({
  src: [
    {
      path: './fonts/IoskeleyMono-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: './fonts/IoskeleyMono-SemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
  ],
  variable: '--font-ioskeley-mono',
});

export const metadata: Metadata = {
  title: 'Vanish',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${ioskeleyMono.variable} antialiased`}
      >
        <div data-vaul-drawer-wrapper="" className="bg-background min-h-svh">
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </div>
      </body>
    </html>
  );
}
