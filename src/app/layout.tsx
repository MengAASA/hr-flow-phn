import type { Metadata } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "./component/provider/Providers";

// Self-hosted (rather than next/font/google) so the dev server doesn't
// depend on reaching fonts.googleapis.com at compile time.
const poppins = localFont({
  src: [
    { path: "./fonts/poppins/poppins-300.woff2", weight: "300", style: "normal" },
    { path: "./fonts/poppins/poppins-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/poppins/poppins-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/poppins/poppins-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/poppins/poppins-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PHN FMS",
  description: "Human Resource Forms Management System",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} antialiased`} nonce={nonce} suppressHydrationWarning>
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
