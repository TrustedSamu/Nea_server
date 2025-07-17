import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import "./lib/envSetup";

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-inter",
  display: "swap"
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap"
});

export const metadata: Metadata = {
  title: "NEA Dashboard - Realtime API Agents",
  description: "AI-powered employee management.",
  icons: {
    icon: [
      { url: '/New_Small_Black-Red.png' },
      { url: '/New_Small_White-Red.png', media: '(prefers-color-scheme: dark)' }
    ],
    shortcut: '/New_Small_Black-Red.png',
    apple: '/New_Small_Black-Red.png',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark">
      <body className={`${inter.variable} ${spaceGrotesk.variable} antialiased min-h-full h-full bg-dark text-light font-inter`}>
        {children}
      </body>
    </html>
  );
}
