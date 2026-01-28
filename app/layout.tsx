import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import localFont from "next/font/local";

import "./globals.css";

import { ConvexClientProvider } from "./ConvexClientProvider";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
});

const berkeleyMono = localFont({
	src: "./fonts/BerkeleyMono_Regular.woff2",
	variable: "--font-berkeley-mono",
});

export const metadata: Metadata = {
	title: "Vanish",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${berkeleyMono.variable} antialiased`}
			>
				<div data-vaul-drawer-wrapper="" className="bg-background min-h-screen">
					<ConvexClientProvider>{children}</ConvexClientProvider>
				</div>
			</body>
		</html>
	);
}
