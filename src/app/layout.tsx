import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_KR, Geist_Mono } from "next/font/google";
import "./globals.css";

const softSans = IBM_Plex_Sans_KR({
  weight: ["400", "500", "600", "700"],
  variable: "--font-soft-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Our Little Earth",
  description: "Eco challenge app starter with Next.js, Firebase, and Kakao Map",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${softSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col overflow-x-hidden">{children}</body>
    </html>
  );
}
