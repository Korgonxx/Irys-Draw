import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from '@/components/providers'

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Irys Draw - Multiplayer Drawing Game",
  description: "Draw, guess, and store forever on Irys. A multiplayer game where creativity meets permanence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-white font-sans`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
