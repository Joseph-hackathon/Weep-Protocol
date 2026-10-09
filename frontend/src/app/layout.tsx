import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AccountDock from "./AccountDock";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPTION = "Pay a whole group at once, to the exact cent. Say who gets what, check it, and everyone is paid in one Monad transaction.";

export const metadata: Metadata = {
  metadataBase: new URL("https://weep-protocol.vercel.app"),
  title: "Weep",
  description: DESCRIPTION,
  openGraph: { type: "website", url: "/", siteName: "Weep", title: "Weep: gratitude, onchain", description: DESCRIPTION },
  twitter: { card: "summary_large_image", site: "@WeepProtocol", creator: "@WeepProtocol", title: "Weep: gratitude, onchain", description: DESCRIPTION },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <AccountDock />
      </body>
    </html>
  );
}
