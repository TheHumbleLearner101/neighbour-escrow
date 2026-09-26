import type { Metadata } from "next";
import { Rubik, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const display = Rubik({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
});

const body = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Hearth — chip in for your street",
  description:
    "Neighbours pool money for shared local things. The money waits safely until the job is done. No bank account needed.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
