import type { Metadata } from "next";
import { Doto, Space_Grotesk, Space_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const doto = Doto({
  subsets: ["latin"],
  variable: "--font-doto",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Movie Builder",
  description: "AI Short Film Studio",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${doto.variable} ${spaceGrotesk.variable} ${spaceMono.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
